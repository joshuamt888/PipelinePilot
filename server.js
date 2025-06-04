const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Trust proxy for Railway
app.set('trust proxy', 1);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        daily_goal INTEGER DEFAULT 5,
        weekly_goal INTEGER DEFAULT 35,
        monthly_goal INTEGER DEFAULT 150,
        dark_mode BOOLEAN DEFAULT false,
        notifications BOOLEAN DEFAULT true
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        company VARCHAR(255),
        platform VARCHAR(100),
        link TEXT,
        status VARCHAR(100) DEFAULT 'New lead',
        type VARCHAR(20) NOT NULL CHECK (type IN ('cold', 'warm', 'crm')),
        quality_score INTEGER DEFAULT 5 CHECK (quality_score BETWEEN 1 AND 10),
        industry VARCHAR(255),
        best_time_to_contact VARCHAR(100),
        preferred_contact VARCHAR(100),
        temperature_reason TEXT,
        notes TEXT,
        meeting_location VARCHAR(255),
        meeting_notes TEXT,
        scheduled_date TIMESTAMP,
        last_contact_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_statuses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
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

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve dashboard (protected)
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Auth routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    
    const user = result.rows[0];
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        email: user.email,
        goals: {
          daily: user.daily_goal,
          weekly: user.weekly_goal,
          monthly: user.monthly_goal
        },
        settings: {
          darkMode: user.dark_mode,
          notifications: user.notifications
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Lead routes
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leads WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    const leads = result.rows;
    
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

app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    const {
      name, email, phone, company, platform, link, status, type,
      qualityScore, industry, bestTimeToContact, preferredContact,
      temperatureReason, notes, meetingLocation, meetingNotes,
      scheduledDate, lastContactDate
    } = req.body;

    const result = await pool.query(`
      INSERT INTO leads (
        user_id, name, email, phone, company, platform, link, status, type,
        quality_score, industry, best_time_to_contact, preferred_contact,
        temperature_reason, notes, meeting_location, meeting_notes,
        scheduled_date, last_contact_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `, [
      req.user.userId, name, email, phone, company, platform, link, status, type,
      qualityScore, industry, bestTimeToContact, preferredContact,
      temperatureReason, notes, meetingLocation, meetingNotes,
      scheduledDate || null, lastContactDate || null
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;
    const updates = req.body;
    
    // Build dynamic update query
    const keys = Object.keys(updates).filter(key => key !== 'id');
    const values = keys.map(key => updates[key]);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const query = `
      UPDATE leads 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $${keys.length + 2}
      RETURNING *
    `;
    
    const result = await pool.query(query, [leadId, ...values, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User settings routes
app.get('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, daily_goal, weekly_goal, monthly_goal, dark_mode, notifications, created_at
      FROM users WHERE id = $1
    `, [req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      goals: {
        daily: user.daily_goal,
        weekly: user.weekly_goal,
        monthly: user.monthly_goal
      },
      settings: {
        darkMode: user.dark_mode,
        notifications: user.notifications
      }
    });
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const { goals, settings } = req.body;
    
    let updateFields = [];
    let values = [];
    let paramCount = 1;
    
    if (goals) {
      if (goals.daily !== undefined) {
        updateFields.push(`daily_goal = $${++paramCount}`);
        values.push(goals.daily);
      }
      if (goals.weekly !== undefined) {
        updateFields.push(`weekly_goal = $${++paramCount}`);
        values.push(goals.weekly);
      }
      if (goals.monthly !== undefined) {
        updateFields.push(`monthly_goal = $${++paramCount}`);
        values.push(goals.monthly);
      }
    }
    
    if (settings) {
      if (settings.darkMode !== undefined) {
        updateFields.push(`dark_mode = $${++paramCount}`);
        values.push(settings.darkMode);
      }
      if (settings.notifications !== undefined) {
        updateFields.push(`notifications = $${++paramCount}`);
        values.push(settings.notifications);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $1 
      RETURNING id, email, daily_goal, weekly_goal, monthly_goal, dark_mode, notifications
    `;
    
    const result = await pool.query(query, [req.user.userId, ...values]);
    const user = result.rows[0];
    
    res.json({
      id: user.id,
      email: user.email,
      goals: {
        daily: user.daily_goal,
        weekly: user.weekly_goal,
        monthly: user.monthly_goal
      },
      settings: {
        darkMode: user.dark_mode,
        notifications: user.notifications
      }
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Statistics route
app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    // Get all leads for the user
    const leadsResult = await pool.query('SELECT * FROM leads WHERE user_id = $1', [req.user.userId]);
    const leads = leadsResult.rows;
    
    // Calculate statistics
    const totalLeads = leads.length;
    const coldLeads = leads.filter(l => l.type === 'cold').length;
    const warmLeads = leads.filter(l => l.type === 'warm').length;
    const crmLeads = leads.filter(l => l.type === 'crm').length;
    
    // Platform breakdown
    const platformStats = {};
    leads.forEach(lead => {
      if (lead.platform) {
        platformStats[lead.platform] = (platformStats[lead.platform] || 0) + 1;
      }
    });
    
    // Status breakdown
    const statusStats = {};
    leads.forEach(lead => {
      statusStats[lead.status] = (statusStats[lead.status] || 0) + 1;
    });
    
    // Monthly lead creation
    const monthlyStats = {};
    leads.forEach(lead => {
      const month = new Date(lead.created_at).toISOString().slice(0, 7);
      monthlyStats[month] = (monthlyStats[month] || 0) + 1;
    });
    
    res.json({
      totalLeads,
      coldLeads,
      warmLeads,
      crmLeads,
      platformStats,
      statusStats,
      monthlyStats
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Custom status routes
app.get('/api/custom-statuses', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM custom_statuses WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get custom statuses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/custom-statuses', authenticateToken, async (req, res) => {
  try {
    const { statusName } = req.body;
    const result = await pool.query(
      'INSERT INTO custom_statuses (user_id, status_name) VALUES ($1, $2) RETURNING *',
      [req.user.userId, statusName]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create custom status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Catch all route - serve 404
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SteadyLeadTracker server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: PostgreSQL`);
});