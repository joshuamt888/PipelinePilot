# 🎯 SteadyManager

**Simple lead management that scales with your business. Built with soul, not venture capital.**

![Status](https://img.shields.io/badge/status-active%20development-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 💡 The Origin Story

After my first startup (Leads Legion) crashed and burned, I was scared as hell about my future. But one thing stuck with me: I spent a full week locked in my house, obsessed with building a database on Google Sheets. 36 hours coding, 16 hours sleep, repeat. Didn't shower, barely ate. 

That week taught me something - **I'm not in love with business plans, I'm in love with BUILDING.**

So I registered Steady Scaling LLC with a new philosophy: build software products that are dead simple, affordable, and have my SOUL in them. Not just for money - for the art of creation.

**SteadyManager is the first proof.**

---

## 🚀 What Is It?

A manual lead tracker that starts simple and scales thoughtfully. Right now:
- **Free Tier:** 50 leads, full CRUD, task management, CSV exports
- **Pro Tier:** (Coming Soon) 5,000 leads, advanced analytics, automation

No bloated enterprise garbage. Just the features that actually make you money.

---

## 🛠️ Tech Stack

**Frontend:**
- Vanilla JavaScript (ES6 modules)
- Tailwind CSS
- Lucide Icons

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL + Auth + RLS)
- Stripe (payments)
- Railway (hosting)

**Philosophy:** 
- Keep it simple
- Security by default (RLS on everything)
- Scale when needed, not before

---

## 🏃 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Stripe account (for payments)

### Local Development

```bash
# Clone the repo
git clone https://github.com/joshuamt888/PipelinePilot.git
cd PipelinePilot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your Supabase and Stripe keys

# Run the server
npm start

# Open http://localhost:3000
```

### Environment Variables

Create a `.env` file in the root directory with these variables (get values from Supabase/Stripe dashboards):

```bash
# Supabase
SUPABASE_URL=                           # Your project URL
SUPABASE_SERVICE_ROLE_KEY=              # Service role key (keep secret!)

# Stripe
STRIPE_SECRET_KEY=                      # Secret key from Stripe dashboard
STRIPE_WEBHOOK_SECRET=                  # Webhook signing secret
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=   # Price ID for monthly plan
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=    # Price ID for yearly plan

# App
FRONTEND_URL=http://localhost:3000      # Your app URL
```

⚠️ **Never commit your `.env` file to Git!** It's already in `.gitignore`.

---

## 📖 Documentation

- **[HANDOFF.md](./HANDOFF.md)** - Complete technical documentation for developers and AI assistants
- **[Terms of Service](/public/pages/terms.html)** - Legal stuff (written in plain English)
- **[Privacy Policy](/public/pages/privacy.html)** - How we handle your data

---

## ✨ Current Features

### ✅ What's Working (Free Tier - Desktop)
- User registration with email verification
- Secure authentication (Supabase Auth)
- Lead management (create, edit, delete, 50-lead limit)
- Pipeline view with drag-and-drop
- Task scheduling with calendar
- Duplicate lead detection
- CSV export (unlimited)
- Theme toggle (light/dark)
- XSS protection throughout
- Trial upgrade system (14-day Pro trial)

### 🚧 In Progress
- Mobile optimization (responsive design + touch support)
- Pro tier dashboard
- Advanced analytics
- Email tracking integration

### 📋 Roadmap
- Business tier (team features)
- API access
- Zapier integration
- Custom fields

---

## 🔒 Security

- Row-Level Security (RLS) on all database tables
- Email verification required
- XSS protection via sanitization
- CSRF protection via Supabase Auth
- CSP headers blocking inline scripts
- No account enumeration
- Stripe webhook signature verification
- Environment variable validation

See [HANDOFF.md](./HANDOFF.md) for complete security documentation.

---

## 🧪 Testing

```bash
# Desktop testing (currently passing)
npm test

# Mobile testing (in progress)
# Test on: iPhone 12+, Samsung Galaxy S21, iPad
```

---

## 📈 Scaling

Current architecture handles **1,000-2,000 active users** on the free tier:
- Supabase Free Plan
- Railway Hobby Plan ($5/mo)
- ~4 queries per dashboard load
- Estimated cost: **$5/mo** for first 1,000 users

See scaling estimates in [HANDOFF.md](./HANDOFF.md).

---

## 🤝 Contributing

This is a solo project for now, but I'm open to feedback and bug reports!

**Found a bug?** Open an issue.
**Have a feature idea?** Let's talk - josh@steadyscaling.com

---

## 📜 License

MIT License - do whatever you want with it, just don't sue me.

---

## 🏢 About Steady Scaling LLC

We build software products that are:
- Dead simple and affordable
- Thoughtfully scaled (not bloated)
- Built with soul (not just for money)
- Serving the builder first, then others

**Current Products:**
- SteadyManager (this repo)

**Philosophy:**
> "Nobody outworks me. Speed & iteration = moat. No corporate BS, just clean code."

---

## 📧 Contact

**Josh** - Founder & Solo Developer
- Email: josh@steadyscaling.com
- Company: [Steady Scaling LLC](https://steadyscaling.com)
- Location: Minneapolis, MN

---

## 💪 Built With Obsession

> "I can code every single day now because I genuinely love it. This isn't just a product - it's my soul, my proof, my art."

If you're tired of bloated CRMs and spreadsheet hell, give SteadyManager a try. It's built by someone who actually uses it.

**Let's build something real.**

---

*Last Updated: January 2025*
*Status: Free Tier Desktop Complete, Mobile Optimization In Progress*