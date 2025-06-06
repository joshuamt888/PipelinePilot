require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 NEW: PostgreSQL connection with environment-based tables
const isDevelopment = process.env.NODE_ENV !== 'production';
const tablePrefix = isDevelopment ? 'dev_' : '';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 🔥 NEW: Helper function for table names
function getTableName(baseName) {
  return `${tablePrefix}${baseName}`;
}

// 🔥 NEW: Database initialization with ENHANCED PIPELINE FEATURES
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 🚀 ENHANCED LEADS TABLE with ALL THE PIPELINE GOODNESS
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('leads')} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${getTableName('users')}(id) ON DELETE CASCADE,
        user_type VARCHAR(50),
        
        -- Basic Lead Info (for AddLead.jsx)
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        platform VARCHAR(100),
        status VARCHAR(100) DEFAULT 'New lead',
        type VARCHAR(20) DEFAULT 'cold',
        notes TEXT,
        quality_score INTEGER DEFAULT 5,
        
        -- 🔥 Pain Points & Needs
        pain_points TEXT,
        budget_range VARCHAR(50),
        decision_maker BOOLEAN,
        urgency_level VARCHAR(50),
        
        -- 📞 Communication History
        contact_attempts INTEGER DEFAULT 0,
        best_contact_time VARCHAR(50),
        response_rate VARCHAR(50),
        
        -- 🤝 Relationship Building
        referral_source VARCHAR(255),
        social_media_profile TEXT,
        personal_notes TEXT,
        competitors_mentioned TEXT,
        
        -- 💼 Business Intel
        company_size VARCHAR(50),
        current_solution TEXT,
        timeline VARCHAR(100),
        obstacles TEXT,
        
        -- 🎯 Conversion Tracking
        lead_source_detail TEXT,
        conversion_probability INTEGER,
        next_milestone VARCHAR(255),
        
        -- ⏰ Scheduling/Timeline
        temperature VARCHAR(20),
        potential_value INTEGER,
        follow_up_date DATE,
        last_contact_date DATE,
        preferred_contact VARCHAR(50),
        meeting_location TEXT,
        pipeline_stage VARCHAR(100),
        
        -- 📈 Sales Process
        sales_stage VARCHAR(100),
        quote_amount DECIMAL(10,2),
        close_date DATE,
        lost_reason VARCHAR(255),
        probability_percentage INTEGER,
        
        -- 🎯 Marketing Attribution
        campaign_source VARCHAR(255),
        utm_source VARCHAR(255),
        first_touch_date DATE,
        lead_magnet VARCHAR(255),
        
        -- 📊 Engagement Tracking
        engagement_score INTEGER DEFAULT 0,
        last_activity_type VARCHAR(100),
        total_interactions INTEGER DEFAULT 0,
        website_visits INTEGER DEFAULT 0,
        
        -- 🔔 Follow-up Management
        reminder_frequency VARCHAR(50),
        auto_follow_up BOOLEAN DEFAULT false,
        snooze_until DATE,
        priority_level VARCHAR(20),
        
        -- 🏷️ Tags & Categories
        tags TEXT,
        lead_category VARCHAR(100),
        vertical VARCHAR(100),
        deal_size_category VARCHAR(50),
        
        -- 🤖 Automation Ready
        automation_sequence VARCHAR(255),
        email_sequence_step INTEGER,
        opt_in_status BOOLEAN DEFAULT true,
        unsubscribed BOOLEAN DEFAULT false,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create counters table for ID generation
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('counters')} (
        name VARCHAR(50) PRIMARY KEY,
        value INTEGER DEFAULT 1
      )
    `);

    // Initialize counters if they don't exist
    await client.query(`
      INSERT INTO ${getTableName('counters')} (name, value) 
      VALUES ('user_id', 1), ('lead_id', 1)
      ON CONFLICT (name) DO NOTHING
    `);

    console.log(`✅ Database initialized with ENHANCED tables: ${getTableName('users')}, ${getTableName('leads')}, ${getTableName('counters')}`);
    console.log(`🚀 Pipeline features: 40+ tracking fields ready!`);
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  } finally {
    client.release();
  }
}

// 🔥 NEW: Database helper functions
async function findUserByEmail(email) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM ${getTableName('users')} WHERE email = $1`,
      [email]
    );
    return result.rows[0];
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
        userData.email,
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
  } finally {
    client.release();
  }
}

// 🚀 ENHANCED createLead function to handle ALL the new fields
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
        leadData.userId, leadData.userType, leadData.name, leadData.email, leadData.phone,
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
  } finally {
    client.release();
  }
}

async function incrementUserLeadCount(userId) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE ${getTableName('users')} 
       SET current_month_leads = current_month_leads + 1 
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
       SET current_month_leads = GREATEST(current_month_leads - 1, 0) 
       WHERE id = $1`,
      [userId]
    );
  } finally {
    client.release();
  }
}

// Admin emails - YOUR GOD MODE! 👑
const ADMIN_EMAILS = [
  'your@email.com',                    // Replace with your actual email
  'admin@steadyleadflow.com'
];

// Body parsing and static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔒 NEW: Route protection middleware
const protectRoute = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    req.user.isAdmin = ADMIN_EMAILS.includes(decoded.email);
    next();
  } catch (err) {
    return res.redirect('/login');
  }
};

// Auth middleware (for API routes)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    req.user.isAdmin = ADMIN_EMAILS.includes(decoded.email);
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};

// ROUTES

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = ADMIN_EMAILS.includes(email);
    
    const userData = {
      email,
      password: hashedPassword,
      userType: isAdmin ? 'admin' : 'client_v1',
      isAdmin,
      monthlyLeadLimit: isAdmin ? null : 1000,
      currentMonthLeads: 0,
      goals: {
        daily: isAdmin ? 999999 : 10,
        weekly: isAdmin ? 999999 : 50,
        monthly: isAdmin ? 999999 : 200
      },
      settings: {
        darkMode: false,
        notifications: true
      }
    };

    const newUser = await createUser(userData);

    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        userType: newUser.user_type
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

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
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        userType: user.user_type
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: user.is_admin ? 'Welcome back, Admin! 👑' : 'Welcome back!',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        isAdmin: user.is_admin,
        userType: user.user_type,
        monthlyLeadLimit: user.monthly_lead_limit,
        currentMonthLeads: user.current_month_leads,
        goals: user.goals,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leads
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const userLeads = await getUserLeads(req.user.userId, req.user.isAdmin, req.query.viewAll === 'true');
    
    const categorizedLeads = {
      cold: userLeads.filter(lead => lead.type === 'cold'),
      warm: userLeads.filter(lead => lead.type === 'warm'),
      crm: userLeads.filter(lead => lead.type === 'crm'),
      all: userLeads // For Dashboard.jsx
    };
    
    res.json(categorizedLeads);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🚀 ENHANCED Create lead endpoint (simplified for AddLead.jsx, advanced for Pipeline.jsx)
app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    // Check lead limits for non-admin users
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

    // Basic fields (required for AddLead.jsx)
    const { 
      name, email, phone, company, platform, status = 'New lead', 
      type = 'cold', notes, qualityScore = 5 
    } = req.body;

    // Extended fields (optional for Pipeline.jsx)
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

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

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
    
    res.status(201).json(newLead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 🚀 ENHANCED Update lead endpoint for Pipeline.jsx
app.put('/api/leads/:id', authenticateToken, async (req, res) => {
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
      
      // Check if lead belongs to user (admins can edit any lead)
      if (!req.user.isAdmin && lead.user_id !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Build dynamic update query based on provided fields
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
          updateFields.push(`${field} = $${paramCount}`);
          updateValues.push(req.body[field]);
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
      res.json(updateResult.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete lead
app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
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
      
      // Check if lead belongs to user (admins can delete any lead)
      if (!req.user.isAdmin && lead.user_id !== req.user.userId) {
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

      res.json({ message: 'Lead deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user statistics
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

    // NEW: Pipeline stage stats
    const pipelineStats = {};
    userLeads.forEach(lead => {
      if (lead.pipeline_stage) {
        pipelineStats[lead.pipeline_stage] = (pipelineStats[lead.pipeline_stage] || 0) + 1;
      }
    });

    // NEW: Temperature stats
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
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
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
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User settings
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
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/user/settings', authenticateToken, async (req, res) => {
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
         SET goals = $1, settings = $2 
         WHERE id = $3 
         RETURNING *`,
        [JSON.stringify(updatedGoals), JSON.stringify(updatedSettings), req.user.userId]
      );
      
      res.json({ message: 'Settings updated successfully', user: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
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
        features: ['postgresql-storage', 'authentication', 'lead-management', 'admin-mode', 'pipeline-tracking'],
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
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// 🔒 PROTECTED ROUTES - All dashboard components require authentication
const protectedRoutes = ['/dashboard', '/add-lead', '/pipeline', '/schedule', '/settings', '/admin'];

protectedRoutes.forEach(route => {
  app.get(route, protectRoute, (req, res) => {
    if (route === '/admin' && !req.user.isAdmin) {
      return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
  });
});

// HTML Page Routes (Public routes) - These need to be .html files that load React
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'index.html')); // ✅ .html not .jsx
});

app.get('/login/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'forgot-password.html')); // ✅ .html
});

app.get('/login/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'reset-password.html')); // ✅ .html
});

app.get('/login/email-confirmation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login', 'email-confirmation.html')); // ✅ .html
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

// Catch-all for 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', '404.html'));
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SteadyLeadFlow server running on port ${PORT}`);
      console.log(`🔧 Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`);
      console.log(`🗄️  Database tables: ${tablePrefix ? tablePrefix + '*' : 'production tables'}`);
      console.log(`👑 Admin emails: ${ADMIN_EMAILS.join(', ')}`);
      console.log(`🔒 Protected routes: ${protectedRoutes.join(', ')}`);
      console.log(`🚀 Pipeline features: 40+ tracking fields enabled!`);
      console.log(`✨ Ready for testing!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();