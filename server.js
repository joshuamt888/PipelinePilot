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
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');

// Basic security middleware
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult, param } = require('express-validator');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// 🍪 SECURE COOKIE CONFIGURATION
const COOKIE_CONFIG = {
  production: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.COOKIE_DOMAIN // e.g., '.steadymanager.com'
  },
  development: {
    httpOnly: true,
    secure: false, // Allow HTTP in dev
    sameSite: 'lax', // More permissive for dev
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
};

function getCookieConfig() {
  return process.env.NODE_ENV === 'production' 
    ? COOKIE_CONFIG.production 
    : COOKIE_CONFIG.development;
}

// 💳 UPDATED: Multi-tier pricing configuration
const PRICING_PLANS = {
  free: {
    name: 'Free',
    userType: 'free',
    leadLimit: 50,
    features: ['Basic pipeline', 'Core dashboard']
  },
  professional_monthly: {
    name: 'Professional',
    userType: 'professional',
    leadLimit: 1000,
    priceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    features: ['Full pipeline', 'Advanced analytics']
  },
  professional_yearly: {
    name: 'Professional Yearly',
    userType: 'professional',
    leadLimit: 1000,
    priceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
    features: ['Full pipeline', 'Advanced analytics', 'Save 20%']
  },
  business_monthly: {
    name: 'Business',
    userType: 'business',
    leadLimit: 10000,
    priceId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    features: ['AI scoring', 'Automation', 'Team features']
  },
  business_yearly: {
    name: 'Business Yearly',
    userType: 'business',
    leadLimit: 10000,
    priceId: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
    features: ['AI scoring', 'Automation', 'Team features', 'Save 20%']
  },
  enterprise_monthly: {
    name: 'Enterprise',
    userType: 'enterprise',
    leadLimit: 999999,
    priceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    features: ['Custom integrations', 'White-label', 'Dedicated support']
  },
  enterprise_yearly: {
    name: 'Enterprise Yearly',
    userType: 'enterprise',
    leadLimit: 999999,
    priceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    features: ['Custom integrations', 'White-label', 'Dedicated support', 'Save 20%']
  }
};

// Helper function to get plan details
function getPlanByUserType(userType) {
  return Object.values(PRICING_PLANS).find(plan => plan.userType === userType) || PRICING_PLANS.free;
}

function getPlanByPriceId(priceId) {
  return Object.values(PRICING_PLANS).find(plan => plan.priceId === priceId);
}

// 📧 Email usage tracking
let dailyEmailCount = 0;
let lastResetDate = new Date().toDateString();

function resetDailyCountIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyEmailCount = 0;
    lastResetDate = today;
  }
}

function canSendEmail() {
  resetDailyCountIfNeeded();
  return dailyEmailCount < 90; // Leave buffer under 100
}

function incrementEmailCount() {
  resetDailyCountIfNeeded();
  dailyEmailCount++;
  console.log(`📧 Emails sent today: ${dailyEmailCount}/90`);
}

// 🛡️ IMPROVED: More flexible email rate limiting per email address
const emailRequestTracker = new Map();

function canSendEmailToAddress(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  
  if (!emailRequestTracker.has(key)) {
    emailRequestTracker.set(key, []);
  }
  
  const requests = emailRequestTracker.get(key);
  
  // Remove requests older than 1 hour
  const oneHourAgo = now - (60 * 60 * 1000);
  const recentRequests = requests.filter(timestamp => timestamp > oneHourAgo);
  emailRequestTracker.set(key, recentRequests);
  
  // Allow max 5 emails per hour per email address (increased from 3)
  return recentRequests.length < 5;
}

function recordEmailRequest(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  
  if (!emailRequestTracker.has(key)) {
    emailRequestTracker.set(key, []);
  }
  
  emailRequestTracker.get(key).push(now);
}

// Clean up old entries every hour to prevent memory bloat
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [email, timestamps] of emailRequestTracker.entries()) {
    const recent = timestamps.filter(timestamp => timestamp > oneHourAgo);
    if (recent.length === 0) {
      emailRequestTracker.delete(email);
    } else {
      emailRequestTracker.set(email, recent);
    }
  }
  console.log(`🧹 Cleaned email tracker - tracking ${emailRequestTracker.size} emails`);
}, 60 * 60 * 1000);

// 📧 Email transporter setup
let emailTransporter = null;

function initializeEmailTransporter() {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('✅ Email transporter initialized');
  } else {
    console.log('⚠️ Email not configured - will log reset links instead');
  }
}

async function sendPasswordResetEmail(email, resetToken, origin) {
  const resetLink = `${origin}/reset-password?token=${resetToken}`;
  
  if (!emailTransporter) {
    console.log(`🔗 Password reset link for ${email}: ${resetLink}`);
    return true;
  }
  
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@steadyscaling.com',
      to: email,
      subject: 'SteadyManager - Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>We received a request to reset your password for your SteadyManager account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this reset, you can safely ignore this email.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Email send error:', error.message);
    return false;
  }
}

// 🔒 Basic CORS & Security
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); 
app.set('trust proxy', 1);

// 🔐 ADDITIONAL SECURITY HEADERS
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP for dashboard pages
  if (req.path.startsWith('/dashboard')) {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.stripe.com; " +
      "frame-src https://js.stripe.com;"
    );
  }
  
  next();
});

// 🔒 IMPROVED: Separate rate limiters for different actions
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 10, // 10 login attempts per minute (more flexible!)
  message: { error: 'Too many login attempts, please wait 1 minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 registration attempts per 15 minutes
  message: { error: 'Too many registration attempts, please try again later' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window (shorter!)
  max: 5, // 5 password reset attempts per 5 minutes (more attempts!)
  message: { error: 'Too many password reset attempts, please wait 5 minutes' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

// 🔧 Database initialization (updated schema)
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log(`🔧 Initializing ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} database...`);
    
    // UPDATED: Users table with new subscription structure
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('users')} (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type VARCHAR(50) DEFAULT 'free',
        subscription_tier VARCHAR(50) DEFAULT 'FREE',
        billing_cycle VARCHAR(20),
        is_admin BOOLEAN DEFAULT FALSE,
        monthly_lead_limit INTEGER DEFAULT 50,
        current_month_leads INTEGER DEFAULT 0,
        goals JSONB DEFAULT '{"daily": 5, "monthly": 50}',
        settings JSONB DEFAULT '{"darkMode": false, "notifications": true}',
        reset_token TEXT,
        reset_token_expires TIMESTAMP,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
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
       (email, password, user_type, subscription_tier, billing_cycle, is_admin, monthly_lead_limit, current_month_leads, goals, settings, stripe_customer_id, stripe_subscription_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        userData.email.toLowerCase(),
        userData.password,
        userData.userType,
        userData.subscriptionTier,
        userData.billingCycle,
        userData.isAdmin,
        userData.monthlyLeadLimit,
        userData.currentMonthLeads,
        JSON.stringify(userData.goals),
        JSON.stringify(userData.settings),
        userData.stripeCustomerId,
        userData.stripeSubscriptionId
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Database error in createUser:', error.message);
    // Handle unique constraint violation (duplicate email)
    if (error.code === '23505') {
      throw new Error('User with this email already exists');
    }
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
  } catch (error) {
    console.error('Database error in incrementUserLeadCount:', error.message);
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
       SET reset_token = $1, reset_token_expires = $2
       WHERE email = $3`,
      [token, expiresAt.toISOString(), email.toLowerCase()]
    );
  } catch (error) {
    console.error('Database error in saveResetToken:', error.message);
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
  } catch (error) {
    console.error('Database error in clearResetToken:', error.message);
  } finally {
    client.release();
  }
}

// 🎯 Helper function to map subscription tiers to folder paths
function getTierPath(subscriptionTier) {
  const tierMap = {
    'FREE': 'free',
    'PROFESSIONAL': 'professional',
    'PROFESSIONAL_TRIAL': 'professional', // Trials get professional experience
    'BUSINESS': 'business', 
    'ENTERPRISE': 'enterprise',
    'ADMIN': 'admin'
  };
  
  const path = tierMap[subscriptionTier] || 'free';
  console.log(`🗂️  Tier mapping: ${subscriptionTier} → ${path}`);
  return path;
}

// 🔐 IMPROVED: Cookie-based authentication middleware
const authenticateFromCookie = async (req, res, next) => {
  // Try cookie first, then fallback to header for API compatibility
  let token = req.cookies.authToken;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.userId);
    
    if (!user) {
      // Clear invalid cookie
      res.clearCookie('authToken', getCookieConfig());
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = {
      ...decoded,
      isAdmin: ADMIN_EMAILS.includes(decoded.email)
    };
    next();
  } catch (err) {
    // Clear invalid/expired cookie
    res.clearCookie('authToken', getCookieConfig());
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// 🔐 SECURITY MIDDLEWARE: Add CSRF protection for forms
const csrfProtection = (req, res, next) => {
  // For state-changing operations, check referer
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const referer = req.get('Referer');
    const host = req.get('Host');
    
    if (!referer || !referer.includes(host)) {
      return res.status(403).json({ error: 'Invalid request origin' });
    }
  }
  next();
};

// 📁 Static files and dashboard routing
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 UPDATED: Dashboard routing with cookie authentication
app.get('/dashboard', async (req, res) => {
  try {
    const { upgrade, session_id } = req.query;
    
    if (upgrade === 'success') {
      console.log('✅ Payment success redirect:', session_id);
    }
    
    // Get token from cookie (primary) or URL parameter (fallback)
    let token = req.cookies.authToken;
    if (!token) {
      token = req.query.token;
    }
    
    console.log('🔍 Dashboard access attempt - Token exists:', !!token);
    
    if (!token) {
      console.log('❌ No authentication token, redirecting to login');
      return res.redirect('/login?error=auth_required');
    }
    
    // Verify token and get user
    let decoded, user;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await findUserById(decoded.userId);
      
      if (!user) {
        console.log('❌ User not found for userId:', decoded.userId);
        res.clearCookie('authToken', getCookieConfig());
        return res.redirect('/login?error=user_not_found');
      }
    } catch (err) {
      console.log('❌ Token verification failed:', err.message);
      res.clearCookie('authToken', getCookieConfig());
      return res.redirect('/login?error=session_expired');
    }
    
    // If token came from URL parameter, set it as cookie for future requests
    if (req.query.token && !req.cookies.authToken) {
      res.cookie('authToken', token, getCookieConfig());
      res.cookie('isLoggedIn', 'true', {
        ...getCookieConfig(),
        httpOnly: false
      });
    }
    
    // Determine tier path based on subscription
    const tierPath = getTierPath(user.subscription_tier);
    
    console.log(`🎯 Serving dashboard for ${user.email} (${user.subscription_tier}) → tiers/${tierPath}/`);
    
    // Serve the tier-specific dashboard
    const dashboardPath = path.join(__dirname, 'public', 'dashboard', 'tiers', tierPath, 'index.html');
    console.log('📁 Serving file:', dashboardPath);
    
    res.sendFile(dashboardPath, (err) => {
      if (err) {
        console.error('❌ Failed to serve dashboard file:', err.message);
        res.status(500).send('Dashboard file not found');
      }
    });
    
  } catch (error) {
    console.error('Dashboard routing error:', error.message);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// 🔐 UPDATED: Dashboard sub-routes with cookie authentication  
app.get('/dashboard/*', async (req, res) => {
  try {
    const requestPath = req.params[0];
    
    // Get token from cookie first, then URL/header as fallback
    let token = req.cookies.authToken;
    if (!token) {
      token = req.query.token;
    }
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
    }
    
    if (!token) {
      return res.redirect('/login?error=auth_required');
    }
    
    // Verify token
    let decoded, user;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await findUserById(decoded.userId);
      
      if (!user) {
        res.clearCookie('authToken', getCookieConfig());
        return res.redirect('/login?error=user_not_found');
      }
    } catch (err) {
      console.error('Token verification failed in dashboard sub-route:', err.message);
      res.clearCookie('authToken', getCookieConfig());
      return res.redirect('/login?error=session_expired');
    }
    
    // Handle different types of requests (existing logic)
    if (requestPath.startsWith('shared/')) {
      const filePath = path.join(__dirname, 'public', 'dashboard', requestPath);
      return res.sendFile(filePath, (err) => {
        if (err) {
          console.warn(`📁 Shared asset not found: ${requestPath}`);
          res.status(404).json({ error: 'Asset not found' });
        }
      });
    }
    
    if (requestPath.startsWith('tiers/')) {
      const filePath = path.join(__dirname, 'public', 'dashboard', requestPath);
      return res.sendFile(filePath, (err) => {
        if (err) {
          console.warn(`📁 Tier asset not found: ${requestPath}`);
          res.status(404).json({ error: 'Asset not found' });
        }
      });
    }
    
    // For any other dashboard route, redirect to user's tier dashboard
    const tierPath = getTierPath(user.subscription_tier);
    console.log(`🎯 Serving dashboard sub-route: ${user.email} → /dashboard/tiers/${tierPath}/index.html`);
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'tiers', tierPath, 'index.html'));
    
  } catch (error) {
    console.error('Dashboard sub-route error:', error.message);
    res.status(500).json({ error: 'Failed to load dashboard page' });
  }
});

// 🔐 Password reset routes
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'forgot-password.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'reset-password.html'));
});

// 🚀 ROUTES & API ENDPOINTS

// IMPROVED: Apply separate rate limiting for different actions
app.use('/api/login', loginLimiter);            // 10 attempts per minute
app.use('/api/register', registerLimiter);      // 5 attempts per 15 minutes  
app.use('/api/start-trial', registerLimiter);   // 5 attempts per 15 minutes
app.use('/api/forgot-password', passwordResetLimiter); // 5 attempts per 5 minutes
app.use('/api/reset-password', passwordResetLimiter);  // 5 attempts per 5 minutes
app.use('/api', apiLimiter);

// Apply CSRF protection to sensitive routes
app.use('/api/leads', csrfProtection);
app.use('/api/user/settings', csrfProtection);
app.use('/api/admin/*', csrfProtection);

// 🍪 COOKIE VALIDATION ENDPOINT (for client-side checks)
app.get('/api/auth/check', async (req, res) => {
  const token = req.cookies.authToken;
  
  if (!token) {
    return res.json({ authenticated: false });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.userId);
    
    if (!user) {
      res.clearCookie('authToken', getCookieConfig());
      return res.json({ authenticated: false });
    }
    
    res.json({ 
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        userType: user.user_type,
        subscriptionTier: user.subscription_tier,
        isAdmin: user.is_admin,
        monthlyLeadLimit: user.monthly_lead_limit,
        currentMonthLeads: user.current_month_leads,
        goals: user.goals,
        settings: user.settings
      }
    });
  } catch (err) {
    res.clearCookie('authToken', getCookieConfig());
    res.json({ authenticated: false });
  }
});

// 🎁 UPDATED: Trial endpoint with pending user retry logic and debugging
app.post('/api/start-trial',
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
      console.log('🔍 Trial request received:', { 
        email: req.body.email, 
        hasPassword: !!req.body.password,
        hasConfirmPassword: !!req.body.confirmPassword,
        bodyKeys: Object.keys(req.body)
      });
      
      const { email, password } = req.body;
      
      const existingUser = await findUserByEmail(email);
      
      // 🎯 SMART HANDLING: If user exists and is pending, allow trial conversion
      if (existingUser) {
        // Check if they're a pending user wanting to try trial instead
        if (existingUser.user_type.includes('_pending')) {
          
          console.log(`🔄 Converting pending user to trial: ${email}`);
          
          // Convert pending user to trial
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);
          
          const client = await pool.connect();
          try {
            await client.query(
              `UPDATE ${getTableName('users')} 
               SET user_type = $1, subscription_tier = $2, monthly_lead_limit = $3, 
                   settings = $4, updated_at = NOW()
               WHERE email = $5`,
              [
                'professional_trial',
                'PROFESSIONAL_TRIAL', 
                1000,
                JSON.stringify({
                  ...existingUser.settings,
                  subscriptionTier: 'PROFESSIONAL_TRIAL',
                  trialStartDate: new Date().toISOString(),
                  trialEndDate: trialEndDate.toISOString(),
                  convertedFromPending: true
                }),
                email.toLowerCase()
              ]
            );
          } finally {
            client.release();
          }
          
          const token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email, userType: 'professional_trial' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          // Set secure cookie
          const cookieConfig = getCookieConfig();
          res.cookie('authToken', token, cookieConfig);
          res.cookie('isLoggedIn', 'true', {
            ...cookieConfig,
            httpOnly: false
          });

          return res.status(200).json({
            message: 'Trial started! Converted from pending account. Welcome to Professional! 🚀',
            success: true,
            user: { 
              id: existingUser.id, 
              email: existingUser.email, 
              isAdmin: existingUser.is_admin,
              userType: 'professional_trial',
              subscriptionTier: 'PROFESSIONAL_TRIAL',
              monthlyLeadLimit: 1000,
              currentMonthLeads: existingUser.current_month_leads
            },
            trialEndDate: trialEndDate.toISOString()
          });
        }
        
        // Regular user already exists error (not pending)
        return res.status(400).json({ 
          error: 'User already exists with this email. Try signing in instead.',
          shouldSignIn: true
        });
      }

      // 🆕 NEW TRIAL USER CREATION
      const hashedPassword = await bcrypt.hash(password, 12);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);
      
      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        userType: 'professional_trial',
        subscriptionTier: 'PROFESSIONAL_TRIAL',
        billingCycle: null,
        isAdmin,
        monthlyLeadLimit: 1000,
        currentMonthLeads: 0,
        goals: { daily: 33, monthly: 1000 },
        settings: {
          darkMode: false,
          notifications: true,
          subscriptionTier: 'PROFESSIONAL_TRIAL',
          trialStartDate: new Date().toISOString(),
          trialEndDate: trialEndDate.toISOString()
        },
        stripeCustomerId: null,
        stripeSubscriptionId: null
      };

      const newUser = await createUser(userData);

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, userType: 'professional_trial' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set secure cookie
      const cookieConfig = getCookieConfig();
      res.cookie('authToken', token, cookieConfig);
      res.cookie('isLoggedIn', 'true', {
        ...cookieConfig,
        httpOnly: false
      });

      console.log(`🎁 Trial user created: ${email} - Expires: ${trialEndDate}`);

      res.status(201).json({
        message: 'Free trial started successfully! Welcome to Professional! 🚀',
        success: true,
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          isAdmin,
          userType: 'professional_trial',
          subscriptionTier: 'PROFESSIONAL_TRIAL',
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

// 🔥 UPDATED: Register endpoint with pending user retry logic
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
      const { email, password, pendingUpgrade, plan } = req.body;
      
      const existingUser = await findUserByEmail(email);
      
      // 🎯 SMART HANDLING: If user exists and is pending, allow retry
      if (existingUser) {
        // Check if they're a pending user trying to pay again
        if (existingUser.user_type.includes('_pending') && pendingUpgrade) {
          
          // 🛡️ Rate limiting: Check retry attempts in last hour
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const retryAttempts = existingUser.settings?.retryAttempts || [];
          const recentAttempts = retryAttempts.filter(attempt => new Date(attempt) > oneHourAgo);
          
          if (recentAttempts.length >= 3) {
            return res.status(429).json({ 
              error: 'Too many payment attempts. Please wait 1 hour before trying again.',
              isPendingUser: true,
              retryAfter: 3600 // 1 hour in seconds
            });
          }
          
          // 🔄 Log this retry attempt
          const updatedAttempts = [...recentAttempts, new Date().toISOString()];
          const client = await pool.connect();
          try {
            await client.query(
              `UPDATE ${getTableName('users')} 
               SET settings = settings || $1, updated_at = NOW()
               WHERE email = $2`,
              [
                JSON.stringify({ retryAttempts: updatedAttempts }),
                email.toLowerCase()
              ]
            );
          } finally {
            client.release();
          }
          
          console.log(`🔄 Pending user retry: ${email} (${recentAttempts.length + 1}/3 attempts this hour)`);
          
          // ✅ Return existing user data for Stripe checkout
          const token = jwt.sign(
            { userId: existingUser.id, email: existingUser.email, userType: existingUser.user_type },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
          );

          // Set secure cookie
          const cookieConfig = getCookieConfig();
          res.cookie('authToken', token, cookieConfig);
          res.cookie('isLoggedIn', 'true', {
            ...cookieConfig,
            httpOnly: false
          });

          return res.status(200).json({
            message: 'Redirecting to payment for existing pending account...',
            success: true,
            user: { 
              id: existingUser.id, 
              email: existingUser.email, 
              isAdmin: existingUser.is_admin,
              userType: existingUser.user_type,
              subscriptionTier: existingUser.subscription_tier,
              monthlyLeadLimit: existingUser.monthly_lead_limit,
              currentMonthLeads: existingUser.current_month_leads,
              pendingUpgrade: true,
              isRetry: true
            }
          });
        } 
        
        // Regular user already exists error
        return res.status(400).json({ 
          error: 'User already exists with this email. Try signing in instead.',
          shouldSignIn: true
        });
      }

      // 🆕 NEW USER CREATION (existing logic)
      const hashedPassword = await bcrypt.hash(password, 12);
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      let userType = 'free';
      let subscriptionTier = 'FREE';
      let monthlyLeadLimit = 50;
      let goals = { daily: 5, monthly: 50 };
      let billingCycle = null;
      
      if (pendingUpgrade && plan) {
        const planConfig = PRICING_PLANS[plan];
        if (planConfig) {
          userType = `${planConfig.userType}_pending`;
          subscriptionTier = planConfig.name.toUpperCase();
          monthlyLeadLimit = planConfig.leadLimit;
          billingCycle = plan.includes('yearly') ? 'yearly' : 'monthly';
          goals = { daily: Math.floor(planConfig.leadLimit / 30), monthly: planConfig.leadLimit };
        }
      }
      
      if (isAdmin) {
        userType = 'admin';
        subscriptionTier = 'ADMIN';
        monthlyLeadLimit = 999999;
        goals = { daily: 999999, monthly: 999999 };
      }
      
      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        userType,
        subscriptionTier,
        billingCycle,
        isAdmin,
        monthlyLeadLimit,
        currentMonthLeads: 0,
        goals,
        settings: {
          darkMode: false,
          notifications: true,
          pendingUpgrade: pendingUpgrade || false,
          plan: plan || null,
          retryAttempts: []
        },
        stripeCustomerId: null,
        stripeSubscriptionId: null
      };

      const newUser = await createUser(userData);

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, userType: newUser.user_type },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set secure cookie
      const cookieConfig = getCookieConfig();
      res.cookie('authToken', token, cookieConfig);
      res.cookie('isLoggedIn', 'true', {
        ...cookieConfig,
        httpOnly: false
      });

      console.log(`✅ New user registered: ${email} ${isAdmin ? '(ADMIN)' : pendingUpgrade ? `(PENDING ${subscriptionTier})` : '(FREE)'}`);

      res.status(201).json({
        message: pendingUpgrade ? `Account created! Complete payment to activate ${subscriptionTier}.` : 
                 isAdmin ? 'Admin account created! 👑' : 'Free account created!',
        success: true,
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          isAdmin,
          userType: newUser.user_type,
          subscriptionTier: newUser.subscription_tier,
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

// 🔐 UPDATED: Login endpoint with secure cookie
app.post('/api/login', 
  [validateEmail, body('password').notEmpty().withMessage('Password required'), handleValidationErrors],
  async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }
      
      const tokenExpiry = rememberMe ? '7d' : '24h';
      const cookieMaxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      
      const token = jwt.sign(
        { userId: user.id, email: user.email, userType: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: tokenExpiry }
      );
      
      const subscriptionTier = user.subscription_tier || 'FREE';
      
      console.log(`✅ User login: ${email} (${subscriptionTier})`);
      
      const welcomeMessages = {
        'ADMIN': 'Welcome back, Admin! 👑',
        'PROFESSIONAL': 'Welcome back, Professional! 🚀',
        'PROFESSIONAL_TRIAL': 'Welcome back to your trial! 🎁',
        'BUSINESS': 'Welcome back, Business! 💼',
        'ENTERPRISE': 'Welcome back, Enterprise! ⭐',
        'FREE': 'Welcome back!'
      };
      
      // Set secure cookie
      const cookieConfig = {
        ...getCookieConfig(),
        maxAge: cookieMaxAge
      };
      
      res.cookie('authToken', token, cookieConfig);
      
      // Also set a non-httpOnly cookie for client-side checks (without sensitive data)
      res.cookie('isLoggedIn', 'true', {
        ...cookieConfig,
        httpOnly: false // Allows JavaScript access for UI updates
      });

      res.json({
        message: welcomeMessages[subscriptionTier] || 'Welcome back!',
        success: true,
        user: { 
          id: user.id, 
          email: user.email, 
          isAdmin: user.is_admin,
          userType: user.user_type,
          subscriptionTier,
          billingCycle: user.billing_cycle,
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

// 🚪 LOGOUT endpoint to clear cookies
app.post('/api/logout', (req, res) => {
  const cookieConfig = getCookieConfig();
  
  res.clearCookie('authToken', cookieConfig);
  res.clearCookie('isLoggedIn', cookieConfig);
  
  console.log('🚪 User logged out, cookies cleared');
  res.json({ message: 'Logged out successfully' });
});

// 🔑 Enhanced Forgot Password Endpoint with improved protection
app.post('/api/forgot-password',
  [validateEmail, handleValidationErrors],
  async (req, res) => {
    try {
      const { email } = req.body;
      
      // 🛡️ Check 1: Global daily email limits
      if (!canSendEmail()) {
        return res.status(429).json({ 
          error: "We've reached our daily email limit. Please try again tomorrow or contact josh@steadyscaling.com" 
        });
      }
      
      // 🛡️ Check 2: Per-email rate limits (5 emails per hour per email)
      if (!canSendEmailToAddress(email)) {
        return res.status(429).json({ 
          error: "Too many reset requests for this email (5 max per hour). Please wait before requesting again." 
        });
      }
      
      const user = await findUserByEmail(email);
      if (!user) {
        // Still record the attempt even for non-existent emails (security)
        recordEmailRequest(email);
        return res.json({ 
          message: 'If that email exists, we sent a password reset link!' 
        });
      }
      
      const resetToken = generateResetToken();
      await saveResetToken(email, resetToken);
      
      console.log(`🔑 Password reset requested for: ${email}`);
      
      // Try to send email
      const emailSent = await sendPasswordResetEmail(email, resetToken, req.headers.origin || 'http://localhost:3000');
      
      if (emailSent) {
        incrementEmailCount(); // Global counter
        recordEmailRequest(email); // Per-email counter
        console.log(`📧 Password reset email sent to: ${email}`);
      } else {
        // Still record attempt even if email failed to send
        recordEmailRequest(email);
      }
      
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

// 🔄 Enhanced Reset password endpoint with password reuse prevention
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
      
      // 🛡️ Check if new password is same as current password
      const isSamePassword = await bcrypt.compare(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({ 
          error: 'New password must be different from your current password' 
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

// 💳 UPDATED: Multi-tier Stripe checkout
app.post('/api/create-checkout-session', 
  [
    body('plan').isIn([
      'professional_monthly', 'professional_yearly',
      'business_monthly', 'business_yearly', 
      'enterprise_monthly', 'enterprise_yearly'
    ]).withMessage('Invalid plan'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { plan, email } = req.body;
      
      const planConfig = PRICING_PLANS[plan];
      if (!planConfig || !planConfig.priceId) {
        return res.status(400).json({ error: 'Invalid plan configuration' });
      }
      
      const baseUrl = isDevelopment 
        ? process.env.DEV_BASE_URL || req.headers.origin
        : 'https://steadymanager.com';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: planConfig.priceId, quantity: 1 }],
        mode: 'subscription',
        customer_email: email,
        success_url: `${baseUrl}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/login?cancelled=true`,
        metadata: { 
          plan, 
          email, 
          tier: planConfig.userType,
          environment: isDevelopment ? 'development' : 'production' 
        }
      });
      
      console.log(`💳 Checkout session created for ${email} (${planConfig.name})`);
      res.json({ sessionId: session.id, url: session.url });
      
    } catch (error) {
      console.error('Stripe checkout error:', error.message);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// 🔥 UPDATED: Stripe webhook with multi-tier support
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
        const planConfig = PRICING_PLANS[plan];
        
        if (!planConfig) {
          console.error(`❌ Unknown plan in webhook: ${plan}`);
          break;
        }
        
        console.log(`💰 Payment successful for ${email} - Plan: ${planConfig.name}`);
        
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
          const client = await pool.connect();
          try {
            const billingCycle = plan.includes('yearly') ? 'yearly' : 'monthly';
            
            await client.query(
              `UPDATE ${getTableName('users')} 
               SET user_type = $1, subscription_tier = $2, billing_cycle = $3, monthly_lead_limit = $4, 
                   stripe_customer_id = $5, stripe_subscription_id = $6, settings = $7, updated_at = NOW()
               WHERE email = $8`,
              [
                planConfig.userType, 
                planConfig.name.toUpperCase(),
                billingCycle,
                planConfig.leadLimit, 
                session.customer,
                subscription.id,
                JSON.stringify({
                  ...existingUser.settings,
                  plan: plan,
                  subscriptionTier: planConfig.name.toUpperCase(),
                  upgradeDate: new Date().toISOString(),
                  pendingUpgrade: false
                }),
                email.toLowerCase()
              ]
            );
            console.log(`✅ User upgraded to ${planConfig.name}: ${email}`);
          } finally {
            client.release();
          }
        }
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
               SET user_type = $1, subscription_tier = $2, billing_cycle = NULL, monthly_lead_limit = $3, 
                   settings = settings || $4, updated_at = NOW()
               WHERE email = $5`,
              [
                'free', 
                'FREE',
                50,
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
             SET user_type = $1, subscription_tier = $2, billing_cycle = NULL, monthly_lead_limit = $3, 
                 settings = settings || $4, updated_at = NOW()
             WHERE email = $5`,
            [
              'free', 
              'FREE',
              50,
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

// 🔄 UPDATED: Auto-downgrade trials with new pricing structure
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
       WHERE user_type = 'professional_trial' 
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
         SET user_type = $1, subscription_tier = $2, monthly_lead_limit = $3, settings = $4, updated_at = NOW()
         WHERE id = $5`,
        ['free', 'FREE', 50, JSON.stringify(updatedSettings), user.id]
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

// Get Stripe config
app.get('/api/stripe-config', (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
});

app.get('/api/pricing-plans', (req, res) => {
  const plans = Object.entries(PRICING_PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    userType: plan.userType,
    leadLimit: plan.leadLimit,
    features: plan.features,
    priceId: plan.priceId,
    isYearly: key.includes('yearly')
  }));
  
  res.json({ plans });
});

// 📋 Get leads
app.get('/api/leads', authenticateFromCookie, async (req, res) => {
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
  authenticateFromCookie,
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
  authenticateFromCookie,
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
  authenticateFromCookie,
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
app.get('/api/statistics', authenticateFromCookie, async (req, res) => {
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

// 👑 UPDATED: Admin stats with new pricing structure
app.get('/api/admin/stats', authenticateFromCookie, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const client = await pool.connect();
    try {
      const usersResult = await client.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_admin THEN 1 ELSE 0 END) as admin_count,
          SUM(CASE WHEN subscription_tier = 'FREE' THEN 1 ELSE 0 END) as free_count,
          SUM(CASE WHEN subscription_tier = 'PROFESSIONAL' THEN 1 ELSE 0 END) as professional_count,
          SUM(CASE WHEN subscription_tier = 'PROFESSIONAL_TRIAL' THEN 1 ELSE 0 END) as trial_count,
          SUM(CASE WHEN subscription_tier = 'BUSINESS' THEN 1 ELSE 0 END) as business_count,
          SUM(CASE WHEN subscription_tier = 'ENTERPRISE' THEN 1 ELSE 0 END) as enterprise_count
        FROM ${getTableName('users')}
      `);
      
      const leadsResult = await client.query(`SELECT COUNT(*) FROM ${getTableName('leads')}`);
      
      const stats = usersResult.rows[0];
      const totalUsers = parseInt(stats.total);
      const totalLeads = parseInt(leadsResult.rows[0].count);
      
      // Calculate estimated revenue (you'll need to set actual prices)
      const estimatedMonthlyRevenue = 
        (parseInt(stats.professional_count) * 6.99) +
        (parseInt(stats.business_count) * 19.99) +
        (parseInt(stats.enterprise_count) * 49.99);
      
      res.json({
        users: {
          total: totalUsers,
          admins: parseInt(stats.admin_count),
          free: parseInt(stats.free_count),
          professional: parseInt(stats.professional_count),
          trials: parseInt(stats.trial_count),
          business: parseInt(stats.business_count),
          enterprise: parseInt(stats.enterprise_count)
        },
        leads: { total: totalLeads },
        revenue: { 
          estimatedMonthly: estimatedMonthlyRevenue, 
          estimatedAnnual: estimatedMonthlyRevenue * 12 
        },
        subscriptionBreakdown: {
          free: parseInt(stats.free_count),
          paid: parseInt(stats.professional_count) + parseInt(stats.business_count) + parseInt(stats.enterprise_count)
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

// 🎛️ Admin endpoint to manually check trials
app.post('/api/admin/check-trials', authenticateFromCookie, async (req, res) => {
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
app.get('/api/admin/trial-status', authenticateFromCookie, async (req, res) => {
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
         WHERE user_type = 'professional_trial' 
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
app.post('/api/admin/create-test-trial', authenticateFromCookie, async (req, res) => {
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
      userType: 'professional_trial',
      subscriptionTier: 'PROFESSIONAL_TRIAL',
      billingCycle: null,
      isAdmin: false,
      monthlyLeadLimit: 1000,
      currentMonthLeads: 0,
      goals: { daily: 33, monthly: 1000 },
      settings: {
        subscriptionTier: 'PROFESSIONAL_TRIAL',
        trialStartDate: new Date().toISOString(),
        trialEndDate: testTrialEnd.toISOString(),
        name: 'Test Trial User',
        isTestAccount: true
      },
      stripeCustomerId: null,
      stripeSubscriptionId: null
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

// ⚙️ User settings
app.get('/api/user/settings', authenticateFromCookie, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      userType: user.user_type,
      subscriptionTier: user.subscription_tier,
      billingCycle: user.billing_cycle,
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
  authenticateFromCookie,
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

// 📧 Enhanced Email stats endpoint
app.get('/api/email-stats', authenticateFromCookie, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  resetDailyCountIfNeeded();
  res.json({
    daily: { count: dailyEmailCount, limit: 90 },
    canSend: canSendEmail(),
    lastResetDate,
    emailConfigured: !!emailTransporter,
    perEmailTracking: {
      totalEmailsTracked: emailRequestTracker.size,
      description: 'Max 5 emails per hour per email address'
    }
  });
});

// 🏥 UPDATED: Enhanced Health check with new pricing info
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
          'multi-tier-pricing',
          'password-reset',
          'email-sending',
          'enhanced-email-rate-limiting',
          'professional-business-enterprise-tiers',
          'secure-cookie-authentication',
          'csrf-protection'
        ],
        database: {
          connected: true,
          tablePrefix: tablePrefix || 'none',
          users: parseInt(usersResult.rows[0].count),
          leads: parseInt(leadsResult.rows[0].count)
        },
        pricingTiers: {
          available: Object.keys(PRICING_PLANS),
          configured: Object.values(PRICING_PLANS).filter(p => p.priceId).length
        },
        emailSystem: {
          configured: !!emailTransporter,
          dailyCount: dailyEmailCount,
          canSend: canSendEmail(),
          protections: [
            '90 emails per day globally',
            '5 emails per hour per email address',
            '5 requests per 5 minutes per IP for password reset'
          ]
        },
        security: {
          cookieAuth: true,
          csrfProtection: true,
          securityHeaders: true,
          rateLimit: true
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
    initializeEmailTransporter();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SteadyManager server running on port ${PORT}`);
      console.log(`🔧 Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
      console.log(`🔒 ENHANCED SECURITY FEATURES:`);
      console.log(`   ✅ Secure cookie-based authentication`);
      console.log(`   ✅ HTTP-only cookies prevent XSS`);
      console.log(`   ✅ CSRF protection on state-changing operations`);
      console.log(`   ✅ Security headers (XSS, clickjacking, etc.)`);
      console.log(`   ✅ Content Security Policy for dashboard`);
      console.log(`   ✅ Flexible rate limiting:`);
      console.log(`      • Login: 10 attempts per minute`);
      console.log(`      • Password reset: 5 attempts per 5 minutes`);
      console.log(`      • Email reset: 5 per hour per email`);
      console.log(`   ✅ All dashboard routes require authentication`);
      console.log(`   ✅ Tier-based file serving works properly`);
      console.log(`🎯 Dashboard serves tier-specific content from: /tiers/{tier}/`);
      console.log(`💳 MULTI-TIER PRICING CONFIGURED:`);
      console.log(`   🆓 Free: ${PRICING_PLANS.free.leadLimit} leads`);
      console.log(`   💼 Professional: ${PRICING_PLANS.professional_monthly.leadLimit} leads (Monthly & Yearly)`);
      console.log(`   🏢 Business: ${PRICING_PLANS.business_monthly.leadLimit} leads (Monthly & Yearly)`);
      console.log(`   ⭐ Enterprise: Unlimited leads (Monthly & Yearly)`);
      console.log(`🛡️ EMAIL SPAM PROTECTION ACTIVE:`);
      console.log(`   • Global daily limit: ${dailyEmailCount}/90`);
      console.log(`   • Per-email hourly limit: 5 max`);
      console.log(`   • Currently tracking: ${emailRequestTracker.size} unique emails`);
      console.log(`   • Auto-cleanup running every hour`);
      
      // Check pricing configuration
      const configuredPlans = Object.values(PRICING_PLANS).filter(p => p.priceId).length;
      const totalPlans = Object.keys(PRICING_PLANS).length - 1; // Subtract free plan
      
      if (configuredPlans < totalPlans) {
        console.warn(`⚠️  WARNING: Only ${configuredPlans}/${totalPlans} paid plans have Stripe price IDs configured!`);
        console.warn(`   Missing price IDs for some plans. Check your .env file.`);
      } else {
        console.log(`✅ All ${configuredPlans} paid plans properly configured with Stripe!`);
      }
      
      if (ADMIN_EMAILS.length === 0) {
        console.warn(`⚠️  WARNING: No admin emails configured! Set ADMIN_EMAILS environment variable.`);
      }
      
      if (!emailTransporter) {
        console.warn(`⚠️  WARNING: Email not configured! Password reset links will be logged to console.`);
        console.warn(`   To enable emails, add these to your .env file:`);
        console.warn(`   EMAIL_HOST=smtp.sendgrid.net`);
        console.warn(`   EMAIL_PORT=587`);
        console.warn(`   EMAIL_USER=apikey`);
        console.warn(`   EMAIL_PASS=your-sendgrid-api-key`);
        console.warn(`   EMAIL_FROM=josh@steadyscaling.com`);
      }
      
      console.log(`🍪 COOKIE CONFIGURATION:`);
      console.log(`   • HttpOnly: ${getCookieConfig().httpOnly} (prevents XSS)`);
      console.log(`   • Secure: ${getCookieConfig().secure} (HTTPS only in production)`);
      console.log(`   • SameSite: ${getCookieConfig().sameSite} (CSRF protection)`);
      console.log(`   • MaxAge: ${getCookieConfig().maxAge / 1000 / 60 / 60} hours`);
      
      console.log(`\n🔐 AUTHENTICATION ENDPOINTS:`);
      console.log(`   • POST /api/login - Login with secure cookies`);
      console.log(`   • POST /api/logout - Clear authentication cookies`);
      console.log(`   • GET /api/auth/check - Verify authentication status`);
      console.log(`   • POST /api/register - Register new account`);
      console.log(`   • POST /api/start-trial - Start free trial`);
      console.log(`   • POST /api/forgot-password - Request password reset`);
      console.log(`   • POST /api/reset-password - Reset password with token`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();