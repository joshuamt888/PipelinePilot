require('dotenv').config();
const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client with SERVICE ROLE (for webhooks)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Pricing configuration
const PRICING_PLANS = {
  professional_monthly: {
    priceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    userType: 'professional',
    leadLimit: 5000
  },
  professional_yearly: {
    priceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
    userType: 'professional',
    leadLimit: 5000
  }
};

// =====================================================
// STRIPE WEBHOOK - MUST COME BEFORE express.json()
// =====================================================
app.post('/api/stripe-webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log('Webhook received:', event.type);

      // Handle successful checkout
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_email;
        const plan = session.metadata.plan;
        const planConfig = PRICING_PLANS[plan];

        if (planConfig) {
          // Update user tier in Supabase
          const { error } = await supabase
            .from('users')
            .update({
              user_type: planConfig.userType,
              current_lead_limit: planConfig.leadLimit,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
              subscription_status: 'active'
            })
            .eq('email', email);

          if (error) {
            console.error('Webhook update error:', error);
          } else {
            console.log(`User upgraded: ${email} -> ${planConfig.userType}`);
          }
        }
      }

      // Handle subscription cancellation
      if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;

        // Downgrade to free tier
        const { error } = await supabase
          .from('users')
          .update({
            user_type: 'free',
            current_lead_limit: 50,
            subscription_status: 'canceled'
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Downgrade error:', error);
        } else {
          console.log('User downgraded to free');
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Webhook error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// Regular middleware (AFTER webhook)
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// STRIPE ENDPOINTS
// =====================================================

app.get('/api/stripe-config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

app.get('/api/pricing-plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'professional_monthly',
        name: 'Professional Monthly',
        price: 29,
        leadLimit: 5000,
        features: ['5,000 leads', 'Advanced analytics', 'Email tracking', 'Goal setting']
      },
      {
        id: 'professional_yearly',
        name: 'Professional Yearly',
        price: 290,
        leadLimit: 5000,
        features: ['5,000 leads', 'Advanced analytics', 'Email tracking', 'Goal setting', 'Save 20%']
      }
    ]
  });
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { plan, email } = req.body;
    const planConfig = PRICING_PLANS[plan];

    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: planConfig.priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?upgrade=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      customer_email: email,
      metadata: { plan, email }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// STATIC FILE SERVING
// =====================================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'tiers', 'free', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Page not found' });
    }
  });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Supabase connected');
  console.log('Stripe webhooks ready');
  console.log('Auth handled by Supabase');
});