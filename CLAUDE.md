# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 👤 WHO YOU'RE WORKING WITH

**I'm Josh, and I need you to understand my journey because it matters for how we build together.**

### The Origin
Leads Legion was my first startup - a lead vendor site for insurance agents (burial, term, whole life leads). It crashed and burned after a year because I lost passion. But before it died, something happened that changed everything.

I built this massive database on Google Sheets and got SO obsessed that for a straight week, I didn't leave my house. **36 hours coding, 16 hours sleep, repeat.** Didn't shower, barely ate. I was just SO connected to building something from nothing. That week showed me I'm in love with programming - not just the business, but the CREATION itself.

### After the Failure
I was scared as fuck about my future. What was I gonna do? But that obsession with building never left. So I registered Steady Scaling LLC with a new philosophy.

### Steady Scaling's Mission
Build software products that are **dead simple and affordable**. But here's the key - THIS ISN'T JUST FOR MONEY. I want my SOUL in this shit. Every product should:
- Serve me first, then others
- Be something that didn't exist before
- Show people I want this, that I'm not half-assing it
- Scale thoughtfully (not bloated enterprise garbage)

### Right Now
I'm building SteadyManager - a simple manual lead tracker. Plans to scale it eventually (Business/Enterprise tiers), but for now I'm getting obsessed again like that first week. **This is proof I can build something real.**

### My Vibe
- I'm a **"vibe coder"** with basic programming understanding - be patient but direct
- I say "lowkey" a lot, keep it casual
- Brief explanations, to the point
- No corporate BS, no bloat

### How to Code With Me
Channel that 36-hour-no-shower obsession energy. Build **clean, passionate code** like someone who can't stop because they're IN LOVE with creating. This isn't just a product - it's my soul, my proof, my art.

**I can code every single day now because I genuinely love it. Help me build something that shows that passion.**

---

## 🎯 WHAT IS STEADYMANAGER?

**A manual lead tracker that starts simple and scales thoughtfully.**

- **Free Tier:** 50 leads, full CRUD, task management, CSV exports
- **Pro Tier:** 5,000 leads, advanced analytics, goals, estimates, jobs management, automation
- **Philosophy:** No bloated enterprise garbage. Just features that make you money.

**See [HANDOFF.md](./HANDOFF.md) for complete technical documentation** - it's 92KB of detailed architecture, database schema, API specs, security notes, and implementation guides.

---

## 🛠️ TECH STACK

**Frontend:**
- Vanilla JavaScript (ES6 modules)
- Tailwind CSS
- Lucide Icons
- Multi-tier architecture (separate dashboards for free/pro/admin users)

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL + Auth + RLS)
- Stripe (payments)
- Railway (hosting)

**Philosophy:** Keep it simple. Security by default (RLS on everything). Scale when needed, not before.

---

## 🏃 ESSENTIAL COMMANDS

### Development
```bash
# Install dependencies
npm install

# Run dev server (auto-opens browser at localhost:3000)
npm start

# Run in production mode locally
npm run prod-local
```

### Environment Setup
```bash
# Copy example env file
cp .env.example .env

# Required env vars (get from Supabase/Stripe dashboards):
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=
FRONTEND_URL=http://localhost:3000
```

### Testing
```bash
# Desktop tests (currently passing)
npm test

# Manual trial expiration test
# Visit: http://localhost:3000/api/test-trial-expiration
```

### Git Workflow
```bash
# Standard flow
git status
git add .
git commit -m "message"
git push

# Current branch: main
# Main branch for PRs: main
```

---

## 🏗️ HIGH-LEVEL ARCHITECTURE

### Frontend Structure
```
public/
├── auth/                          # Login, register, password reset
├── dashboard/
│   ├── index.html                 # Router (redirects based on user tier)
│   ├── shared/js/                 # Shared utilities across all tiers
│   │   ├── supabase.js           # Supabase client init
│   │   ├── api.js                # API wrapper (all DB calls)
│   │   ├── utils.js              # Formatters, validators, helpers
│   │   └── analytics.js          # Usage tracking
│   └── tiers/
│       ├── free/                  # 50 lead limit dashboard
│       │   ├── index.html
│       │   └── scripts/           # Dashboard, AddLead, Pipeline, Scheduling, Settings
│       ├── professional/          # 5000 lead limit dashboard
│       │   ├── index.html
│       │   └── scripts/           # All free modules + Goals, Estimates, Jobs, Clients
│       └── admin/                 # Admin dashboard (analytics, insights)
└── pages/                         # Static pages (about, pricing, terms, privacy)
```

### Module System (Professional Tier)
Each module is a self-contained class with consistent structure:

**Core Modules:**
- `Dashboard.js` - Overview, stats, recent activity
- `Pipeline.js` - Drag-and-drop lead stages with optimistic UI updates
- `Leads.js` - Full lead management (CRUD operations)
- `Scheduling.js` - Calendar-based task management
- `Goals.js` - Manual + auto-tracked goals with recurring support
- `Estimates.js` - Line items, photos, PDF generation, batch operations
- `JobsManagement.js` - Project tracking with materials, crew, profit calculator
- `Clients.js` - Client management (accessible via Jobs Hub only)
- `Settings.js` - Profile, preferences, theme, account management

**Module Pattern:**
```javascript
class ModuleName {
  constructor() {
    this.init();
  }

  async init() {
    await this.checkAuth();
    await this.loadData();
    this.setupEventListeners();
  }

  // CRUD operations using API.js
  // Event handlers
  // UI updates
}
```

### Authentication Flow
1. User registers → Email verification required (Supabase Auth)
2. Email verified → Login → Router checks user tier
3. Router redirects to appropriate dashboard (`/dashboard/tiers/{tier}/index.html`)
4. Dashboard checks auth on every page load
5. RLS policies enforce data isolation (users can only see their own data)

### Data Flow
```
Frontend Module
    ↓ (uses)
API.js (shared/js/api.js)
    ↓ (calls)
Supabase Client (shared/js/supabase.js)
    ↓ (queries)
PostgreSQL Database
    ↓ (enforces)
Row-Level Security (RLS)
```

**Key principle:** Never query the database directly. Always use `API.js` methods.

### Backend (server.js)
Minimal Express server that handles:
- Static file serving
- Stripe webhooks (subscription events)
- Stripe checkout session creation
- Daily cron job (2AM) for trial expiration checks
- Environment variable validation on startup

**Auth is handled by Supabase** - server.js does NOT manage sessions or JWT tokens.

---

## 🔐 SECURITY PRINCIPLES

**Row-Level Security (RLS)** is enabled on ALL tables. Users can only access their own data.

**XSS Protection:**
- All user input is sanitized before display
- CSP headers block inline scripts
- Never use `innerHTML` with user data

**Authentication:**
- Email verification required before access
- No account enumeration (generic error messages)
- Password reset via Supabase secure flow

**Stripe:**
- Webhook signature verification
- Server-side price validation
- Never trust client-side payment data

---

## 📊 DATABASE SCHEMA OVERVIEW

**Core Tables:**
- `users` - User profiles, tier info, trial dates, lead limits
- `leads` - Lead data (name, email, phone, status, stage, etc.)
- `tasks` - Scheduled tasks linked to leads
- `goals` - Manual + auto-tracked goals with recurring support
- `estimates` - Line items, photos, status workflow
- `jobs` - Project tracking with materials, crew, financials
- `clients` - Client records (linked to jobs)

**See HANDOFF.md for complete schema, indexes, triggers, and RLS policies.**

---

## 🎨 UI/UX PATTERNS

### Optimistic UI Updates
When user performs an action (create/edit/delete):
1. Close modal immediately (no loading states)
2. Update local state immediately
3. Recalculate stats immediately
4. Update DOM (grid + stats section) immediately
5. API call to server in background
6. Show error toast ONLY if API fails

**Reference:** See `Estimates.js` lines 2110-2198 for delete and status change handlers.

### Batch Operations
All multi-item operations use single API calls:
```javascript
// GOOD: Single batched call
API.batchDeleteEstimates([id1, id2, id3])

// BAD: Multiple individual calls
await API.deleteEstimate(id1)
await API.deleteEstimate(id2)
await API.deleteEstimate(id3)
```

### Value Capping
Numeric inputs silently cap at max values (no error messages):
- Money fields: $99,999,999.99 (frontend cap)
- Database has 10x buffer to handle edge cases
- User never sees "numeric field overflow" errors

---

## 🚀 DEPLOYMENT

**Platform:** Railway

**Deploy Process:**
1. Push to main branch on GitHub
2. Railway auto-deploys from main
3. Environment variables managed in Railway dashboard
4. No build step required (vanilla JS)

**Cron Jobs:**
Railway supports cron via `node-cron` package (already configured in server.js).

---

## 📈 CURRENT STATUS

**Free Tier (Desktop):** ✅ Production ready
**Professional Tier:** 🔨 90% complete
- ✅ Dashboard, Pipeline, Leads, Scheduling, Goals, Estimates, Jobs
- 🚧 Settings preferences section

**Mobile Optimization:** 🚧 In progress

---

## 💡 WORKING WITH JOSH - QUICK REFERENCE

**Communication Style:**
- Brief, to the point
- Casual tone ("lowkey", "bro", etc.)
- Direct feedback, no sugarcoating

**Code Philosophy:**
- Clean, passionate code (like 36-hour obsession energy)
- No bloat, no over-engineering
- Features that make money, not resume padding
- Security by default

**When Building:**
- Explain WHY briefly, not just WHAT
- Show me the key changes, don't narrate every line
- Test it before showing me
- If it breaks, fix it fast

**Josh doesn't write code** - delegate everything. He'll tell you what he wants built, you figure out how and do it.

---

## 📚 DOCUMENTATION HIERARCHY

1. **CLAUDE.md (this file)** - Who Josh is, how to work with him, essential commands
2. **HANDOFF.md** - Complete technical documentation (92KB) - database schema, API specs, security, implementation guides
3. **README.md** - Public-facing project overview, origin story, quick start
4. **ANALYTICS_SETUP.md** - Analytics configuration guide

**When working on features:** Read HANDOFF.md for technical details. Read CLAUDE.md to understand Josh's vibe and philosophy.

---

## 🔥 THE BOTTOM LINE

This isn't just a CRM. This is Josh's proof that he can build something real, something with soul. Every line of code should reflect that obsession - the kind that keeps you coding for 36 hours straight because you can't stop creating.

**No corporate BS. No bloat. Just clean, passionate code that makes money and shows the world what happens when someone builds because they genuinely love it.**

Let's build something real.
