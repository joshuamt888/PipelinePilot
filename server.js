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

// Generate verification token
function generateVerificationToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

// 📧 ACCOUNT VERIFICATION EMAIL FUNCTION
async function sendAccountVerificationEmail(email, token, origin, planType = 'free') {
  const verificationLink = `${origin}/verify-account?token=${token}`;
  
  if (!emailTransporter) {
    console.log(`🔗 Account verification for ${email}: ${verificationLink}`);
    return true;
  }
  
  const planMessages = {
    'free': 'Welcome to SteadyManager! Verify your email to activate your free account.',
    'professional': 'Welcome to SteadyManager! Verify your email to complete your Professional upgrade.',
    'business': 'Welcome to SteadyManager! Verify your email to complete your Business upgrade.',
    'enterprise': 'Welcome to SteadyManager! Verify your email to complete your Enterprise upgrade.'
  };
  
  const subject = planType === 'free' ? 
    'Verify Your SteadyManager Account' : 
    `Complete Your ${planType.charAt(0).toUpperCase() + planType.slice(1)} Upgrade`;
  
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@steadyscaling.com',
      to: email,
      subject: subject,
      html: `
        <div style="text-align: center; padding: 2rem; font-family: Arial, sans-serif;">
          <h1 style="color: #16a34a;">✅ Verify Your Email</h1>
          <p>${planMessages[planType]}</p>
          <a href="${verificationLink}" style="display: inline-block; background: #16a34a; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; margin: 1rem 0; font-weight: bold;">
            Verify Email →
          </a>
          <p style="color: #666; font-size: 0.9rem;">This link expires in 24 hours.</p>
          <p style="color: #666; font-size: 0.8rem;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
      `
    });
    
    incrementEmailCount();
    recordEmailRequest(email);
    return true;
  } catch (error) {
    console.error('Account verification email error:', error.message);
    return false;
  }
}

// Trial verification email function
async function sendTrialVerificationEmail(email, token, origin) {
  const verificationLink = `${origin}/verify-trial?token=${token}`;
  
  if (!emailTransporter) {
    console.log(`🔗 Trial verification for ${email}: ${verificationLink}`);
    return true;
  }
  
  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@steadyscaling.com',
      to: email,
      subject: 'Activate Your SteadyManager Trial - Verify Email',
      html: `
        <div style="text-align: center; padding: 2rem; font-family: Arial, sans-serif;">
          <h1 style="color: #16a34a;">🎉 Activate Your Trial</h1>
          <p>Click below to start your 14-day Professional trial:</p>
          <a href="${verificationLink}" style="display: inline-block; background: #16a34a; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; margin: 1rem 0; font-weight: bold;">
            Activate Trial →
          </a>
          <p style="color: #666; font-size: 0.9rem;">This link expires in 24 hours.</p>
        </div>
      `
    });
    
    incrementEmailCount();
    recordEmailRequest(email);
    return true;
  } catch (error) {
    console.error('Trial email error:', error.message);
    return false;
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
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'], // Add your frontend URLs
    credentials: true // Important for cookies/auth
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

// Add this after the passwordResetLimiter definition
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes for authenticated users
  message: { error: 'API rate limit exceeded' },
  
  // Skip rate limiting for authenticated users on most endpoints
  skip: (req, res) => {
    const hasAuthCookie = !!req.cookies.authToken;
    
    // Always apply rate limiting to auth endpoints regardless of auth status
    const authEndpoints = ['/api/login', '/api/register', '/api/start-trial', 
                          '/api/forgot-password', '/api/reset-password', 
                          '/api/resend-verification'];
    
    if (authEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
      return false; // Don't skip - apply rate limiting
    }
  },
  
  onLimitReached: (req, res, options) => {
    console.log(`🚨 RATE LIMIT HIT: ${req.ip} exceeded ${options.max} requests`);
    console.log(`🍪 Auth cookie present: ${!!req.cookies.authToken}`);
  }
});

const validator = require('validator');

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

// 🎯 UPGRADE PATH VALIDATION & TIER MANAGEMENT
function validateUpgradePath(currentTier, newTier) {
  const tierHierarchy = {
    'free': 0,
    'professional_trial': 0, // Same as free for upgrade purposes
    'professional': 1,
    'business': 2,
    'enterprise': 3,
    'admin': 4 // Can't upgrade admin
  };
  
  const currentLevel = tierHierarchy[currentTier] ?? 0;
  const newLevel = tierHierarchy[newTier] ?? 0;
  
  // Admin can't upgrade
  if (currentTier === 'admin') {
    return { valid: false, message: 'Admin accounts cannot be upgraded via checkout.' };
  }
  
  // Must be an actual upgrade
  if (newLevel <= currentLevel) {
    return { 
      valid: false, 
      message: `You already have ${currentTier}. Contact support to change plans.` 
    };
  }
  
  // Valid upgrade
  return { valid: true };
}

function getAvailableUpgradesForTier(currentTier) {
  const upgradeMap = {
    'free': ['professional_monthly', 'professional_yearly'],
    'professional_trial': ['professional_monthly', 'professional_yearly'],
    'professional': ['business_monthly', 'business_yearly'],
    'business': ['enterprise_monthly', 'enterprise_yearly'],
    'enterprise': [], // No upgrades available
    'admin': [] // No upgrades available
  };
  
  return upgradeMap[currentTier] || [];
}

// 🔧 DATABASE INITIALIZATION
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log(`🔧 Initializing ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'} database with enhanced schema...`);
    
    // 👤 ENHANCED USERS TABLE - Core user management
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('users')} (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        
        -- Subscription & Access Control
        user_type VARCHAR(50) DEFAULT 'free',
        subscription_tier VARCHAR(50) DEFAULT 'FREE',
        billing_cycle VARCHAR(20),
        subscription_status VARCHAR(30) DEFAULT 'active',
        trial_end_date TIMESTAMP,
        subscription_start_date TIMESTAMP,
        subscription_end_date TIMESTAMP,
        
        -- Admin & Permissions
        is_admin BOOLEAN DEFAULT FALSE,
        permissions JSONB DEFAULT '["read_own_leads", "write_own_leads"]',
        
        -- Lead Limits & Usage
        monthly_lead_limit INTEGER DEFAULT 50,
        current_month_leads INTEGER DEFAULT 0,
        total_leads_created INTEGER DEFAULT 0,
        lead_limit_reset_date DATE DEFAULT CURRENT_DATE,
        
        -- User Preferences & Settings
        goals JSONB DEFAULT '{"daily": 5, "monthly": 50, "revenue": 10000}',
        settings JSONB DEFAULT '{"darkMode": false, "notifications": true, "timezone": "UTC"}',
        dashboard_config JSONB DEFAULT '{}',
        
        -- Authentication & Security
        last_login TIMESTAMP,
        login_count INTEGER DEFAULT 0,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP,
        remember_token VARCHAR(255),
        remember_token_expires TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        email_verified_at TIMESTAMP,
        email_verification_token VARCHAR(255),
        
        -- Stripe Integration
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        stripe_payment_method_id VARCHAR(255),
        
        -- Profile Information
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company_name VARCHAR(255),
        phone VARCHAR(50),
        avatar_url TEXT,
        bio TEXT,
        website VARCHAR(255),
        
        -- Onboarding & Features
        onboarding_completed BOOLEAN DEFAULT FALSE,
        onboarding_step INTEGER DEFAULT 0,
        feature_flags JSONB DEFAULT '{}',
        beta_features JSONB DEFAULT '[]',
        
        -- Analytics & Tracking
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        referrer_url TEXT,
        signup_ip INET,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP -- Soft delete
      )
    `);

    // 🎯 ENHANCED LEADS TABLE - Core lead management
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('leads')} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${getTableName('users')}(id) ON DELETE CASCADE,
        
        -- Basic Lead Information
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        job_title VARCHAR(255),
        website VARCHAR(255),
        
        -- Lead Classification & Scoring
        status VARCHAR(100) DEFAULT 'new',
        type VARCHAR(20) DEFAULT 'cold', -- cold, warm, hot, customer, lost
        source VARCHAR(100), -- facebook, linkedin, referral, website, etc.
        platform VARCHAR(100),
        quality_score INTEGER DEFAULT 5 CHECK (quality_score >= 1 AND quality_score <= 10),
        lead_score INTEGER DEFAULT 0, -- Advanced scoring algorithm result
        
        -- Business Information
        potential_value DECIMAL(10,2) DEFAULT 0,
        estimated_close_date DATE,
        deal_stage VARCHAR(50) DEFAULT 'prospecting',
        deal_probability INTEGER DEFAULT 0 CHECK (deal_probability >= 0 AND deal_probability <= 100),
        
        -- Communication & Follow-up
        notes TEXT,
        follow_up_date DATE,
        last_contact_date DATE,
        next_action VARCHAR(255),
        preferred_contact_method VARCHAR(50) DEFAULT 'email',
        
        -- Advanced Lead Data
        lead_magnet VARCHAR(255), -- What attracted them
        pain_points JSONB DEFAULT '[]',
        interests JSONB DEFAULT '[]',
        budget_range VARCHAR(50),
        decision_maker BOOLEAN DEFAULT FALSE,
        buying_timeline VARCHAR(50),
        competitor_info TEXT,
        
        -- Social & Additional Info
        linkedin_url VARCHAR(500),
        facebook_url VARCHAR(500),
        twitter_url VARCHAR(500),
        instagram_url VARCHAR(500),
        other_social JSONB DEFAULT '{}',
        
        -- Engagement Tracking
        email_opens INTEGER DEFAULT 0,
        email_clicks INTEGER DEFAULT 0,
        website_visits INTEGER DEFAULT 0,
        last_website_visit TIMESTAMP,
        engagement_score INTEGER DEFAULT 0,
        
        -- Custom Fields (tier-specific)
        custom_fields JSONB DEFAULT '{}',
        tags JSONB DEFAULT '[]',
        
        -- AI & Automation
        ai_insights JSONB DEFAULT '{}',
        automation_status VARCHAR(50) DEFAULT 'none',
        auto_follow_up_enabled BOOLEAN DEFAULT FALSE,
        
        -- Geography & Demographics
        country VARCHAR(100),
        state VARCHAR(100),
        city VARCHAR(100),
        timezone VARCHAR(50),
        language VARCHAR(10) DEFAULT 'en',
        
        -- Lead Lifecycle
        converted_to_customer BOOLEAN DEFAULT FALSE,
        conversion_date TIMESTAMP,
        lost_reason VARCHAR(255),
        lost_date TIMESTAMP,
        reactivation_attempts INTEGER DEFAULT 0,
        
        -- Timestamps & Tracking
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP, -- Soft delete
        
        -- Indexes for performance
        CONSTRAINT valid_deal_probability CHECK (deal_probability >= 0 AND deal_probability <= 100),
        CONSTRAINT valid_quality_score CHECK (quality_score >= 1 AND quality_score <= 10)
      )
    `);

    // 📋 TASKS & REMINDERS TABLE
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('tasks')} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${getTableName('users')}(id) ON DELETE CASCADE,
        lead_id INTEGER REFERENCES ${getTableName('leads')}(id) ON DELETE SET NULL,
        
        -- Task Details
        title VARCHAR(255) NOT NULL,
        description TEXT,
        task_type VARCHAR(50) DEFAULT 'follow_up', -- follow_up, call, email, meeting, research
        priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
        
        -- Scheduling
        due_date DATE,
        due_time TIME,
        reminder_date TIMESTAMP,
        
        -- Status & Completion
        status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
        completed_at TIMESTAMP,
        completion_notes TEXT,
        
        -- Organization
        category VARCHAR(50),
        estimated_duration_minutes INTEGER,
        actual_duration_minutes INTEGER,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 📈 Create indexes for better performance
    await client.query(`
      -- User indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON ${getTableName('users')} (email);
      CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON ${getTableName('users')} (subscription_tier);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON ${getTableName('users')} (created_at);
      CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON ${getTableName('users')} (email_verification_token);
      
      -- Lead indexes
      CREATE INDEX IF NOT EXISTS idx_leads_user_id ON ${getTableName('leads')} (user_id);
      CREATE INDEX IF NOT EXISTS idx_leads_status ON ${getTableName('leads')} (status);
      CREATE INDEX IF NOT EXISTS idx_leads_type ON ${getTableName('leads')} (type);
      CREATE INDEX IF NOT EXISTS idx_leads_created_at ON ${getTableName('leads')} (created_at);
      CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON ${getTableName('leads')} (follow_up_date);
      CREATE INDEX IF NOT EXISTS idx_leads_quality_score ON ${getTableName('leads')} (quality_score);
      CREATE INDEX IF NOT EXISTS idx_leads_email ON ${getTableName('leads')} (email);
      
      -- Task indexes
      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON ${getTableName('tasks')} (user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON ${getTableName('tasks')} (lead_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON ${getTableName('tasks')} (due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON ${getTableName('tasks')} (status);
    `);

    console.log(`✅ Enhanced database schema initialized successfully`);
    console.log(`📊 Created comprehensive lead management tables with tier-based access`);
    
  } catch (error) {
    console.error('❌ Enhanced database initialization error:', error.message);
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
       (email, password, user_type, subscription_tier, billing_cycle, is_admin, monthly_lead_limit, current_month_leads, goals, settings) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        userData.email,
        userData.password,
        userData.userType,
        userData.subscriptionTier,
        userData.billingCycle,
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
        leadData.followUpDate,
        leadData.linkedin_url || null,      // 🔥 ADD THESE
        leadData.facebook_url || null,      // 🔥 ADD THESE  
        leadData.twitter_url || null,       // 🔥 ADD THESE
        leadData.instagram_url || null,     // 🔥 ADD THESE
        leadData.website || null            // 🔥 ADD THESE
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

// 📧 EMAIL VERIFICATION HELPER FUNCTIONS
async function saveAccountVerificationToken(email, token) {
  const client = await pool.connect();
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
    
    await client.query(
      `UPDATE ${getTableName('users')} 
       SET email_verification_token = $1, 
           settings = settings || $2
       WHERE email = $3`,
      [
        token, 
        JSON.stringify({ verificationTokenExpires: expiresAt.toISOString() }),
        email.toLowerCase()
      ]
    );
  } catch (error) {
    console.error('Database error in saveAccountVerificationToken:', error.message);
  } finally {
    client.release();
  }
}

async function saveTrialVerificationToken(email, token) {
  // For trials, we use the same function but with different naming for clarity
  return await saveAccountVerificationToken(email, token);
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

// Helper function 
function getAllowedTiers(userTier) {
  const tierHierarchy = {
    'free': ['free'],
    'professional_trial': ['free', 'professional'], 
    'professional': ['free', 'professional'],
    'business': ['free', 'professional', 'business'],
    'enterprise': ['free', 'professional', 'business', 'enterprise'],
    'admin': ['free', 'professional', 'business', 'enterprise', 'admin']
  };
  
  return tierHierarchy[userTier] || ['free'];
}

// 📁 Static files and dashboard routing
// 🔧 MIME Type Fix for Dashboard Assets
app.use('/dashboard', (req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  } else if (req.path.endsWith('.css')) {
    res.type('text/css');
  }
  next();
});

// 🔒 PROTECT TIER-SPECIFIC DIRECT ACCESS
app.get('/dashboard/tiers/:tier/*', async (req, res, next) => {
  try {
    const requestedTier = req.params.tier;
    const token = req.cookies.authToken;
    
    console.log(`🔍 Direct tier access attempt: ${requestedTier}`);
    
    if (!token) {
      console.log('❌ No token for direct tier access');
      return res.redirect('/login?error=auth_required');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.userId);
    
    if (!user) {
      console.log('❌ Invalid user for direct tier access');
      res.clearCookie('authToken', getCookieConfig());
      return res.redirect('/login?error=user_not_found');
    }
    
    // Check if user's tier allows access to requested tier
    const userTierPath = getTierPath(user.subscription_tier);
    const allowedTiers = getAllowedTiers(user.subscription_tier);
    
    if (!allowedTiers.includes(requestedTier)) {
      console.log(`🚫 TIER VIOLATION: ${user.email} (${user.subscription_tier}) tried to access ${requestedTier}`);
      return res.redirect(`/dashboard?error=tier_access_denied`);
    }
    
    console.log(`✅ Direct tier access granted: ${user.email} → ${requestedTier}`);
    next(); // Allow the static file to be served
    
  } catch (error) {
    console.error('Direct tier access error:', error.message);
    return res.redirect('/login?error=session_invalid');
  }
});

// 📁 Static files and dashboard routing
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

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
app.use('/api/resend-verification', passwordResetLimiter); // 5 attempts per 5 minutes
app.use('/api', apiLimiter);

// Apply CSRF protection to sensitive routes
app.use('/api/user/settings', csrfProtection);
app.use('/api/admin/*', csrfProtection);

// =============================================
// 🔐 AUTHENTICATION ENDPOINTS 
// =============================================

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

// 📊 Current month statistics
app.get('/api/current-month-stats', authenticateFromCookie, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      currentMonthLeads: user.current_month_leads,
      monthlyLeadLimit: user.monthly_lead_limit,
      leadsRemaining: Math.max(0, user.monthly_lead_limit - user.current_month_leads),
      percentageUsed: Math.round((user.current_month_leads / user.monthly_lead_limit) * 100),
      limitResetDate: user.lead_limit_reset_date
    });
  } catch (error) {
    console.error('Get current month stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch current month statistics' });
  }
});

// 🔥 REGISTER ENDPOINT WITH EMAIL VERIFICATION
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
      if (existingUser) {
        return res.status(400).json({ 
          error: 'User already exists with this email. Try signing in instead.',
          shouldSignIn: true
        });
      }

      // Check email rate limiting
      if (!canSendEmailToAddress(email)) {
        return res.status(429).json({ 
          error: 'Too many verification emails sent. Please wait before requesting again.' 
        });
      }

      if (!canSendEmail()) {
        return res.status(429).json({ 
          error: "We've reached our daily email limit. Please try again tomorrow." 
        });
      }

      // Create pending user (always needs verification now)
      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = generateVerificationToken();
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      
      let userType, subscriptionTier, monthlyLeadLimit, goals, billingCycle, planName;
      
      if (pendingUpgrade && plan) {
        const planConfig = PRICING_PLANS[plan];
        userType = `${planConfig.userType}_pending_verification`;
        subscriptionTier = `${planConfig.name.toUpperCase()}_PENDING`;
        monthlyLeadLimit = planConfig.leadLimit;
        billingCycle = plan.includes('yearly') ? 'yearly' : 'monthly';
        goals = { daily: Math.floor(planConfig.leadLimit / 30), monthly: planConfig.leadLimit };
        planName = planConfig.userType; // for email template
      } else {
        userType = 'free_pending_verification';
        subscriptionTier = 'FREE_PENDING';
        monthlyLeadLimit = 50;
        goals = { daily: 5, monthly: 50 };
        billingCycle = null;
        planName = 'free';
      }

      // Admin accounts skip verification
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
          pendingVerification: !isAdmin,
          pendingUpgrade: pendingUpgrade || false,
          plan: plan || null,
          verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        stripeCustomerId: null,
        stripeSubscriptionId: null
      };

      const newUser = await createUser(userData);
      
      // Save verification token and send email (skip for admins)
      if (!isAdmin) {
        await saveAccountVerificationToken(email, verificationToken);

        const origin = req.headers.origin || 'http://localhost:3000';
        const emailSent = await sendAccountVerificationEmail(email, verificationToken, origin, planName);

        if (!emailSent) {
          console.error(`Failed to send verification email to: ${email}`);
        }

        console.log(`📧 Account verification email sent to: ${email} (${planName} plan)`);
      }

      console.log(`${isAdmin ? '👑 Admin' : '📧 User'} account created: ${email} ${isAdmin ? '(ADMIN - NO VERIFICATION)' : '(PENDING VERIFICATION)'}`);

      res.status(201).json({
        message: isAdmin ? 
          'Admin account created! Welcome!' : 
          'Account created! Check your email to verify and activate your account.',
        success: true,
        requiresVerification: !isAdmin,
        user: { 
          id: newUser.id, 
          email: newUser.email,
          userType: newUser.user_type,
          subscriptionTier: newUser.subscription_tier,
          pendingVerification: !isAdmin,
          isAdmin
        }
      });

    } catch (error) {
      console.error('Register error:', error.message);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// 🎯 START TRIAL ENDPOINT WITH EMAIL VERIFICATION
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
      const { email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          error: 'User already exists with this email. Try signing in instead.',
          shouldSignIn: true
        });
      }

      // Check email rate limiting
      if (!canSendEmailToAddress(email)) {
        return res.status(429).json({ 
          error: 'Too many verification emails sent to this address. Please wait before requesting again.' 
        });
      }

      // Check global email limits
      if (!canSendEmail()) {
        return res.status(429).json({ 
          error: "We've reached our daily email limit. Please try again tomorrow or contact support." 
        });
      }

      // Create pending trial user
      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationToken = generateVerificationToken();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14); // 14 days from now

      const userData = {
        email: email.toLowerCase(),
        password: hashedPassword,
        userType: 'professional_trial_pending', // New status for pending verification
        subscriptionTier: 'PROFESSIONAL_TRIAL_PENDING',
        billingCycle: null,
        isAdmin: false,
        monthlyLeadLimit: 1000,
        currentMonthLeads: 0,
        goals: { daily: 33, monthly: 1000 },
        settings: {
          subscriptionTier: 'PROFESSIONAL_TRIAL_PENDING',
          trialStartDate: new Date().toISOString(),
          trialEndDate: trialEndDate.toISOString(),
          pendingVerification: true,
          verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        stripeCustomerId: null,
        stripeSubscriptionId: null
      };

      const newUser = await createUser(userData);
      
      // Save verification token
      await saveTrialVerificationToken(email, verificationToken);

      // Send verification email
      const origin = req.headers.origin || 'http://localhost:3000';
      const emailSent = await sendTrialVerificationEmail(email, verificationToken, origin);

      if (!emailSent) {
        console.error(`Failed to send verification email to: ${email}`);
      }

      console.log(`📧 Trial verification email sent to: ${email}`);
      console.log(`🆔 User created with pending verification: ${newUser.id}`);

      res.status(201).json({
        message: 'Account created! Check your email to activate your 14-day trial.',
        success: true,
        requiresVerification: true,
        user: { 
          id: newUser.id, 
          email: newUser.email,
          userType: newUser.user_type,
          subscriptionTier: newUser.subscription_tier,
          pendingVerification: true
        }
      });

    } catch (error) {
      console.error('Start trial error:', error.message);
      if (error.message.includes('already exists')) {
        res.status(400).json({ 
          error: 'User already exists with this email. Try signing in instead.',
          shouldSignIn: true
        });
      } else {
        res.status(500).json({ error: 'Failed to start trial' });
      }
    }
  }
);

// 🔄 RESEND VERIFICATION ENDPOINT
app.post('/api/resend-verification',
  [validateEmail, handleValidationErrors],
  async (req, res) => {
    try {
      const { email } = req.body;
      
      // Check email rate limiting
      if (!canSendEmailToAddress(email)) {
        return res.status(429).json({ 
          error: 'Too many verification emails sent. Please wait before requesting again.' 
        });
      }

      if (!canSendEmail()) {
        return res.status(429).json({ 
          error: "We've reached our daily email limit. Please try again tomorrow." 
        });
      }

      // Find pending user
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'No account found for this email.' });
      }

      // Check if user is in pending verification state
      if (!user.user_type.includes('pending') || !user.settings?.pendingVerification) {
        return res.status(400).json({ error: 'This account is not pending verification.' });
      }

      // Generate new verification token
      const newToken = generateVerificationToken();
      await saveAccountVerificationToken(email, newToken);

      // Determine plan type for email template
      const planType = user.settings?.plan ? 
        PRICING_PLANS[user.settings.plan]?.userType || 'free' : 
        'free';

      // Send new verification email
      const origin = req.headers.origin || 'http://localhost:3000';
      const emailSent = user.user_type.includes('trial') ?
        await sendTrialVerificationEmail(email, newToken, origin) :
        await sendAccountVerificationEmail(email, newToken, origin, planType);

      if (emailSent) {
        console.log(`📧 Resent verification email to: ${email}`);
        res.json({ message: 'Verification email resent! Check your inbox.' });
      } else {
        res.status(500).json({ error: 'Failed to send verification email' });
      }

    } catch (error) {
      console.error('Resend verification error:', error.message);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }
);

// 🔐 GENERAL ACCOUNT VERIFICATION
app.get('/verify-account', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <html><body style="text-align: center; padding: 2rem; font-family: Arial;">
          <h1 style="color: #dc2626;">❌ Invalid Link</h1>
          <p>This verification link is missing required information.</p>
          <a href="/register" style="color: #16a34a; text-decoration: none; font-weight: bold;">Try again</a>
        </body></html>
      `);
    }
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM ${getTableName('users')} 
         WHERE email_verification_token = $1 
         AND email_verified_at IS NULL 
         AND user_type LIKE '%pending%'`,
        [token]
      );
      
      if (result.rows.length === 0) {
        return res.status(400).send(`
          <html><body style="text-align: center; padding: 2rem; font-family: Arial;">
            <h1 style="color: #dc2626;">❌ Invalid or Expired Link</h1>
            <p>This verification link has expired or already been used.</p>
            <a href="/register" style="color: #16a34a; text-decoration: none; font-weight: bold;">Create new account</a>
          </body></html>
        `);
      }
      
      const user = result.rows[0];
      
      // Check if verification token has expired
      const tokenExpiry = user.settings?.verificationTokenExpires;
      if (tokenExpiry && new Date() > new Date(tokenExpiry)) {
        return res.status(400).send(`
          <html><body style="text-align: center; padding: 2rem; font-family: Arial;">
            <h1 style="color: #dc2626;">⏰ Link Expired</h1>
            <p>This verification link has expired. Please create a new account.</p>
            <a href="/register" style="color: #16a34a; text-decoration: none; font-weight: bold;">Create new account</a>
          </body></html>
        `);
      }
      
      // ACTIVATE THE ACCOUNT
      let newUserType, newSubscriptionTier;
      
      if (user.user_type === 'free_pending_verification') {
        newUserType = 'free';
        newSubscriptionTier = 'FREE';
      } else if (user.user_type === 'professional_pending_verification') {
        newUserType = 'professional_pending';
        newSubscriptionTier = 'PROFESSIONAL_PENDING';
      } else if (user.user_type === 'business_pending_verification') {
        newUserType = 'business_pending';
        newSubscriptionTier = 'BUSINESS_PENDING';
      } else if (user.user_type === 'enterprise_pending_verification') {
        newUserType = 'enterprise_pending';
        newSubscriptionTier = 'ENTERPRISE_PENDING';
      } else if (user.user_type === 'professional_trial_pending') {
        newUserType = 'professional_trial';
        newSubscriptionTier = 'PROFESSIONAL_TRIAL';
      } else {
        // Fallback for any other pending types
        newUserType = 'free';
        newSubscriptionTier = 'FREE';
      }
      
      await client.query(
        `UPDATE ${getTableName('users')} 
         SET user_type = $1,
             subscription_tier = $2,
             email_verified_at = NOW(), 
             email_verification_token = NULL,
             settings = settings || $3,
             updated_at = NOW()
         WHERE id = $4`,
        [
          newUserType,
          newSubscriptionTier,
          JSON.stringify({ 
            verificationCompleted: true,
            pendingVerification: false
          }),
          user.id
        ]
      );
      
      // Create JWT and set cookie for automatic login
      const authToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          userType: newUserType
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const cookieConfig = getCookieConfig();
      res.cookie('authToken', authToken, cookieConfig);
      res.cookie('isLoggedIn', 'true', { ...cookieConfig, httpOnly: false });
      
      console.log(`✅ Account verified and activated: ${user.email}`);
      
      // Success page with redirect
      const isPaidPlan = newUserType.includes('_pending');
      const isTrial = newUserType === 'professional_trial';
      let message;
      
      if (isTrial) {
        message = 'Welcome to your 14-day Professional trial! Your account is now active.';
      } else if (isPaidPlan) {
        message = 'Email verified! Complete your upgrade in the dashboard.';
      } else {
        message = 'Welcome to SteadyManager! Your account is now active.';
      }
      
      res.send(`
        <html><body style="text-align: center; padding: 2rem; font-family: Arial; background: #f0fdf4;">
          <h1 style="color: #16a34a;">✅ Email Verified!</h1>
          <p style="font-size: 1.1rem; margin-bottom: 2rem;">${message}</p>
          <p>Redirecting to dashboard in <span id="countdown">3</span> seconds...</p>
          <a href="/dashboard" style="display: inline-block; background: #16a34a; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 1rem;">
            Go to Dashboard →
          </a>
          <script>
            let count = 3;
            setInterval(() => {
              count--;
              document.getElementById('countdown').textContent = count;
              if (count === 0) window.location.href = '/dashboard';
            }, 1000);
          </script>
        </body></html>
      `);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Account verification error:', error.message);
    res.status(500).send(`
      <html><body style="text-align: center; padding: 2rem; font-family: Arial;">
        <h1 style="color: #dc2626;">❌ Verification Failed</h1>
        <p>Something went wrong. Please try again.</p>
        <a href="/register">Create new account</a>
      </body></html>
    `);
  }
});

// 🔐 TRIAL-SPECIFIC VERIFICATION (for backward compatibility)
app.get('/verify-trial', async (req, res) => {
  // Redirect to the main verification endpoint
  return res.redirect(`/verify-account?token=${req.query.token}`);
});

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
      
      // Check if account is still pending verification
      if (user.user_type.includes('pending') && user.settings?.pendingVerification) {
        return res.status(400).json({ 
          error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
          requiresVerification: true
        });
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

// =============================================
// 💳 STRIPE & BILLING ENDPOINTS
// =============================================

// 💳 STRIPE CHECKOUT SESSION
app.post('/api/create-checkout-session', 
  authenticateFromCookie,
  [
    body('plan').isIn([
      'professional_monthly', 'professional_yearly',
      'business_monthly', 'business_yearly', 
      'enterprise_monthly', 'enterprise_yearly'
    ]).withMessage('Invalid plan'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { plan } = req.body;
      
      const user = await findUserById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const planConfig = PRICING_PLANS[plan];
      if (!planConfig || !planConfig.priceId) {
        return res.status(400).json({ error: 'Invalid plan configuration' });
      }
      
      const upgradeValidation = validateUpgradePath(user.user_type, planConfig.userType);
      if (!upgradeValidation.valid) {
        return res.status(400).json({ 
          error: upgradeValidation.message,
          currentTier: user.subscription_tier,
          availableUpgrades: getAvailableUpgradesForTier(user.user_type)
        });
      }
      
      let customerId = user.stripe_customer_id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id.toString() }
        });
        customerId = customer.id;
        
        const client = await pool.connect();
        try {
          await client.query(
            `UPDATE ${getTableName('users')} SET stripe_customer_id = $1 WHERE id = $2`,
            [customerId, user.id]
          );
        } finally {
          client.release();
        }
        
        console.log(`💳 Created Stripe customer for ${user.email}: ${customerId}`);
      }
      
      const baseUrl = isDevelopment 
        ? process.env.DEV_BASE_URL || 'http://localhost:3000'
        : 'https://steadymanager.com';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [{ price: planConfig.priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/dashboard?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/dashboard?cancelled=true`,
        metadata: { 
          plan, 
          email: user.email, 
          userId: user.id.toString(),
          previousTier: user.user_type,
          tier: planConfig.userType,
          environment: isDevelopment ? 'development' : 'production' 
        },
        subscription_data: {
          metadata: {
            userId: user.id.toString(),
            previousSubscription: user.stripe_subscription_id || 'none'
          }
        }
      });
      
      console.log(`💳 Checkout created: ${user.email} (${user.user_type} → ${planConfig.userType})`);
      res.json({ sessionId: session.id, url: session.url });
      
    } catch (error) {
      console.error('Checkout creation error:', error.message);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  }
);

// 🔥 Stripe webhook handler
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
        const email = session.metadata.email;
        const plan = session.metadata.plan;
        const userId = session.metadata.userId;
        const previousTier = session.metadata.previousTier;
        
        const planConfig = PRICING_PLANS[plan];
        if (!planConfig) {
          console.error(`❌ Unknown plan in webhook: ${plan}`);
          break;
        }
        
        console.log(`💰 Payment successful: ${email} (${previousTier} → ${planConfig.userType})`);
        
        const checkoutClient = await pool.connect();
        try {
          await checkoutClient.query(
            `UPDATE ${getTableName('users')} 
             SET user_type = $1, 
                 subscription_tier = $2, 
                 billing_cycle = $3, 
                 monthly_lead_limit = $4, 
                 stripe_customer_id = $5, 
                 stripe_subscription_id = $6,
                 subscription_start_date = NOW(),
                 settings = settings || $7,
                 updated_at = NOW()
             WHERE id = $8`,
            [
              planConfig.userType, 
              planConfig.name.toUpperCase(),
              plan.includes('yearly') ? 'yearly' : 'monthly',
              planConfig.leadLimit, 
              session.customer,
              subscription.id,
              JSON.stringify({
                upgradeDate: new Date().toISOString(),
                previousTier: previousTier,
                plan: plan,
                subscriptionTier: planConfig.name.toUpperCase()
              }),
              userId
            ]
          );
          
          console.log(`✅ User upgraded: ${email} (${previousTier} → ${planConfig.userType})`);
          
        } finally {
          checkoutClient.release();
        }
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        
        if (updatedSubscription.status === 'unpaid' || updatedSubscription.status === 'canceled') {
          const customer = await stripe.customers.retrieve(updatedSubscription.customer);
          
          console.log(`⬇️ Downgrading ${customer.email} - Status: ${updatedSubscription.status}`);
          
          const updateClient = await pool.connect();
          try {
            await updateClient.query(
              `UPDATE ${getTableName('users')} 
               SET user_type = 'free', subscription_tier = 'FREE', 
                   billing_cycle = NULL, monthly_lead_limit = 50, 
                   settings = settings || $1, updated_at = NOW()
               WHERE stripe_customer_id = $2`,
              [
                JSON.stringify({ 
                  downgradedDate: new Date().toISOString(),
                  reason: updatedSubscription.status 
                }),
                customer.id
              ]
            );
          } finally {
            updateClient.release();
          }
        }
        break;
        
      case 'customer.subscription.deleted':
        const cancelledSubscription = event.data.object;
        const cancelCustomer = await stripe.customers.retrieve(cancelledSubscription.customer);
        
        console.log(`🗑️ Subscription cancelled: ${cancelCustomer.email}`);
        
        const deleteClient = await pool.connect();
        try {
          await deleteClient.query(
            `UPDATE ${getTableName('users')} 
             SET user_type = 'free', subscription_tier = 'FREE', 
                 billing_cycle = NULL, monthly_lead_limit = 50,
                 stripe_subscription_id = NULL,
                 settings = settings || $1, updated_at = NOW()
             WHERE stripe_customer_id = $2`,
            [
              JSON.stringify({ 
                downgradedDate: new Date().toISOString(),
                reason: 'cancelled' 
              }),
              cancelCustomer.id
            ]
          );
        } finally {
          deleteClient.release();
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

// =============================================
// 🆓 FREE TIER - CORE CRUD ENDPOINTS
// =============================================

// 📋 Get leads
app.get('/api/leads', authenticateFromCookie, async (req, res) => {
  try {
    const userLeads = await getUserLeads(req.user.userId, req.user.isAdmin, req.query.viewAll === 'true');
    
    const categorizedLeads = {
      cold: userLeads.filter(lead => lead.type === 'cold'),
      warm: userLeads.filter(lead => lead.type === 'warm'),
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
  // Remove email validation entirely - let it be whatever
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
        type: req.body.type,
        notes: req.body.notes,
        qualityScore: req.body.qualityScore || 5,
        potentialValue: req.body.potentialValue || 0,
        followUpDate: req.body.followUpDate,
        linkedin_url: req.body.linkedin_url,
        facebook_url: req.body.facebook_url,
        twitter_url: req.body.twitter_url,
        instagram_url: req.body.instagram_url,
        website: req.body.website
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
        const leadResult = await client.query(
          `SELECT * FROM ${getTableName('leads')} WHERE id = $1`,
          [leadId]
        );
        
        if (leadResult.rows.length === 0) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        
        const currentLead = leadResult.rows[0];
        
        if (!req.user.isAdmin && currentLead.user_id !== req.user.userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        const allowedFields = ['name', 'email', 'phone', 'company', 'platform', 'status', 'type', 
  'notes', 'quality_score', 'potential_value', 'follow_up_date',
  'dealValue', 'lost_reason'];

        for (const field of allowedFields) {
          if (req.body.hasOwnProperty(field)) {
            updateFields.push(`${field} = $${paramCount}`);
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
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const updateResult = await client.query(updateQuery, updateValues);
        const updatedLead = updateResult.rows[0];
        
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

// 👤 User profile endpoint
app.get('/api/user/profile', authenticateFromCookie, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      subscriptionTier: user.subscription_tier,
      billingCycle: user.billing_cycle,
      isAdmin: user.is_admin,
      monthlyLeadLimit: user.monthly_lead_limit,
      currentMonthLeads: user.current_month_leads,
      goals: user.goals,
      settings: user.settings,
      onboardingCompleted: user.onboarding_completed,
      lastLogin: user.last_login,
      createdAt: user.created_at
    });
    
  } catch (error) {
    console.error('Get user profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
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

// 📅 TASKS/REMINDERS
app.post('/api/tasks', 
  authenticateFromCookie,
  [
    body('title').notEmpty().withMessage('Title required'),
    body('leadId').optional().isInt().withMessage('Valid lead ID required'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `INSERT INTO ${getTableName('tasks')} 
           (user_id, lead_id, title, description, due_date, task_type, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [
            req.user.userId,
            req.body.leadId || null,
            req.body.title,
            req.body.description || req.body.notes || '',
            req.body.dueDate || req.body.date,
            req.body.type || 'follow_up',
            'pending'
          ]
        );
        
        console.log(`✅ Task created: ${req.body.title} by user ${req.user.userId}`);
        res.status(201).json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Create task error:', error.message);
      res.status(500).json({ error: 'Failed to create task' });
    }
  }
);

app.get('/api/tasks', authenticateFromCookie, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      let query = `SELECT * FROM ${getTableName('tasks')} WHERE user_id = $1`;
      const params = [req.user.userId];
      
      if (req.query.status) {
        query += ` AND status = $2`;
        params.push(req.query.status);
      }
      if (req.query.type) {
        query += ` AND task_type = ${params.length + 1}`;
        params.push(req.query.type);
      }
      
      query += ` ORDER BY due_date ASC, created_at DESC`;
      
      const result = await client.query(query, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get tasks error:', error.message);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// 📅 UPDATE TASK ENDPOINT - ADD THIS TO YOUR SERVER.JS
app.put('/api/tasks/:id', 
  authenticateFromCookie,
  [validateNumericId, handleValidationErrors],
  async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const client = await pool.connect();
      
      try {
        // Check if task exists and user owns it
        const taskResult = await client.query(
          `SELECT * FROM ${getTableName('tasks')} WHERE id = $1`,
          [taskId]
        );
        
        if (taskResult.rows.length === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }
        
        const task = taskResult.rows[0];
        if (!req.user.isAdmin && task.user_id !== req.user.userId) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Update the task - simple and clean
        const result = await client.query(
          `UPDATE ${getTableName('tasks')} 
           SET status = COALESCE($1, status),
               completion_notes = COALESCE($2, completion_notes),
               due_date = COALESCE($3, due_date),
               completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
               updated_at = NOW()
           WHERE id = $4 
           RETURNING *`,
          [req.body.status, req.body.completion_notes, req.body.due_date, taskId]
        );
        
        console.log(`✅ Task updated: ${taskId} by user ${req.user.userId}`);
        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Update task error:', error.message);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

// 🎯 GET SINGLE LEAD
app.get('/api/leads/:id', 
  authenticateFromCookie,
  [validateNumericId, handleValidationErrors],
  async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          `SELECT * FROM ${getTableName('leads')} WHERE id = $1 AND user_id = $2`,
          [leadId, req.user.userId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        
        res.json(result.rows[0]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Get lead error:', error.message);
      res.status(500).json({ error: 'Failed to fetch lead' });
    }
  }
);

// 🔍 Search leads
app.post('/api/leads/search', 
  authenticateFromCookie,
  [
    body('query').notEmpty().trim().withMessage('Search query required'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { query } = req.body;
      const client = await pool.connect();
      
      try {
        const searchQuery = `
          SELECT * FROM ${getTableName('leads')} 
          WHERE user_id = $1 
          AND (
            name ILIKE $2 OR 
            email ILIKE $2 OR 
            company ILIKE $2 OR 
            notes ILIKE $2
          )
          ORDER BY created_at DESC
          LIMIT 50
        `;
        
        const searchPattern = `%${query}%`;
        const result = await client.query(searchQuery, [req.user.userId, searchPattern]);
        
        res.json({ 
          success: true, 
          results: result.rows,
          query: query,
          count: result.rows.length 
        });
        
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Search leads error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Search failed',
        results: [] 
      });
    }
  }
);

// 🎯 GET AVAILABLE UPGRADES FOR CURRENT USER
app.get('/api/available-upgrades', authenticateFromCookie, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const availablePlans = getAvailableUpgradesForTier(user.user_type);
    
    if (availablePlans.length === 0) {
      return res.json({
        hasUpgrades: false,
        currentTier: user.subscription_tier,
        message: user.user_type === 'enterprise' ? 
          'You have the highest tier available!' : 
          'No upgrades available for your account type.'
      });
    }
    
    const upgradeOptions = availablePlans.map(planId => {
      const plan = PRICING_PLANS[planId];
      return {
        id: planId,
        name: plan.name,
        userType: plan.userType,
        leadLimit: plan.leadLimit,
        features: plan.features,
        isYearly: planId.includes('yearly')
      };
    });
    
    res.json({
      hasUpgrades: true,
      currentTier: user.subscription_tier,
      currentUserType: user.user_type,
      availableUpgrades: upgradeOptions
    });
    
  } catch (error) {
    console.error('Get available upgrades error:', error.message);
    res.status(500).json({ error: 'Failed to fetch available upgrades' });
  }
});

// =============================================
// 💼 PRO TIER ENDPOINTS - ANALYTICS & GOALS
// =============================================
// 📊 ADD FUTURE ANALYTICS HERE
// 🎯 ADD FUTURE GOALS HERE
// 🏷️ ADD FUTURE TAGS HERE

// =============================================
// 🏢 BUSINESS TIER ENDPOINTS - TEAM FEATURES  
// =============================================
// 👥 ADD FUTURE TEAM MANAGEMENT HERE
// 🤖 ADD FUTURE AUTOMATION HERE

// =============================================
// ⭐ ENTERPRISE TIER ENDPOINTS - ADVANCED
// =============================================
// 📊 ADD FUTURE CUSTOM REPORTS HERE
// 🔗 ADD FUTURE API KEYS HERE

// =============================================
// 👑 ADMIN TIER ENDPOINTS - SYSTEM CONTROL
// =============================================
// 👤 ADD FUTURE USER MANAGEMENT HERE
// 💰 ADD FUTURE BILLING ANALYTICS HERE
// 🔄 ADD FUTURE TIER SWITCHING HERE

// 🏥 Health check endpoint
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
          'email-verification',
          'stripe-billing',
          'multi-tier-pricing',
          'password-reset',
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
          rateLimit: true,
          emailVerification: true
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

// Auth routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth', 'register.html'));
});

app.get('/trial', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth', 'trial.html'));
});

// Static page routes  
const staticPages = ['pricing', 'features', 'about', 'contact', 'privacy', 'terms'];
staticPages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', `${page}.html`));
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
      console.log(`   ✅ Email verification for all new accounts`);
      console.log(`   ✅ HTTP-only cookies prevent XSS`);
      console.log(`   ✅ CSRF protection on state-changing operations`);
      console.log(`   ✅ Security headers (XSS, clickjacking, etc.)`);
      console.log(`   ✅ Content Security Policy for dashboard`);
      console.log(`   ✅ Flexible rate limiting:`);
      console.log(`      • Login: 10 attempts per minute`);
      console.log(`      • Registration: 5 attempts per 15 minutes`);
      console.log(`      • Password reset: 5 attempts per 5 minutes`);
      console.log(`      • Email verification: 5 per hour per email`);
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
      console.log(`📧 EMAIL VERIFICATION SYSTEM:`);
      console.log(`   • All new accounts require email verification`);
      console.log(`   • Separate verification flows for trials and regular accounts`);
      console.log(`   • Automatic login after successful verification`);
      console.log(`   • Rate limiting prevents spam`);
      
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
      } else {
        console.log(`👑 Admin emails configured: ${ADMIN_EMAILS.length}`);
      }
      
      if (!emailTransporter) {
        console.warn(`⚠️  WARNING: Email not configured! Verification links will be logged to console.`);
        console.warn(`   To enable emails, add these to your .env file:`);
        console.warn(`   EMAIL_HOST=smtp.sendgrid.net`);
        console.warn(`   EMAIL_PORT=587`);
        console.warn(`   EMAIL_USER=apikey`);
        console.warn(`   EMAIL_PASS=your-sendgrid-api-key`);
        console.warn(`   EMAIL_FROM=josh@steadyscaling.com`);
      } else {
        console.log(`✅ Email system configured and ready!`);
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
      console.log(`   • POST /api/register - Register new account (with email verification)`);
      console.log(`   • POST /api/start-trial - Start free trial (with email verification)`);
      console.log(`   • POST /api/resend-verification - Resend verification email`);
      console.log(`   • GET /verify-account - Verify email address`);
      console.log(`   • POST /api/forgot-password - Request password reset`);
      console.log(`   • POST /api/reset-password - Reset password with token`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();