require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin emails - YOUR GOD MODE! 👑
const ADMIN_EMAILS = [
  'your@email.com',                    // Replace with your actual email
  'admin@steadyleadflow.com'
];

// Body parsing
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize simple database
async function initDatabase() {
  try {
    // Admin users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        monthly_lead_limit INTEGER DEFAULT NULL,
        current_month_leads INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Client users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_v1_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        monthly_lead_limit INTEGER DEFAULT 1000,
        current_month_leads INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Leads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        platform VARCHAR(100),
        status VARCHAR(100) DEFAULT 'New lead',
        type VARCHAR(20) DEFAULT 'cold',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created');
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

initDatabase();

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const isAdmin = ADMIN_EMAILS.includes(email);
    
    let result;
    if (isAdmin) {
      result = await pool.query(
        'INSERT INTO admin_users (email, password) VALUES ($1, $2) RETURNING id, email',
        [email, hashedPassword]
      );
    } else {
      result = await pool.query(
        'INSERT INTO client_v1_users (email, password) VALUES ($1, $2) RETURNING id, email',
        [email, hashedPassword]
      );
    }

    const user = result.rows[0];
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        userType: isAdmin ? 'admin' : 'client_v1'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: isAdmin ? 'Admin account created! 👑' : 'Account created!',
      token,
      user: { id: user.id, email: user.email, isAdmin }
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
    
    // Check admin table first
    let result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    let isAdmin = true;
    let userType = 'admin';
    
    // If not admin, check client table
    if (result.rows.length === 0) {
      result = await pool.query('SELECT * FROM client_v1_users WHERE email = $1', [email]);
      isAdmin = false;
      userType = 'client_v1';
    }
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        userType
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: isAdmin ? 'Welcome back, Admin! 👑' : 'Welcome back!',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        isAdmin,
        monthlyLeadLimit: user.monthly_lead_limit,
        currentMonthLeads: user.current_month_leads
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
    let leads;
    
    if (req.user.isAdmin) {
      // Admin can see all leads
      const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
      leads = result.rows;
    } else {
      // Regular users see only their leads
      const result = await pool.query(
        'SELECT * FROM leads WHERE user_id = $1 AND user_type = $2 ORDER BY created_at DESC',
        [req.user.userId, req.user.userType]
      );
      leads = result.rows;
    }
    
    const categorizedLeads = {
      cold: leads.filter(lead => lead.type === 'cold'),
      warm: leads.filter(lead => lead.type === 'warm'),
      crm: leads.filter(lead => lead.type === 'crm')
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
      const result = await pool.query(
        'SELECT current_month_leads, monthly_lead_limit FROM client_v1_users WHERE id = $1',
        [req.user.userId]
      );
      
      if (result.rows.length > 0) {
        const { current_month_leads, monthly_lead_limit } = result.rows[0];
        
        if (current_month_leads >= monthly_lead_limit) {
          return res.status(403).json({ 
            error: `Monthly lead limit reached (${monthly_lead_limit}). Upgrade to add more!`,
            limitReached: true
          });
        }
      }
    }

    const { name, email, phone, company, platform, status, type, notes } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Insert lead
    const result = await pool.query(`
      INSERT INTO leads (user_id, user_type, name, email, phone, company, platform, status, type, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      req.user.userId, req.user.userType, name, email, phone, company, platform, status, type, notes
    ]);
    
    // Increment lead count for non-admin users
    if (!req.user.isAdmin) {
      await pool.query(
        'UPDATE client_v1_users SET current_month_leads = current_month_leads + 1 WHERE id = $1',
        [req.user.userId]
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update lead
app.put('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, platform, status, type, notes } = req.body;

    // Check if lead belongs to user (admins can edit any lead)
    let leadCheck;
    if (req.user.isAdmin) {
      leadCheck = await pool.query('SELECT id FROM leads WHERE id = $1', [id]);
    } else {
      leadCheck = await pool.query(
        'SELECT id FROM leads WHERE id = $1 AND user_id = $2 AND user_type = $3',
        [id, req.user.userId, req.user.userType]
      );
    }

    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const result = await pool.query(`
      UPDATE leads SET name = $1, email = $2, phone = $3, company = $4, 
                       platform = $5, status = $6, type = $7, notes = $8
      WHERE id = $9 RETURNING *
    `, [name, email, phone, company, platform, status, type, notes, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete lead
app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    let leadCheck;
    if (req.user.isAdmin) {
      leadCheck = await pool.query('SELECT user_id, user_type FROM leads WHERE id = $1', [id]);
    } else {
      leadCheck = await pool.query(
        'SELECT user_id, user_type FROM leads WHERE id = $1 AND user_id = $2 AND user_type = $3',
        [id, req.user.userId, req.user.userType]
      );
    }

    if (leadCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadCheck.rows[0];

    // Delete lead
    await pool.query('DELETE FROM leads WHERE id = $1', [id]);

    // Decrement lead count for non-admin users
    if (lead.user_type !== 'admin') {
      await pool.query(
        'UPDATE client_v1_users SET current_month_leads = GREATEST(current_month_leads - 1, 0) WHERE id = $1',
        [lead.user_id]
      );
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const clientCount = await pool.query('SELECT COUNT(*) FROM client_v1_users');
    const adminCount = await pool.query('SELECT COUNT(*) FROM admin_users');
    const totalLeads = await pool.query('SELECT COUNT(*) FROM leads');
    
    const monthlyRevenue = clientCount.rows[0].count * 6.99;
    
    res.json({
      users: {
        clients: parseInt(clientCount.rows[0].count),
        admins: parseInt(adminCount.rows[0].count),
        total: parseInt(clientCount.rows[0].count) + parseInt(adminCount.rows[0].count)
      },
      leads: {
        total: parseInt(totalLeads.rows[0].count)
      },
      revenue: {
        monthly: monthlyRevenue,
        annual: monthlyRevenue * 12
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    features: ['authentication', 'lead-management', 'admin-mode']
  });
});

// Basic routes for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'SteadyLeadFlow API is running! 🚀',
    endpoints: [
      'POST /api/register',
      'POST /api/login', 
      'GET /api/leads',
      'POST /api/leads',
      'PUT /api/leads/:id',
      'DELETE /api/leads/:id',
      'GET /api/admin/stats (admin only)',
      'GET /api/health'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SteadyLeadFlow server running on port ${PORT}`);
  console.log(`👑 Admin emails: ${ADMIN_EMAILS.join(', ')}`);
  console.log(`✨ API ready for testing!`);
});