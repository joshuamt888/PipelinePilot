require('dotenv').config();

// 🔒 SECURITY: Environment validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// 🔒 SECURITY: Security middleware
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔒 SECURITY: HTTP security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
    },
  },
}));

// 🔒 SECURITY: CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:8080'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // Cache preflight for 24 hours
}));

// 🔒 SECURITY: Request size limits and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔒 SECURITY: Rate limiting configurations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin users in development
    return process.env.NODE_ENV === 'development' && 
           req.headers['x-admin-bypass'] === process.env.ADMIN_BYPASS_KEY;
  }
});

const moderateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 minutes
  message: { error: 'Rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 API calls per 15 minutes
  message: { error: 'API rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false
});

// 🔒 SECURITY: Input validation middleware
const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .isLength({ max: 255 })
  .withMessage('Valid email required');

const validatePassword = body('password')
  .isLength({ min: 8, max: 128 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character');

const validateLeadName = body('name')
  .trim()
  .isLength({ min: 1, max: 255 })
  .escape()
  .withMessage('Name is required and must be under 255 characters');

const validateLeadEmail = body('email')
  .optional()
  .isEmail()
  .normalizeEmail()
  .isLength({ max: 255 });

const validateNumericId = param('id')
  .isInt({ min: 1 })
  .withMessage('Valid ID required');

// 🔒 SECURITY: Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`🚫 Validation failed for ${req.method} ${req.path}:`, errors.array());
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array().map(err => err.msg)
    });
  }
  next();
};

// 🔒 SECURITY: Database connection with error handling
const isDevelopment = process.env.NODE_ENV !== 'production';
const tablePrefix = isDevelopment ? 'dev_' : '';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 🔒 SECURITY: Database connection error handling
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
});

// 🔒 SECURITY: Admin emails from environment
const ADMIN_EMAILS = process.env.ADMIN_EMAILS 
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  : [];

if (ADMIN_EMAILS.length === 0) {
  console.warn('⚠️  No admin emails configured. Set ADMIN_EMAILS environment variable.');
}

// Helper function for table names
function getTableName(baseName) {
  return `${tablePrefix}${baseName}`;
}

// 🔒 SECURITY: Enhanced database initialization with better error handling
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log(`🔧 Initializing ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} database...`);
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('users')} (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) DEFAULT 'client_v1',
        is_admin BOOLEAN DEFAULT FALSE,
        monthly_lead_limit INTEGER DEFAULT 1000,
        current_month_leads INTEGER DEFAULT 0,
        last_reset_date DATE DEFAULT CURRENT_DATE,
        goals JSONB DEFAULT '{"daily": 10, "weekly": 50, "monthly": 200}',
        settings JSONB DEFAULT '{"darkMode": false, "notifications": true}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP
      )
    `);

    // Enhanced leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('leads')} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${getTableName('users')}(id) ON DELETE CASCADE,
        user_type VARCHAR(50),
        
        -- Basic Lead Info
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        platform VARCHAR(100),
        status VARCHAR(100) DEFAULT 'New lead',
        type VARCHAR(20) DEFAULT 'cold',
        notes TEXT,
        quality_score INTEGER DEFAULT 5 CHECK (quality_score >= 1 AND quality_score <= 10),
        
        -- Extended pipeline fields (keeping your existing schema)
        pain_points TEXT,
        budget_range VARCHAR(50),
        decision_maker BOOLEAN,
        urgency_level VARCHAR(50),
        contact_attempts INTEGER DEFAULT 0,
        best_contact_time VARCHAR(50),
        response_rate VARCHAR(50),
        referral_source VARCHAR(255),
        social_media_profile TEXT,
        personal_notes TEXT,
        competitors_mentioned TEXT,
        company_size VARCHAR(50),
        current_solution TEXT,
        timeline VARCHAR(100),
        obstacles TEXT,
        lead_source_detail TEXT,
        conversion_probability INTEGER CHECK (conversion_probability >= 0 AND conversion_probability <= 100),
        next_milestone VARCHAR(255),
        temperature VARCHAR(20),
        potential_value INTEGER CHECK (potential_value >= 0),
        follow_up_date DATE,
        last_contact_date DATE,
        preferred_contact VARCHAR(50),
        meeting_location TEXT,
        pipeline_stage VARCHAR(100),
        sales_stage VARCHAR(100),
        quote_amount DECIMAL(10,2) CHECK (quote_amount >= 0),
        close_date DATE,
        lost_reason VARCHAR(255),
        probability_percentage INTEGER CHECK (probability_percentage >= 0 AND probability_percentage <= 100),
        campaign_source VARCHAR(255),
        utm_source VARCHAR(255),
        first_touch_date DATE,
        lead_magnet VARCHAR(255),
        engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0),
        last_activity_type VARCHAR(100),
        total_interactions INTEGER DEFAULT 0 CHECK (total_interactions >= 0),
        website_visits INTEGER DEFAULT 0 CHECK (website_visits >= 0),
        reminder_frequency VARCHAR(50),
        auto_follow_up BOOLEAN DEFAULT false,
        snooze_until DATE,
        priority_level VARCHAR(20),
        tags TEXT,
        lead_category VARCHAR(100),
        vertical VARCHAR(100),
        deal_size_category VARCHAR(50),
        automation_sequence VARCHAR(255),
        email_sequence_step INTEGER DEFAULT 0 CHECK (email_sequence_step >= 0),
        opt_in_status BOOLEAN DEFAULT true,
        unsubscribed BOOLEAN DEFAULT false,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create counters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('counters')} (
        name VARCHAR(50) PRIMARY KEY,
        value INTEGER DEFAULT 1
      )
    `);

    // 🔒 SECURITY: Create audit log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('audit_logs')} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${getTableName('users')}(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100),
        record_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Initialize counters
    await client.query(`
      INSERT INTO ${getTableName('counters')} (name, value) 
      VALUES ('user_id', 1), ('lead_id', 1)
      ON CONFLICT (name) DO NOTHING
    `);

    console.log(`✅ Database initialized with enhanced security features`);
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// 🔒 SECURITY: Enhanced database helper functions with better error handling
async function findUserByEmail(email) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM ${getTableName('users')} WHERE email = $1`,
      [email.toLowerCase()]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in findUserByEmail:', error.message);
    throw new Error('Database query failed');
  } finally {
    client.release();
  }
}

async function findUserById(id) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM ${getTableName('users')} WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in findUserById:', error.message);
    throw new Error('Database query failed');
  } finally {
    client.release();
  }
}

// 🔒 SECURITY: Audit logging function
async function logUserAction(userId, action, tableName = null, recordId = null, oldValues = null, newValues = null, req = null) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO ${getTableName('audit_logs')} 
       (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req ? req.ip : null,
        req ? req.get('User-Agent') : null
      ]
    );
  } catch (error) {
    console.error('Audit logging failed:', error.message);
    // Don't throw - audit logging failure shouldn't break the main operation
  } finally {
    client.release();
  }
}

// Enhanced createUser function
async function createUser(userData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO ${getTableName('users')} 
       (email, password, user_type, is_admin, monthly_lead_limit, current_month_leads, goals, settings) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userData.email.toLowerCase(),
        userData.password,
        userData.userType,
        userData.isAdmin,
        userData.monthlyLeadLimit,
        userData.currentMonthLeads,
        JSON.stringify(userData.goals),
        JSON.stringify(userData.settings)
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createUser:', error.message);
    throw new Error('Failed to create user');
  } finally {
    client.release();
  }
}

async function getUserLeads(userId, isAdmin = false, viewAll = false) {
  const client = await pool.connect();
  try {
    let query, params;
    
    if (isAdmin && viewAll) {
      query = `SELECT * FROM ${getTableName('leads')} ORDER BY created_at DESC`;
      params = [];
    } else {
      query = `SELECT * FROM ${getTableName('leads')} WHERE user_id = $1 ORDER BY created_at DESC`;
      params = [userId];
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Database error in getUserLeads:', error.message);
    throw new Error('Failed to fetch leads');
  } finally {
    client.release();
  }
}

// Enhanced createLead function with better error handling
async function createLead(leadData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO ${getTableName('leads')} 
       (user_id, user_type, name, email, phone, company, platform, status, type, notes, quality_score,
        pain_points, budget_range, decision_maker, urgency_level, contact_attempts, best_contact_time,
        response_rate, referral_source, social_media_profile, personal_notes, competitors_mentioned,
        company_size, current_solution, timeline, obstacles, lead_source_detail, conversion_probability,
        next_milestone, temperature, potential_value, follow_up_date, last_contact_date, preferred_contact,
        meeting_location, pipeline_stage, sales_stage, quote_amount, close_date, lost_reason,
        probability_percentage, campaign_source, utm_source, first_touch_date, lead_magnet,
        engagement_score, last_activity_type, total_interactions, website_visits, reminder_frequency,
        auto_follow_up, snooze_until, priority_level, tags, lead_category, vertical, deal_size_category,
        automation_sequence, email_sequence_step, opt_in_status, unsubscribed) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
               $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
               $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56,
               $57, $58, $59, $60) RETURNING *`,
      [
        leadData.userId, leadData.userType, leadData.name, leadData.email?.toLowerCase(), leadData.phone,
        leadData.company, leadData.platform, leadData.status, leadData.type, leadData.notes,
        leadData.qualityScore, leadData.painPoints, leadData.budgetRange, leadData.decisionMaker,
        leadData.urgencyLevel, leadData.contactAttempts || 0, leadData.bestContactTime,
        leadData.responseRate, leadData.referralSource, leadData.socialMediaProfile,
        leadData.personalNotes, leadData.competitorsMentioned, leadData.companySize,
        leadData.currentSolution, leadData.timeline, leadData.obstacles, leadData.leadSourceDetail,
        leadData.conversionProbability, leadData.nextMilestone, leadData.temperature,
        leadData.potentialValue, leadData.followUpDate, leadData.lastContactDate,
        leadData.preferredContact, leadData.meetingLocation, leadData.pipelineStage,
        leadData.salesStage, leadData.quoteAmount, leadData.closeDate, leadData.lostReason,
        leadData.probabilityPercentage, leadData.campaignSource, leadData.utmSource,
        leadData.firstTouchDate, leadData.leadMagnet, leadData.engagementScore || 0,
        leadData.lastActivityType, leadData.totalInteractions || 0, leadData.websiteVisits || 0,
        leadData.reminderFrequency, leadData.autoFollowUp || false, leadData.snoozeUntil,
        leadData.priorityLevel, leadData.tags, leadData.leadCategory, leadData.vertical,
        leadData.dealSizeCategory, leadData.automationSequence, leadData.emailSequenceStep || 0,
        leadData.optInStatus !== false, leadData.unsubscribed || false
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createLead:', error.message);
    throw new Error('Failed to create lead');
  } finally {
    client.release();
  }
}

async function incrementUserLeadCount(userId) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ${getTableName('users')} 
       SET current_month_leads = current_month_leads + 1, updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Database error in incrementUserLeadCount:', error.message);
    throw new Error('Failed to update lead count');
  } finally {
    client.release();
  }
}

async function decrementUserLeadCount(userId) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ${getTableName('users')} 
       SET current_month_leads = GREATEST(current_month_leads - 1, 0), updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Database error in decrementUserLeadCount:', error.message);
    throw new Error('Failed to update lead count');
  } finally {
    client.release();
  }
}

// Body parsing and static files
app.use(express.static(path.join(__dirname, 'public')));

// JSX middleware (keeping your existing setup)
app.get('*.jsx', (req, res, next) => {
  res.type('application/javascript');
  next();
});

// 🔒 SECURITY: Enhanced route protection middleware with account lockout
const protectRoute = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and account isn't locked
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.redirect('/login');
    }
    
    if (user.account_locked_until && new Date() < user.account_locked_until) {
      return res.redirect('/login?locked=true');
    }
    
    req.user = decoded;
    req.user.isAdmin = ADMIN_EMAILS.includes(decoded.email);
    await logUserAction(decoded.userId, 'PAGE_ACCESS', null, null, null, { page: req.path }, req);
    next();
  } catch (err) {
    console.warn(`🚫 Invalid token access attempt from ${req.ip}`);
    return res.redirect('/login');
  }
};

// 🔒 SECURITY: Enhanced API authentication with account lockout
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and account isn't locked
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    if (user.account_locked_until && new Date() < user.account_locked_until) {
      return res.status(423).json({ error: 'Account temporarily locked' });
    }
    
    req.user = decoded;
    req.user.isAdmin = ADMIN_EMAILS.includes(decoded.email);
    next();
  } catch (err) {
    console.warn(`🚫 Invalid API token from ${req.ip}: ${err.message}`);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ROUTES

// 🔒 SECURITY: Apply rate limiting to specific routes
app.use('/api/login', strictLimiter);
app.use('/api/register', strictLimiter);
app.use('/api/create-checkout-session', moderateLimiter);
app.use('/api', apiLimiter);

// Stripe checkout session - with enhanced security
app.post('/api/create-checkout-session', 
  [
    body('plan').isIn(['monthly_pro', 'annual_pro']).withMessage('Invalid plan'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { plan, email } = req.body;
      
      const validPlans = {
        'monthly_pro': {
          priceId: 'price_1RX80sDhSlID87uJjGfEMJB7',
          name: 'V1 Pro Monthly'
        },
        'annual_pro': {
          priceId: 'price_1RX81yDhSlID87uJ6HuVlL2q',
          name: 'V1 Pro Annual'
        }
      };
      
      const planData = validPlans[plan];
      const baseUrl = isDevelopment 
        ? req.headers.origin
        : 'https://steadyleadflow.steadyscaling.com';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: planData.priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        customer_email: email,
        success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/login?cancelled=true`,
        metadata: {
          plan: plan,
          email: email,
          pendingSignup: 'true',
          environment: isDevelopment ? 'development' : 'production',
          created_from_ip: req.ip
        },
        subscription_data: {
          metadata: {
            plan: plan,
            email: email,
            environment: isDevelopment ? 'development' : 'production'
          }
        }
      });
      
      console.log(`💳 Checkout session created for ${email} (${plan}) from ${req.ip}`);
      
      res.json({ 
        sessionId: session.id,
        url: session.url,
        environment: isDevelopment ? 'development' : 'production'
      });
      
    } catch (error) {
      console.error('Stripe checkout error:', error.message);
      res.status(500).json({ 
        error: 'Failed to create checkout session'
      });
    }
  }
);

// Stripe webhook handler (keeping existing logic but with better error handling)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`🚫 Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const email = session.metadata.email || session.customer_email;
        const plan = session.metadata.plan;
        
        console.log(`💰 Payment successful for ${email} - Plan: ${plan}`);
        
        const userData = {
          email: email.toLowerCase(),
          password: await bcrypt.hash('temp_password_reset_required', 12),
          userType: 'client_v1_pro',
          isAdmin: ADMIN_EMAILS.includes(email.toLowerCase()),
          monthlyLeadLimit: 1000,
          currentMonthLeads: 0,
          goals: { daily: 30, weekly: 150, monthly: 1000 },
          settings: {
            darkMode: false,
            notifications: true,
            plan: plan,
            subscriptionTier: 'V1_PRO',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            upgradeDate: new Date().toISOString()
          }
        };

        const existingUser = await findUserByEmail(email);
        if (!existingUser) {
          await createUser(userData);
          console.log(`✅ V1 Pro user created: ${email}`);
        } else {
          const client = await pool.connect();
          try {
            await client.query(
              `UPDATE ${getTableName('users')} 
               SET user_type = $1, monthly_lead_limit = $2, settings = $3, goals = $4, updated_at = NOW()
               WHERE email = $5`,
              [
                'client_v1_pro', 
                1000, 
                JSON.stringify(userData.settings),
                JSON.stringify(userData.goals),
                email.toLowerCase()
              ]
            );
            console.log(`✅ User upgraded to V1 Pro: ${email}`);
          } finally {
            client.release();
          }
        }
        break;
        
      case 'customer.subscription.updated':
        console.log('Subscription updated:', event.data.object.id);
        break;
        
      case 'customer.subscription.deleted':
        const cancelledSubscription = event.data.object;
        const customerEmail = cancelledSubscription.metadata.email;
        if (customerEmail) {
          const client = await pool.connect();
          try {
            await client.query(
              `UPDATE ${getTableName('users')} 
               SET user_type = $1, monthly_lead_limit = $2, settings = settings || $3, updated_at = NOW()
               WHERE email = $4`,
              [
                'client_free', 
                50, 
                JSON.stringify({ subscriptionTier: 'FREE', downgradedDate: new Date().toISOString() }),
                customerEmail.toLowerCase()
              ]
            );
            console.log(`⬇️ User downgraded to free: ${customerEmail}`);
          } finally {
            client.release();
          }
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
    
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Get Stripe config
app.get('/api/stripe-config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// 🔒 SECURITY: Enhanced register endpoint with comprehensive validation
app.post('/api/register', 
  [
    validateEmail,
    validatePassword,
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        await logUserAction(null, 'FAILED_REGISTRATION_DUPLICATE', null, null, null, { email, ip: req.ip }, req);
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        userType: isAdmin ? 'admin' : 'client_v1',
        isAdmin,
        monthlyLeadLimit: isAdmin ? null : 100,
        currentMonthLeads: 0,
        goals: {
          daily: isAdmin ? 999999 : 10,
          weekly: isAdmin ? 999999 : 50,
          monthly: isAdmin ? 999999 : 100
        },
        settings: {
          darkMode: false,
          notifications: true
        }
      };

      const newUser = await createUser(userData);
      await logUserAction(newUser.id, 'USER_REGISTERED', 'users', newUser.id, null, { email: newUser.email }, req);

      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email,
          userType: newUser.user_type
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`✅ New user registered: ${email} ${isAdmin ? '(ADMIN)' : ''}`);

      res.status(201).json({
        message: isAdmin ? 'Admin account created! 👑' : 'Account created!',
        token,
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          isAdmin,
          userType: newUser.user_type,
          monthlyLeadLimit: newUser.monthly_lead_limit,
          currentMonthLeads: newUser.current_month_leads
        }
      });
    } catch (error) {
      console.error('Register error:', error.message);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// 🔒 SECURITY: Enhanced login endpoint with account lockout
app.post('/api/login', 
  [
    validateEmail,
    body('password').notEmpty().withMessage('Password required'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await findUserByEmail(email);
      if (!user) {
        await logUserAction(null, 'FAILED_LOGIN_NO_USER', null, null, null, { email, ip: req.ip }, req);
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      // Check if account is locked
      if (user.account_locked_until && new Date() < user.account_locked_until) {
        const lockTimeRemaining = Math.ceil((user.account_locked_until - new Date()) / (1000 * 60));
        await logUserAction(user.id, 'FAILED_LOGIN_LOCKED', null, null, null, { email, ip: req.ip }, req);
        return res.status(423).json({ 
          error: `Account locked. Try again in ${lockTimeRemaining} minutes.` 
        });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Increment failed login attempts
        const client = await pool.connect();
        try {
          const failedAttempts = (user.failed_login_attempts || 0) + 1;
          let lockUntil = null;
          
          if (failedAttempts >= 5) {
            lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            console.warn(`🚫 Account locked for ${email} after ${failedAttempts} failed attempts`);
          }
          
          await client.query(
            `UPDATE ${getTableName('users')} 
             SET failed_login_attempts = $1, account_locked_until = $2, updated_at = NOW()
             WHERE id = $3`,
            [failedAttempts, lockUntil, user.id]
          );
          
          await logUserAction(user.id, 'FAILED_LOGIN_WRONG_PASSWORD', null, null, null, { 
            email, ip: req.ip, attempts: failedAttempts 
          }, req);
          
          return res.status(400).json({ 
            error: lockUntil ? 'Too many failed attempts. Account locked for 15 minutes.' : 'Invalid credentials'
          });
        } finally {
          client.release();
        }
      }
      
      // Successful login - reset failed attempts
      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE ${getTableName('users')} 
           SET failed_login_attempts = 0, account_locked_until = NULL, last_login = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [user.id]
        );
      } finally {
        client.release();
      }
      
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          userType: user.user_type
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const subscriptionTier = user.settings?.subscriptionTier || 
        (user.user_type === 'client_v1_pro' ? 'V1_PRO' : 
         user.user_type === 'admin' ? 'ADMIN' : 'FREE');
      
      await logUserAction(user.id, 'USER_LOGIN', null, null, null, { email, ip: req.ip }, req);
      
      console.log(`✅ User login: ${email} from ${req.ip}`);
      
      res.json({
        message: user.is_admin ? 'Welcome back, Admin! 👑' : 
                 subscriptionTier === 'V1_PRO' ? 'Welcome back, V1 Pro! 🚀' : 'Welcome back!',
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          isAdmin: user.is_admin,
          userType: user.user_type,
          subscriptionTier,
          monthlyLeadLimit: user.monthly_lead_limit,
          currentMonthLeads: user.current_month_leads,
          goals: user.goals,
          settings: user.settings
        }
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// 🔒 SECURITY: Enhanced get leads endpoint
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    await logUserAction(req.user.userId, 'VIEW_LEADS', 'leads', null, null, { viewAll: req.query.viewAll }, req);
    
    const userLeads = await getUserLeads(req.user.userId, req.user.isAdmin, req.query.viewAll === 'true');
    
    const categorizedLeads = {
      cold: userLeads.filter(lead => lead.type === 'cold'),
      warm: userLeads.filter(lead => lead.type === 'warm'),
      crm: userLeads.filter(lead => lead.type === 'crm'),
      all: userLeads
    };
    
    res.json(categorizedLeads);
  } catch (error) {
    console.error('Get leads error:', error.message);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// 🔒 SECURITY: Enhanced create lead endpoint with comprehensive validation
app.post('/api/leads', 
  authenticateToken,
  [
    validateLeadName,
    validateLeadEmail,
    body('phone').optional().isLength({ max: 50 }).matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
    body('company').optional().isLength({ max: 255 }).escape(),
    body('platform').optional().isLength({ max: 100 }).escape(),
    body('type').optional().isIn(['cold', 'warm', 'crm']).withMessage('Invalid lead type'),
    body('qualityScore').optional().isInt({ min: 1, max: 10 }).withMessage('Quality score must be 1-10'),
    body('potentialValue').optional().isInt({ min: 0 }).withMessage('Potential value must be positive'),
    body('conversionProbability').optional().isInt({ min: 0, max: 100 }).withMessage('Conversion probability must be 0-100'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      // Check lead limits for non-admin users
      if (!req.user.isAdmin) {
        const user = await findUserById(req.user.userId);
        if (user && user.current_month_leads >= user.monthly_lead_limit) {
          await logUserAction(req.user.userId, 'LEAD_LIMIT_EXCEEDED', null, null, null, { 
            currentCount: user.current_month_leads, 
            limit: user.monthly_lead_limit 
          }, req);
          return res.status(403).json({ 
            error: `Monthly lead limit reached (${user.monthly_lead_limit}). Upgrade to add more!`,
            limitReached: true,
            currentCount: user.current_month_leads,
            limit: user.monthly_lead_limit
          });
        }
      }

      const { 
        name, email, phone, company, platform, status = 'New lead', 
        type = 'cold', notes, qualityScore = 5 
      } = req.body;

      // Extended fields for pipeline
      const {
        painPoints, budgetRange, decisionMaker, urgencyLevel, contactAttempts,
        bestContactTime, responseRate, referralSource, socialMediaProfile,
        personalNotes, competitorsMentioned, companySize, currentSolution,
        timeline, obstacles, leadSourceDetail, conversionProbability,
        nextMilestone, temperature, potentialValue, followUpDate,
        lastContactDate, preferredContact, meetingLocation, pipelineStage,
        salesStage, quoteAmount, closeDate, lostReason, probabilityPercentage,
        campaignSource, utmSource, firstTouchDate, leadMagnet, engagementScore,
        lastActivityType, totalInteractions, websiteVisits, reminderFrequency,
        autoFollowUp, snoozeUntil, priorityLevel, tags, leadCategory,
        vertical, dealSizeCategory, automationSequence, emailSequenceStep,
        optInStatus, unsubscribed
      } = req.body;

      const leadData = {
        userId: req.user.userId,
        userType: req.user.userType,
        name, email, phone, company, platform, status, type, notes, qualityScore,
        painPoints, budgetRange, decisionMaker, urgencyLevel, contactAttempts,
        bestContactTime, responseRate, referralSource, socialMediaProfile,
        personalNotes, competitorsMentioned, companySize, currentSolution,
        timeline, obstacles, leadSourceDetail, conversionProbability,
        nextMilestone, temperature, potentialValue, followUpDate,
        lastContactDate, preferredContact, meetingLocation, pipelineStage,
        salesStage, quoteAmount, closeDate, lostReason, probabilityPercentage,
        campaignSource, utmSource, firstTouchDate, leadMagnet, engagementScore,
        lastActivityType, totalInteractions, websiteVisits, reminderFrequency,
        autoFollowUp, snoozeUntil, priorityLevel, tags, leadCategory,
        vertical, dealSizeCategory, automationSequence, emailSequenceStep,
        optInStatus, unsubscribed
      };

      const newLead = await createLead(leadData);
      
      // Increment lead count for non-admin users
      if (!req.user.isAdmin) {
        await incrementUserLeadCount(req.user.userId);
      }
      
      await logUserAction(req.user.userId, 'LEAD_CREATED', 'leads', newLead.id, null, { 
        leadName: name, leadType: type 
      }, req);
      
      console.log(`✅ Lead created: ${name} by user ${req.user.userId}`);
      res.status(201).json(newLead);
    } catch (error) {
      console.error('Create lead error:', error.message);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }
);

// 🔒 SECURITY: Enhanced update lead endpoint
app.put('/api/leads/:id', 
  authenticateToken,
  [
    validateNumericId,
    validateLeadName.optional(),
    validateLeadEmail.optional(),
    body('phone').optional().isLength({ max: 50 }).matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
    body('qualityScore').optional().isInt({ min: 1, max: 10 }).withMessage('Quality score must be 1-10'),
    body('potentialValue').optional().isInt({ min: 0 }).withMessage('Potential value must be positive'),
    body('conversionProbability').optional().isInt({ min: 0, max: 100 }).withMessage('Conversion probability must be 0-100'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const client = await pool.connect();
      
      try {
        // Get the current lead
        const leadResult = await client.query(
          `SELECT * FROM ${getTableName('leads')} WHERE id = $1`,
          [leadId]
        );
        
        if (leadResult.rows.length === 0) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        
        const currentLead = leadResult.rows[0];
        
        // Check permissions
        if (!req.user.isAdmin && currentLead.user_id !== req.user.userId) {
          await logUserAction(req.user.userId, 'UNAUTHORIZED_LEAD_UPDATE', 'leads', leadId, null, null, req);
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        const allowedFields = [
          'name', 'email', 'phone', 'company', 'platform', 'status', 'type', 'notes', 'quality_score',
          'pain_points', 'budget_range', 'decision_maker', 'urgency_level', 'contact_attempts',
          'best_contact_time', 'response_rate', 'referral_source', 'social_media_profile',
          'personal_notes', 'competitors_mentioned', 'company_size', 'current_solution',
          'timeline', 'obstacles', 'lead_source_detail', 'conversion_probability',
          'next_milestone', 'temperature', 'potential_value', 'follow_up_date',
          'last_contact_date', 'preferred_contact', 'meeting_location', 'pipeline_stage',
          'sales_stage', 'quote_amount', 'close_date', 'lost_reason', 'probability_percentage',
          'campaign_source', 'utm_source', 'first_touch_date', 'lead_magnet', 'engagement_score',
          'last_activity_type', 'total_interactions', 'website_visits', 'reminder_frequency',
          'auto_follow_up', 'snooze_until', 'priority_level', 'tags', 'lead_category',
          'vertical', 'deal_size_category', 'automation_sequence', 'email_sequence_step',
          'opt_in_status', 'unsubscribed'
        ];

        for (const field of allowedFields) {
          if (req.body.hasOwnProperty(field)) {
            updateFields.push(`${field} = ${paramCount}`);
            let value = req.body[field];
            
            // Normalize email if provided
            if (field === 'email' && value) {
              value = value.toLowerCase();
            }
            
            updateValues.push(value);
            paramCount++;
          }
        }

        if (updateFields.length === 0) {
          return res.status(400).json({ error: 'No valid fields to update' });
        }

        updateFields.push('updated_at = NOW()');
        updateValues.push(leadId);

        const updateQuery = `
          UPDATE ${getTableName('leads')} 
          SET ${updateFields.join(', ')}
          WHERE id = ${paramCount}
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, updateValues);
        const updatedLead = updateResult.rows[0];
        
        await logUserAction(req.user.userId, 'LEAD_UPDATED', 'leads', leadId, currentLead, updatedLead, req);
        
        console.log(`✅ Lead updated: ${leadId} by user ${req.user.userId}`);
        res.json(updatedLead);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Update lead error:', error.message);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }
);

// 🔒 SECURITY: Enhanced delete lead endpoint
app.delete('/api/leads/:id', 
  authenticateToken,
  [validateNumericId, handleValidationErrors],
  async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const client = await pool.connect();
      
      try {
        // Get the lead first
        const leadResult = await client.query(
          `SELECT * FROM ${getTableName('leads')} WHERE id = $1`,
          [leadId]
        );
        
        if (leadResult.rows.length === 0) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        
        const lead = leadResult.rows[0];
        
        // Check permissions
        if (!req.user.isAdmin && lead.user_id !== req.user.userId) {
          await logUserAction(req.user.userId, 'UNAUTHORIZED_LEAD_DELETE', 'leads', leadId, null, null, req);
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete lead
        await client.query(
          `DELETE FROM ${getTableName('leads')} WHERE id = $1`,
          [leadId]
        );

        // Decrement lead count for non-admin users
        if (!req.user.isAdmin && lead.user_type !== 'admin') {
          await decrementUserLeadCount(lead.user_id);
        }

        await logUserAction(req.user.userId, 'LEAD_DELETED', 'leads', leadId, lead, null, req);
        
        console.log(`✅ Lead deleted: ${leadId} by user ${req.user.userId}`);
        res.json({ message: 'Lead deleted successfully' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Delete lead error:', error.message);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  }
);

// Enhanced statistics endpoint
app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    const userLeads = await getUserLeads(req.user.userId, req.user.isAdmin, req.query.viewAll === 'true');
    
    const totalLeads = userLeads.length;
    const coldLeads = userLeads.filter(l => l.type === 'cold').length;
    const warmLeads = userLeads.filter(l => l.type === 'warm').length;
    const crmLeads = userLeads.filter(l => l.type === 'crm').length;
    
    const platformStats = {};
    userLeads.forEach(lead => {
      if (lead.platform) {
        platformStats[lead.platform] = (platformStats[lead.platform] || 0) + 1;
      }
    });
    
    const statusStats = {};
    userLeads.forEach(lead => {
      statusStats[lead.status] = (statusStats[lead.status] || 0) + 1;
    });

    const pipelineStats = {};
    userLeads.forEach(lead => {
      if (lead.pipeline_stage) {
        pipelineStats[lead.pipeline_stage] = (pipelineStats[lead.pipeline_stage] || 0) + 1;
      }
    });

    const temperatureStats = {};
    userLeads.forEach(lead => {
      if (lead.temperature) {
        temperatureStats[lead.temperature] = (temperatureStats[lead.temperature] || 0) + 1;
      }
    });
    
    const avgQualityScore = userLeads.length > 0 
      ? userLeads.reduce((sum, lead) => sum + (lead.quality_score || 5), 0) / userLeads.length 
      : 0;

    const totalPotentialValue = userLeads.reduce((sum, lead) => sum + (lead.potential_value || 0), 0);
    
    res.json({
      totalLeads,
      coldLeads,
      warmLeads,
      crmLeads,
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      totalPotentialValue,
      platformStats,
      statusStats,
      pipelineStats,
      temperatureStats,
      isAdminView: req.user.isAdmin && req.query.viewAll === 'true'
    });
  } catch (error) {
    console.error('Get statistics error:', error.message);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// 🔒 SECURITY: Enhanced admin stats with rate limiting
app.get('/api/admin/stats', authenticateToken, moderateLimiter, async (req, res) => {
  if (!req.user.isAdmin) {
    await logUserAction(req.user.userId, 'UNAUTHORIZED_ADMIN_ACCESS', null, null, null, null, req);
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const client = await pool.connect();
    
    try {
      const usersResult = await client.query(`SELECT COUNT(*), SUM(CASE WHEN is_admin THEN 1 ELSE 0 END) as admin_count FROM ${getTableName('users')}`);
      const leadsResult = await client.query(`SELECT COUNT(*) FROM ${getTableName('leads')}`);
      const recentUsersResult = await client.query(
        `SELECT id, email, user_type, created_at FROM ${getTableName('users')} ORDER BY created_at DESC LIMIT 10`
      );
      
      const totalUsers = parseInt(usersResult.rows[0].count);
      const adminUsers = parseInt(usersResult.rows[0].admin_count);
      const clientUsers = totalUsers - adminUsers;
      const totalLeads = parseInt(leadsResult.rows[0].count);
      
      const monthlyRevenue = clientUsers * 6.99;
      
      await logUserAction(req.user.userId, 'ADMIN_STATS_VIEWED', null, null, null, null, req);
      
      res.json({
        users: {
          total: totalUsers,
          admins: adminUsers,
          clients: clientUsers
        },
        leads: {
          total: totalLeads
        },
        revenue: {
          monthly: monthlyRevenue,
          annual: monthlyRevenue * 12
        },
        recentUsers: recentUsersResult.rows
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Enhanced user settings endpoints
app.get('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      userType: user.user_type,
      isAdmin: user.is_admin,
      goals: user.goals,
      settings: user.settings,
      monthlyLeadLimit: user.monthly_lead_limit,
      currentMonthLeads: user.current_month_leads,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get user settings error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

app.put('/api/user/settings', 
  authenticateToken,
  [
    body('goals').optional().isObject().withMessage('Goals must be an object'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { goals, settings } = req.body;
      const client = await pool.connect();
      
      try {
        const user = await findUserById(req.user.userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const updatedGoals = goals ? { ...user.goals, ...goals } : user.goals;
        const updatedSettings = settings ? { ...user.settings, ...settings } : user.settings;
        
        const result = await client.query(
          `UPDATE ${getTableName('users')} 
           SET goals = $1, settings = $2, updated_at = NOW()
           WHERE id = $3 
           RETURNING *`,
          [JSON.stringify(updatedGoals), JSON.stringify(updatedSettings), req.user.userId]
        );
        
        await logUserAction(req.user.userId, 'SETTINGS_UPDATED', 'users', req.user.userId, user, result.rows[0], req);
        
        res.json({ message: 'Settings updated successfully', user: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Update user settings error:', error.message);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

// 🔒 SECURITY: Enhanced health check with security info
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const usersResult = await client.query(`SELECT COUNT(*) FROM ${getTableName('users')}`);
      const leadsResult = await client.query(`SELECT COUNT(*) FROM ${getTableName('leads')}`);
      
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: isDevelopment ? 'development' : 'production',
        security: {
          rateLimiting: 'enabled',
          inputValidation: 'enabled',
          auditLogging: 'enabled',
          accountLockout: 'enabled',
          adminEmailsConfigured: ADMIN_EMAILS.length > 0
        },
        features: [
          'postgresql-storage', 
          'authentication', 
          'lead-management', 
          'admin-mode', 
          'pipeline-tracking', 
          'stripe-billing',
          'audit-logging',
          'rate-limiting',
          'input-validation'
        ],
        database: {
          connected: true,
          tablePrefix: tablePrefix || 'none',
          users: parseInt(usersResult.rows[0].count),
          leads: parseInt(leadsResult.rows[0].count)
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// 🔒 SECURITY: Audit log endpoint for admins
app.get('/api/admin/audit-logs', 
  authenticateToken, 
  moderateLimiter,
  [
    body('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
    body('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
    handleValidationErrors
  ],
  async (req, res) => {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT al.*, u.email as user_email 
           FROM ${getTableName('audit_logs')} al
           LEFT JOIN ${getTableName('users')} u ON al.user_id = u.id
           ORDER BY al.created_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        
        res.json({
          logs: result.rows,
          pagination: {
            limit,
            offset,
            hasMore: result.rows.length === limit
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Audit logs error:', error.message);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

// 🔒 SECURITY: Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error.message);
  
  // Don't expose internal errors in production
  const message = isDevelopment ? error.message : 'Internal server error';
  
  res.status(500).json({ 
    error: message,
    timestamp: new Date().toISOString()
  });
});

// 🔒 SECURITY: Protected routes with enhanced middleware
const protectedRoutes = ['/dashboard', '/add-lead', '/pipeline', '/schedule', '/settings', '/admin'];

protectedRoutes.forEach(route => {
  app.get(route, protectRoute, (req, res) => {
    if (route === '/admin' && !req.user.isAdmin) {
      console.warn(`🚫 Non-admin user ${req.user.email} attempted to access admin panel from ${req.ip}`);
      return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });
});

// HTML Page Routes (Public routes) - These need to be .html files that load React
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
});

app.get('/login/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'forgot-password.html'));
});

app.get('/login/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'reset-password.html'));
});

app.get('/login/email-confirmation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'email-confirmation.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

app.get('/features', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'features.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/account', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'account.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🔒 SECURITY: Enhanced 404 handler
app.get('*', (req, res) => {
  console.warn(`🚫 404 request from ${req.ip}: ${req.method} ${req.originalUrl}`);
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SteadyLeadFlow server running on port ${PORT}`);
      console.log(`🔧 Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
      console.log(`🗄️  Database tables: ${tablePrefix ? tablePrefix + '*' : 'production tables'}`);
      console.log(`👑 Admin emails configured: ${ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS.length : 'NONE - SET ADMIN_EMAILS!'}`);
      console.log(`🔒 Security features enabled:`);
      console.log(`   ✅ Rate limiting (strict: 5/15min, moderate: 100/15min, API: 1000/15min)`);
      console.log(`   ✅ Input validation & sanitization`);
      console.log(`   ✅ Account lockout (5 attempts = 15min lock)`);
      console.log(`   ✅ Audit logging`);
      console.log(`   ✅ SQL injection protection`);
      console.log(`   ✅ XSS protection`);
      console.log(`   ✅ CORS configuration`);
      console.log(`   ✅ Security headers (helmet)`);
      console.log(`   ✅ Request size limits`);
      console.log(`   ✅ Environment variable validation`);
      console.log(`🔒 Protected routes: ${protectedRoutes.join(', ')}`);
      console.log(`🚀 Pipeline features: 40+ tracking fields enabled!`);
      console.log(`💳 Stripe billing: ENABLED with V1 Pro upgrades!`);
      console.log(`✨ Ready for production with enterprise-grade security!`);
      
      if (ADMIN_EMAILS.length === 0) {
        console.warn(`⚠️  WARNING: No admin emails configured! Set ADMIN_EMAILS environment variable.`);
      }
      
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
        console.error(`❌ CRITICAL: JWT_SECRET not set or using default! This is a security risk!`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();