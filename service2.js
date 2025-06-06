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

// 🔥 NEW: Database initialization
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

    // Create leads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${getTableName('leads')} (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES ${getTableName('users')}(id) ON DELETE CASCADE,
        user_type VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        platform VARCHAR(100),
        status VARCHAR(100) DEFAULT 'New lead',
        type VARCHAR(20) DEFAULT 'cold',
        notes TEXT,
        quality_score INTEGER DEFAULT 5,
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

    console.log(`✅ Database initialized with tables: ${getTableName('users')}, ${getTableName('leads')}, ${getTableName('counters')}`);
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

async function createLead(leadData) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO ${getTableName('leads')} 
       (user_id, user_type, name, email, phone, company, platform, status, type, notes, quality_score) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        leadData.userId,
        leadData.userType,
        leadData.name,
        leadData.email,
        leadData.phone,
        leadData.company,
        leadData.platform,
        leadData.status,
        leadData.type,
        leadData.notes,
        leadData.qualityScore
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

// Auth middleware
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
      crm: userLeads.filter(lead => lead.type === 'crm')
    };
    
    res.json(categorizedLeads);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create lead
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

    const { 
      name, email, phone, company, platform, status = 'New lead', 
      type = 'cold', notes, qualityScore = 5 
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const leadData = {
      userId: req.user.userId,
      userType: req.user.userType,
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      platform: platform || null,
      status,
      type,
      notes: notes || null,
      qualityScore: qualityScore || 5
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

// Update lead
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

      const { 
        name, email, phone, company, platform, status, type, notes, qualityScore 
      } = req.body;

      // Update lead
      const updateResult = await client.query(
        `UPDATE ${getTableName('leads')} 
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             company = COALESCE($4, company),
             platform = COALESCE($5, platform),
             status = COALESCE($6, status),
             type = COALESCE($7, type),
             notes = COALESCE($8, notes),
             quality_score = COALESCE($9, quality_score),
             updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [name, email, phone, company, platform, status, type, notes, qualityScore, leadId]
      );

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
    
    const avgQualityScore = userLeads.length > 0 
      ? userLeads.reduce((sum, lead) => sum + (lead.quality_score || 5), 0) / userLeads.length 
      : 0;
    
    res.json({
      totalLeads,
      coldLeads,
      warmLeads,
      crmLeads,
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      platformStats,
      statusStats,
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
        features: ['postgresql-storage', 'authentication', 'lead-management', 'admin-mode'],
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

// HTML Page Routes
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

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
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
      console.log(`✨ Ready for testing!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();