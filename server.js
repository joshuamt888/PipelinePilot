require('dotenv').config();

// 🔒 Environment validation
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

// Basic security middleware
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔒 Basic CORS & Security
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// 🔒 Rate limiting (simplified but effective)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Login/register attempts
  message: { error: 'Too many attempts, please try again later' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // API calls
  message: { error: 'API rate limit exceeded' }
});

// 🔒 Input validation (essential fields only)
const validateEmail = body('email').isEmail().normalizeEmail().withMessage('Valid email required');
const validatePassword = body('password')
  .isLength({ min: 8, max: 128 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must be 8+ chars with uppercase, lowercase, and number');

const validateLeadName = body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required');
const validateNumericId = param('id').isInt({ min: 1 }).withMessage('Valid ID required');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array().map(err => err.msg)
    });
  }
  next();
};

// 🗄️ Database setup
const isDevelopment = process.env.NODE_ENV !== 'production';
const tablePrefix = isDevelopment ? 'dev_' : '';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('❌ Database error:', err.message);
});

// 👑 Admin emails
const ADMIN_EMAILS = process.env.ADMIN_EMAILS 
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim())
  : [];

function getTableName(baseName) {
  return `${tablePrefix}${baseName}`;
}

// 🔧 Database initialization (simplified schema)
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log(`🔧 Initializing ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} database...`);
    
    // Users table (simplified)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('users')} (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) DEFAULT 'client_v1',
        is_admin BOOLEAN DEFAULT FALSE,
        monthly_lead_limit INTEGER DEFAULT 100,
        current_month_leads INTEGER DEFAULT 0,
        goals JSONB DEFAULT '{"daily": 10, "monthly": 100}',
        settings JSONB DEFAULT '{"darkMode": false, "notifications": true}',
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Leads table (core fields only)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('leads')} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${getTableName('users')}(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        platform VARCHAR(100),
        status VARCHAR(100) DEFAULT 'New lead',
        type VARCHAR(20) DEFAULT 'cold',
        notes TEXT,
        quality_score INTEGER DEFAULT 5 CHECK (quality_score >= 1 AND quality_score <= 10),
        potential_value INTEGER DEFAULT 0,
        follow_up_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log(`✅ Database initialized successfully`);
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// 🔧 Database helper functions
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

async function createLead(leadData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO ${getTableName('leads')} 
       (user_id, name, email, phone, company, platform, status, type, notes, quality_score, potential_value, follow_up_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        leadData.userId,
        leadData.name,
        leadData.email?.toLowerCase(),
        leadData.phone,
        leadData.company,
        leadData.platform,
        leadData.status,
        leadData.type,
        leadData.notes,
        leadData.qualityScore || 5,
        leadData.potentialValue || 0,
        leadData.followUpDate
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
  } finally {
    client.release();
  }
}

// 🔒 Password reset helper functions
function generateResetToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

async function saveResetToken(email, token) {
  const client = await pool.connect();
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
    
    await client.query(
      `UPDATE ${getTableName('users')} 
       SET reset_token = $1, reset_token_expires = $2, updated_at = NOW()
       WHERE email = $3`,
      [token, expiresAt.toISOString(), email.toLowerCase()]
    );
  } finally {
    client.release();
  }
}

async function findUserByResetToken(token) {
  const client = await pool.connect();
  try {
    const now = new Date().toISOString();
    const result = await client.query(
      `SELECT * FROM ${getTableName('users')} 
       WHERE reset_token = $1 AND reset_token_expires > $2`,
      [token, now]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in findUserByResetToken:', error.message);
    throw new Error('Database query failed');
  } finally {
    client.release();
  }
}

async function clearResetToken(userId) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ${getTableName('users')} 
       SET reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  } finally {
    client.release();
  }
}

// 📁 Static files and dashboard routing
app.use(express.static(path.join(__dirname, 'public')));

// 🚀 NEW: Dashboard folder routing
app.get('/dashboard', (req, res) => {
  const { upgrade, session_id } = req.query;
  
  if (upgrade === 'success') {
    console.log('✅ Payment success redirect:', session_id);
  }
  
  res.sendFile(path.join(__dirname, 'public', 'dashboard', 'index.html'));
});

// Handle all dashboard sub-pages
app.get('/dashboard/*', (req, res) => {
  const page = req.params[0];
  const filePath = path.join(__dirname, 'public', 'dashboard', `${page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) {
      // If specific page doesn't exist, serve main dashboard
      res.sendFile(path.join(__dirname, 'public', 'dashboard', 'index.html'));
    }
  });
});

// 🔐 Password reset routes
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'reset-password.html'));
});

// 🔒 Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = decoded;
    req.user.isAdmin = ADMIN_EMAILS.includes(decoded.email);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// 🚀 ROUTES & API ENDPOINTS

// Apply rate limiting
app.use('/api/login', strictLimiter);
app.use('/api/register', strictLimiter);
app.use('/api/start-trial', strictLimiter);
app.use('/api/forgot-password', strictLimiter);
app.use('/api/reset-password', strictLimiter);
app.use('/api', apiLimiter);

// 🔥 Register endpoint
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
      const { email, password, pendingUpgrade, billingCycle } = req.body;
      
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      let userType = 'client_v1';
      let monthlyLeadLimit = 100;
      let goals = { daily: 10, monthly: 100 };
      
      if (pendingUpgrade) {
        userType = 'client_v1_pending_pro';
        goals = { daily: 30, monthly: 1000 };
      }
      
      if (isAdmin) {
        userType = 'admin';
        monthlyLeadLimit = 999999;
        goals = { daily: 999999, monthly: 999999 };
      }
      
      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        userType,
        isAdmin,
        monthlyLeadLimit,
        currentMonthLeads: 0,
        goals,
        settings: {
          darkMode: false,
          notifications: true,
          pendingUpgrade: pendingUpgrade || false,
          billingCycle: billingCycle || null
        }
      };

      const newUser = await createUser(userData);

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, userType: newUser.user_type },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`✅ New user registered: ${email} ${isAdmin ? '(ADMIN)' : pendingUpgrade ? '(PENDING PRO)' : '(FREE)'}`);

      res.status(201).json({
        message: pendingUpgrade ? 'Account created! Complete payment to activate Pro.' : 
                 isAdmin ? 'Admin account created! 👑' : 'Free account created!',
        token,
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          isAdmin,
          userType: newUser.user_type,
          monthlyLeadLimit: newUser.monthly_lead_limit,
          currentMonthLeads: newUser.current_month_leads,
          pendingUpgrade: pendingUpgrade || false
        }
      });
    } catch (error) {
      console.error('Register error:', error.message);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// 🎁 Trial endpoint
app.post('/api/start-trial',
  [
    validateEmail,
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
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
      const { email, name, password } = req.body;
      
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      
      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        userType: 'client_v1_trial',
        isAdmin,
        monthlyLeadLimit: 1000,
        currentMonthLeads: 0,
        goals: { daily: 30, monthly: 1000 },
        settings: {
          darkMode: false,
          notifications: true,
          subscriptionTier: 'V1_TRIAL',
          trialStartDate: new Date().toISOString(),
          trialEndDate: trialEndDate.toISOString(),
          name: name
        }
      };

      const newUser = await createUser(userData);

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, userType: 'client_v1_trial' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`🎁 Trial user created: ${email} - Expires: ${trialEndDate}`);

      res.status(201).json({
        message: 'Free trial started successfully! Welcome to V1 Pro! 🚀',
        token,
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          isAdmin,
          userType: 'client_v1_trial',
          subscriptionTier: 'V1_TRIAL',
          monthlyLeadLimit: 1000,
          currentMonthLeads: 0
        },
        trialEndDate: trialEndDate.toISOString()
      });

    } catch (error) {
      console.error('Start trial error:', error.message);
      res.status(500).json({ error: 'Failed to start trial' });
    }
  }
);

// 🔐 Login endpoint
app.post('/api/login', 
  [validateEmail, body('password').notEmpty().withMessage('Password required'), handleValidationErrors],
  async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, userType: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const subscriptionTier = user.settings?.subscriptionTier || 
        (user.user_type === 'client_v1_pro' ? 'V1_PRO' : 
         user.user_type === 'client_v1_trial' ? 'V1_TRIAL' :
         user.user_type === 'admin' ? 'ADMIN' : 'FREE');
      
      console.log(`✅ User login: ${email}`);
      
      res.json({
        message: user.is_admin ? 'Welcome back, Admin! 👑' : 
                 subscriptionTier === 'V1_PRO' ? 'Welcome back, V1 Pro! 🚀' : 
                 subscriptionTier === 'V1_TRIAL' ? 'Welcome back to your trial! 🎁' : 'Welcome back!',
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

// 🔑 Forgot password endpoint
app.post('/api/forgot-password',
  [validateEmail, handleValidationErrors],
  async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await findUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists - security best practice
        return res.json({ 
          message: 'If that email exists, we sent a password reset link!' 
        });
      }
      
      const resetToken = generateResetToken();
      await saveResetToken(email, resetToken);
      
      console.log(`🔑 Password reset requested for: ${email}`);
      console.log(`🔗 Reset link: ${req.headers.origin}/reset-password?token=${resetToken}`);
      
      // In production, you'd send an email here
      // For now, just log the reset link
      
      res.json({ 
        message: 'If that email exists, we sent a password reset link!',
        // Remove this in production - only for development
        ...(isDevelopment && { resetLink: `${req.headers.origin}/reset-password?token=${resetToken}` })
      });
      
    } catch (error) {
      console.error('Forgot password error:', error.message);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }
);

// 🔄 Reset password endpoint
app.post('/api/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
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
      const { token, password } = req.body;
      
      const user = await findUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ 
          error: 'Invalid or expired reset token' 
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE ${getTableName('users')} 
           SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
           WHERE id = $2`,
          [hashedPassword, user.id]
        );
      } finally {
        client.release();
      }
      
      console.log(`🔓 Password reset successful for: ${user.email}`);
      
      res.json({ 
        message: 'Password reset successful! You can now log in with your new password.' 
      });
      
    } catch (error) {
      console.error('Reset password error:', error.message);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

// 💳 Stripe checkout
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
        'monthly_pro': { priceId: process.env.STRIPE_MONTHLY_PRICE_ID },
        'annual_pro': { priceId: process.env.STRIPE_ANNUAL_PRICE_ID }
      };
      
      const planData = validPlans[plan];
      const baseUrl = isDevelopment 
        ? process.env.DEV_BASE_URL || req.headers.origin
        : 'https://steadyleadflow.steadyscaling.com';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: planData.priceId, quantity: 1 }],
        mode: 'subscription',
        customer_email: email,
        success_url: `${baseUrl}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/login?cancelled=true`,
        metadata: { plan, email, environment: isDevelopment ? 'development' : 'production' }
      });
      
      console.log(`💳 Checkout session created for ${email} (${plan})`);
      res.json({ sessionId: session.id, url: session.url });
      
    } catch (error) {
      console.error('Stripe checkout error:', error.message);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// 🔄 Auto-downgrade trials (with enhanced monitoring)
let lastTrialCheckTime = null;
let dailyDowngradeCount = 0;

async function checkExpiredTrials() {
  const checkTime = new Date().toISOString();
  console.log(`🕐 [${checkTime}] Checking for expired trials...`);
  
  const client = await pool.connect();
  try {
    const now = new Date().toISOString();
    
    const result = await client.query(
      `SELECT id, email, settings FROM ${getTableName('users')} 
       WHERE user_type = 'client_v1_trial' 
       AND settings->>'trialEndDate' < $1`,
      [now]
    );

    for (const user of result.rows) {
      const updatedSettings = {
        ...user.settings,
        subscriptionTier: 'FREE',
        trialEndedDate: now,
        downgradedFromTrial: true
      };

      await client.query(
        `UPDATE ${getTableName('users')} 
         SET user_type = $1, monthly_lead_limit = $2, settings = $3, updated_at = NOW()
         WHERE id = $4`,
        ['client_v1', 100, JSON.stringify(updatedSettings), user.id]
      );

      console.log(`⬇️ Trial expired - downgraded user: ${user.email}`);
      dailyDowngradeCount++;
    }

    if (result.rows.length > 0) {
      console.log(`✅ Processed ${result.rows.length} expired trials`);
    } else {
      console.log(`ℹ️  No expired trials found`);
    }
    
    lastTrialCheckTime = checkTime;

  } catch (error) {
    console.error('Check expired trials error:', error.message);
  } finally {
    client.release();
  }
}

// Run trial check every hour
setInterval(checkExpiredTrials, 60 * 60 * 1000);
setTimeout(checkExpiredTrials, 5000); // Run 5 seconds after startup

// Reset daily counter at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    dailyDowngradeCount = 0;
    console.log('🔄 Daily downgrade counter reset');
  }
}, 60000); // Check every minute

// 🎛️ Admin endpoint to manually check trials
app.post('/api/admin/check-trials', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  console.log(`🔧 Manual trial check triggered by admin: ${req.user.email}`);
  await checkExpiredTrials();
  res.json({ 
    message: 'Trial check completed - check server logs for details',
    lastCheckTime: lastTrialCheckTime,
    dailyDowngrades: dailyDowngradeCount
  });
});

// 📊 Admin trial status dashboard
app.get('/api/admin/trial-status', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const client = await pool.connect();
    try {
      const trialUsers = await client.query(
        `SELECT id, email, settings->>'trialEndDate' as trial_end_date, 
         settings->>'trialStartDate' as trial_start_date, created_at
         FROM ${getTableName('users')} 
         WHERE user_type = 'client_v1_trial' 
         ORDER BY settings->>'trialEndDate' ASC`
      );
      
      res.json({
        activeTrials: trialUsers.rows,
        lastTrialCheckTime,
        dailyDowngradeCount,
        nextCheckIn: 'Next automatic check in less than 1 hour'
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Trial status error:', error.message);
    res.status(500).json({ error: 'Failed to fetch trial status' });
  }
});

// 🧪 Create test trial (expires in 2 minutes)
app.post('/api/admin/create-test-trial', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const testEmail = `test-trial-${Date.now()}@example.com`;
    const testTrialEnd = new Date();
    testTrialEnd.setMinutes(testTrialEnd.getMinutes() + 2); // Expires in 2 minutes
    
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    const userData = {
      email: testEmail,
      password: hashedPassword,
      userType: 'client_v1_trial',
      isAdmin: false,
      monthlyLeadLimit: 1000,
      currentMonthLeads: 0,
      goals: { daily: 30, monthly: 1000 },
      settings: {
        subscriptionTier: 'V1_TRIAL',
        trialStartDate: new Date().toISOString(),
        trialEndDate: testTrialEnd.toISOString(),
        name: 'Test Trial User',
        isTestAccount: true
      }
    };

    const newUser = await createUser(userData);
    
    console.log(`🧪 Test trial user created: ${testEmail} - Expires in 2 minutes`);
    
    res.json({
      message: 'Test trial user created! Will be downgraded in 2 minutes.',
      testUser: {
        id: newUser.id,
        email: testEmail,
        trialEndDate: testTrialEnd.toISOString()
      },
      instructions: 'Wait 2 minutes, then check trial status or run manual trial check to see the downgrade.'
    });
    
  } catch (error) {
    console.error('Create test trial error:', error.message);
    res.status(500).json({ error: 'Failed to create test trial' });
  }
});

// 🔥 Stripe webhook - ENHANCED with payment failure handling
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
        
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
          const client = await pool.connect();
          try {
            await client.query(
              `UPDATE ${getTableName('users')} 
               SET user_type = $1, monthly_lead_limit = $2, settings = $3, updated_at = NOW()
               WHERE email = $4`,
              [
                'client_v1_pro', 
                1000, 
                JSON.stringify({
                  ...existingUser.settings,
                  plan: plan,
                  subscriptionTier: 'V1_PRO',
                  stripeCustomerId: session.customer,
                  stripeSubscriptionId: subscription.id,
                  upgradeDate: new Date().toISOString(),
                  pendingUpgrade: false
                }),
                email.toLowerCase()
              ]
            );
            console.log(`✅ User upgraded to V1 Pro: ${email}`);
          } finally {
            client.release();
          }
        }
        break;

      case 'customer.subscription.created':
        const newSubscription = event.data.object;
        console.log(`🆕 New subscription created: ${newSubscription.id}`);
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        
        // Only act on status changes that require downgrade
        if (updatedSubscription.status === 'unpaid' || updatedSubscription.status === 'canceled') {
          const customer = await stripe.customers.retrieve(updatedSubscription.customer);
          
          console.log(`⬇️ Downgrading ${customer.email} - Status: ${updatedSubscription.status}`);
          
          const client = await pool.connect();
          try {
            await client.query(
              `UPDATE ${getTableName('users')} 
               SET user_type = $1, monthly_lead_limit = $2, settings = settings || $3, updated_at = NOW()
               WHERE email = $4`,
              [
                'client_v1', 
                100, 
                JSON.stringify({ 
                  subscriptionTier: 'FREE', 
                  downgradedDate: new Date().toISOString(),
                  reason: updatedSubscription.status 
                }),
                customer.email.toLowerCase()
              ]
            );
          } finally {
            client.release();
          }
        }
        break;
        
      case 'customer.subscription.deleted':
        const cancelledSubscription = event.data.object;
        const customer = await stripe.customers.retrieve(cancelledSubscription.customer);
        
        console.log(`🗑️ Subscription cancelled for ${customer.email}`);
        
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE ${getTableName('users')} 
             SET user_type = $1, monthly_lead_limit = $2, settings = settings || $3, updated_at = NOW()
             WHERE email = $4`,
            [
              'client_v1', 
              100, 
              JSON.stringify({ 
                subscriptionTier: 'FREE', 
                downgradedDate: new Date().toISOString(),
                reason: 'cancelled' 
              }),
              customer.email.toLowerCase()
            ]
          );
          console.log(`⬇️ User downgraded to free: ${customer.email}`);
        } finally {
          client.release();
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        console.log(`💳 Payment failed for invoice: ${failedInvoice.id}`);
        // Don't downgrade immediately - Stripe will retry
        // Just log for monitoring
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

// 📋 Get leads
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
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

// ➕ Create lead
app.post('/api/leads', 
  authenticateToken,
  [
    validateLeadName,
    body('email').optional().isEmail().normalizeEmail(),
    body('type').optional().isIn(['cold', 'warm', 'crm']).withMessage('Invalid lead type'),
    body('qualityScore').optional().isInt({ min: 1, max: 10 }).withMessage('Quality score must be 1-10'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      // Check lead limits
      if (!req.user.isAdmin) {
        const user = await findUserById(req.user.userId);
        if (user && user.current_month_leads >= user.monthly_lead_limit) {
          return res.status(403).json({ 
            error: `Monthly lead limit reached (${user.monthly_lead_limit}). Upgrade to add more!`,
            limitReached: true,
            currentCount: user.current_month_leads,
            limit: user.monthly_lead_limit
          });
        }
      }

      const leadData = {
        userId: req.user.userId,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        company: req.body.company,
        platform: req.body.platform,
        status: req.body.status || 'New lead',
        type: req.body.type || 'cold',
        notes: req.body.notes,
        qualityScore: req.body.qualityScore || 5,
        potentialValue: req.body.potentialValue || 0,
        followUpDate: req.body.followUpDate
      };

      const newLead = await createLead(leadData);
      
      if (!req.user.isAdmin) {
        await incrementUserLeadCount(req.user.userId);
      }
      
      console.log(`✅ Lead created: ${leadData.name} by user ${req.user.userId}`);
      res.status(201).json(newLead);
    } catch (error) {
      console.error('Create lead error:', error.message);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }
);

// ✏️ Update lead
app.put('/api/leads/:id', 
  authenticateToken,
  [validateNumericId, handleValidationErrors],
  async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const client = await pool.connect();
      
      try {
        // Get current lead
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
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Build update query
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        const allowedFields = ['name', 'email', 'phone', 'company', 'platform', 'status', 'type', 'notes', 'quality_score', 'potential_value', 'follow_up_date'];

        for (const field of allowedFields) {
          if (req.body.hasOwnProperty(field)) {
            updateFields.push(`${field} = ${paramCount}`);
            let value = req.body[field];
            
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

// 🗑️ Delete lead
app.delete('/api/leads/:id', 
  authenticateToken,
  [validateNumericId, handleValidationErrors],
  async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const client = await pool.connect();
      
      try {
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
          return res.status(403).json({ error: 'Unauthorized' });
        }

        await client.query(`DELETE FROM ${getTableName('leads')} WHERE id = $1`, [leadId]);

        if (!req.user.isAdmin) {
          await decrementUserLeadCount(lead.user_id);
        }
        
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

// 📊 Statistics
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
      isAdminView: req.user.isAdmin && req.query.viewAll === 'true'
    });
  } catch (error) {
    console.error('Get statistics error:', error.message);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// 👑 Admin stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const client = await pool.connect();
    try {
      const usersResult = await client.query(`SELECT COUNT(*), SUM(CASE WHEN is_admin THEN 1 ELSE 0 END) as admin_count FROM ${getTableName('users')}`);
      const leadsResult = await client.query(`SELECT COUNT(*) FROM ${getTableName('leads')}`);
      
      const totalUsers = parseInt(usersResult.rows[0].count);
      const adminUsers = parseInt(usersResult.rows[0].admin_count);
      const clientUsers = totalUsers - adminUsers;
      const totalLeads = parseInt(leadsResult.rows[0].count);
      
      const monthlyRevenue = clientUsers * 6.99;
      
      res.json({
        users: { total: totalUsers, admins: adminUsers, clients: clientUsers },
        leads: { total: totalLeads },
        revenue: { monthly: monthlyRevenue, annual: monthlyRevenue * 12 },
        trialSystem: {
          lastCheckTime: lastTrialCheckTime,
          dailyDowngrades: dailyDowngradeCount,
          status: 'Active - checking every hour'
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Admin stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// ⚙️ User settings
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

// 🏥 Health check
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
        features: [
          'postgresql-storage', 
          'authentication', 
          'lead-management', 
          'admin-mode', 
          'stripe-billing',
          'auto-trial-downgrade',
          'password-reset',
          'simplified-architecture'
        ],
        database: {
          connected: true,
          tablePrefix: tablePrefix || 'none',
          users: parseInt(usersResult.rows[0].count),
          leads: parseInt(leadsResult.rows[0].count)
        },
        trialSystem: {
          lastCheckTime,
          dailyDowngradeCount,
          status: 'Active'
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

// 📄 Static page routes
const staticPages = ['login', 'pricing', 'features', 'about', 'contact', 'privacy', 'terms'];

staticPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`), (err) => {
      if (err) {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
      }
    });
  });
});

// 🏠 Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🚫 404 handler
app.get('*', (req, res) => {
  console.warn(`🚫 404 request: ${req.method} ${req.originalUrl}`);
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Page not found' });
    }
  });
});

// 🚀 Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SteadyLeadFlow server running on port ${PORT}`);
      console.log(`🔧 Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
      console.log(`🗄️  Database tables: ${tablePrefix ? tablePrefix + '*' : 'production tables'}`);
      console.log(`👑 Admin emails configured: ${ADMIN_EMAILS.length > 0 ? ADMIN_EMAILS.length : 'NONE - SET ADMIN_EMAILS!'}`);
      console.log(`🔒 Security features:`);
      console.log(`   ✅ Rate limiting (Login: 5/15min, API: 1000/15min)`);
      console.log(`   ✅ Input validation on critical endpoints`);
      console.log(`   ✅ SQL injection protection`);
      console.log(`   ✅ Basic CORS protection`);
      console.log(`🚀 Dashboard routing: /dashboard/* → public/dashboard/`);
      console.log(`🔑 Password reset: /forgot-password & /reset-password`);
      console.log(`💳 Stripe billing: ENHANCED with payment failure protection`);
      console.log(`🎁 Trial system: Auto-downgrade every hour + manual controls`);
      console.log(`🔧 Monitoring endpoints:`);
      console.log(`   📊 GET  /api/admin/trial-status (view all trials)`);
      console.log(`   🔄 POST /api/admin/check-trials (manual trial check)`);
      console.log(`   🧪 POST /api/admin/create-test-trial (2-minute test trial)`);
      console.log(`   🔑 POST /api/forgot-password (request password reset)`);
      console.log(`   🔄 POST /api/reset-password (reset with token)`);
      console.log(`✨ Clean, readable, maintainable architecture!`);
      
      if (ADMIN_EMAILS.length === 0) {
        console.warn(`⚠️  WARNING: No admin emails configured! Set ADMIN_EMAILS environment variable.`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();