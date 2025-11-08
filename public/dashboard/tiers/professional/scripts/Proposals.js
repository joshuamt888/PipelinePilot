/**
 * ═══════════════════════════════════════════════════════════════════
 * PROPOSALS MODULE - CONCEPT & DESIGN DOCUMENT
 * ═══════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Quote/proposal builder with client acceptance and auto-job creation
 * INSPIRATION: PandaDoc simplicity + Stripe checkout flow + DocuSign UX
 *
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  DATABASE SCHEMA DESIGN                                          │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
-- `proposals` table
CREATE TABLE proposals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,

    -- Identification
    proposal_number     TEXT UNIQUE,                    -- "PROP-2024-001" (auto-generated)
    title               TEXT NOT NULL,                  -- "Website Redesign Proposal"

    -- Line Items (JSONB array)
    line_items          JSONB NOT NULL DEFAULT '[]'::JSONB,
    /* Structure:
    [
      {
        "id": "item-1",
        "description": "Homepage design mockups",
        "quantity": 1,
        "rate": 500.00,
        "unit": "item",           // "item", "hour", "day", "month"
        "total": 500.00
      }
    ]
    */

    -- Pricing
    subtotal            NUMERIC DEFAULT 0,
    tax_rate            NUMERIC DEFAULT 0,              -- 8.5% stored as 8.5
    tax_amount          NUMERIC DEFAULT 0,
    discount_type       TEXT,                           -- 'percentage' or 'fixed'
    discount_value      NUMERIC DEFAULT 0,
    discount_amount     NUMERIC DEFAULT 0,
    total               NUMERIC DEFAULT 0,

    -- Terms & Conditions
    payment_terms       TEXT DEFAULT 'Net 30',          -- "Net 30", "50% upfront", "Due on receipt"
    valid_until         DATE,                           -- Expiration date
    notes               TEXT,                           -- Additional terms/conditions
    template_name       TEXT,                           -- "Hourly", "Fixed", "Package", etc.

    -- Status & Tracking
    status              TEXT DEFAULT 'draft',           -- draft, sent, viewed, accepted, declined, expired
    sent_at             TIMESTAMPTZ,
    sent_to_email       TEXT,                           -- Client email
    viewed_at           TIMESTAMPTZ,                    -- First time client viewed
    view_count          INTEGER DEFAULT 0,
    last_viewed_at      TIMESTAMPTZ,                    -- Most recent view

    -- Client Response
    accepted_at         TIMESTAMPTZ,
    accepted_by_name    TEXT,
    accepted_by_email   TEXT,
    accepted_signature  TEXT,                           -- "I agree" or signature text
    accepted_ip         TEXT,                           -- For legal records

    declined_at         TIMESTAMPTZ,
    decline_reason      TEXT,

    -- Auto-conversion to Job
    auto_create_job     BOOLEAN DEFAULT true,
    created_job_id      UUID REFERENCES jobs(id) ON DELETE SET NULL,

    -- Metadata
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_lead_id ON proposals(lead_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_number ON proposals(proposal_number);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);

-- RLS Policies
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proposals"
    ON proposals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own proposals"
    ON proposals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals"
    ON proposals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals"
    ON proposals FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year TEXT;
    counter INTEGER;
BEGIN
    year := TO_CHAR(NOW(), 'YYYY');

    -- Get the highest counter for this year
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(proposal_number FROM 'PROP-' || year || '-([0-9]+)')
            AS INTEGER
        )
    ), 0) + 1
    INTO counter
    FROM proposals
    WHERE proposal_number LIKE 'PROP-' || year || '-%';

    -- Format as PROP-2024-001
    new_number := 'PROP-' || year || '-' || LPAD(counter::TEXT, 3, '0');

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate proposal number on insert
CREATE OR REPLACE FUNCTION set_proposal_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.proposal_number IS NULL THEN
        NEW.proposal_number := generate_proposal_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_proposal_number
    BEFORE INSERT ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION set_proposal_number();
*/

/*
-- `proposal_templates` table (Optional - for saving custom templates)
CREATE TABLE proposal_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,

    name            TEXT NOT NULL,                      -- "Hourly Consulting Template"
    description     TEXT,
    line_items      JSONB NOT NULL DEFAULT '[]'::JSONB,
    payment_terms   TEXT,
    notes           TEXT,

    is_default      BOOLEAN DEFAULT false,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for templates
ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
    ON proposal_templates
    USING (auth.uid() = user_id);
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API.JS FUNCTIONS                                                │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
// Add to api.js

// =====================================================
// PROPOSALS (Pro Tier - Quote Builder)
// =====================================================

static async getProposals(filters = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
        .from('proposals')
        .select(`
            *,
            lead:leads(id, name, company, email)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

static async createProposal(proposalData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate totals
    const subtotal = proposalData.line_items.reduce((sum, item) =>
        sum + (item.quantity * item.rate), 0);

    const tax_amount = subtotal * (proposalData.tax_rate || 0) / 100;

    let discount_amount = 0;
    if (proposalData.discount_type === 'percentage') {
        discount_amount = subtotal * (proposalData.discount_value || 0) / 100;
    } else if (proposalData.discount_type === 'fixed') {
        discount_amount = proposalData.discount_value || 0;
    }

    const total = subtotal + tax_amount - discount_amount;

    const { data, error } = await supabase
        .from('proposals')
        .insert({
            ...proposalData,
            user_id: user.id,
            subtotal,
            tax_amount,
            discount_amount,
            total,
            status: 'draft'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

static async updateProposal(proposalId, updates) {
    // Recalculate totals if line items or pricing changed
    if (updates.line_items || updates.tax_rate || updates.discount_value) {
        const subtotal = updates.line_items
            ? updates.line_items.reduce((sum, item) => sum + (item.quantity * item.rate), 0)
            : undefined;

        if (subtotal !== undefined) {
            updates.subtotal = subtotal;
            updates.tax_amount = subtotal * (updates.tax_rate || 0) / 100;

            let discount_amount = 0;
            if (updates.discount_type === 'percentage') {
                discount_amount = subtotal * (updates.discount_value || 0) / 100;
            } else if (updates.discount_type === 'fixed') {
                discount_amount = updates.discount_value || 0;
            }
            updates.discount_amount = discount_amount;
            updates.total = subtotal + updates.tax_amount - discount_amount;
        }
    }

    const { data, error } = await supabase
        .from('proposals')
        .update(updates)
        .eq('id', proposalId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

static async deleteProposal(proposalId) {
    const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalId);

    if (error) throw error;
    return { success: true };
}

static async sendProposal(proposalId, recipientEmail) {
    // Update status to sent
    const { data: proposal, error: updateError } = await supabase
        .from('proposals')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            sent_to_email: recipientEmail
        })
        .eq('id', proposalId)
        .select()
        .single();

    if (updateError) throw updateError;

    // TODO: Send email via backend service
    // For now, just return the proposal with a public view link
    const viewLink = `${window.location.origin}/proposals/view/${proposalId}`;

    return {
        proposal,
        viewLink,
        message: 'Proposal sent successfully'
    };
}

static async trackProposalView(proposalId) {
    // Increment view count and update timestamps
    const { data, error } = await supabase.rpc('track_proposal_view', {
        p_proposal_id: proposalId
    });

    if (error) throw error;
    return data;
}

static async acceptProposal(proposalId, acceptanceData) {
    const { name, email, signature, ip } = acceptanceData;

    const { data: proposal, error } = await supabase
        .from('proposals')
        .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by_name: name,
            accepted_by_email: email,
            accepted_signature: signature,
            accepted_ip: ip
        })
        .eq('id', proposalId)
        .select()
        .single();

    if (error) throw error;

    // Auto-create job if enabled
    if (proposal.auto_create_job && !proposal.created_job_id) {
        const job = await this.createJobFromProposal(proposalId);

        // Link job to proposal
        await supabase
            .from('proposals')
            .update({ created_job_id: job.id })
            .eq('id', proposalId);

        return { proposal, job };
    }

    return { proposal };
}

static async declineProposal(proposalId, reason) {
    const { data, error } = await supabase
        .from('proposals')
        .update({
            status: 'declined',
            declined_at: new Date().toISOString(),
            decline_reason: reason
        })
        .eq('id', proposalId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

static async createJobFromProposal(proposalId) {
    const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select('*, lead:leads(*)')
        .eq('id', proposalId)
        .single();

    if (proposalError) throw proposalError;

    // Create job with proposal details
    const jobData = {
        lead_id: proposal.lead_id,
        title: proposal.title,
        description: `Created from proposal ${proposal.proposal_number}`,
        quoted_price: proposal.total,
        status: 'pending',
        payment_status: 'pending',
        notes: proposal.notes
    };

    const { data: job, error: jobError } = await this.createJob(jobData);
    if (jobError) throw jobError;

    return job;
}

static async duplicateProposal(proposalId) {
    const { data: original, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

    if (fetchError) throw fetchError;

    // Remove unique fields and reset status
    const {
        id,
        proposal_number,
        created_at,
        updated_at,
        sent_at,
        viewed_at,
        accepted_at,
        declined_at,
        created_job_id,
        ...duplicateData
    } = original;

    duplicateData.title = `${original.title} (Copy)`;
    duplicateData.status = 'draft';

    return await this.createProposal(duplicateData);
}

// Database function for tracking views (add to migration)
/*
CREATE OR REPLACE FUNCTION track_proposal_view(p_proposal_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE proposals
    SET
        view_count = view_count + 1,
        last_viewed_at = NOW(),
        viewed_at = COALESCE(viewed_at, NOW()),
        status = CASE
            WHEN status = 'sent' THEN 'viewed'
            ELSE status
        END
    WHERE id = p_proposal_id;
END;
$$ LANGUAGE plpgsql;
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  UI/UX CONCEPT & VISUAL DESIGN                                   │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
╔═══════════════════════════════════════════════════════════════════════════╗
║                      PROPOSALS MODULE LAYOUT                              ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  HEADER & FILTERS                                                   │ ║
║  │  ┌──────────────────┐  ┌────────────────────────┐  ┌────────────┐ │ ║
║  │  │  Proposals  📄   │  │  🔍 Search proposals   │  │ + New      │ │ ║
║  │  └──────────────────┘  └────────────────────────┘  └────────────┘ │ ║
║  │                                                                      │ ║
║  │  [All] [Draft] [Sent] [Viewed] [Accepted] [Declined]               │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  STATUS PIPELINE                                                     │ ║
║  │  ┌────────┐   ┌────────┐   ┌────────┐   ┌──────────┐   ┌────────┐ │ ║
║  │  │ Draft  │ → │  Sent  │ → │ Viewed │ → │ Accepted │   │ Declined│ │ ║
║  │  │   3    │   │   5    │   │   2    │   │    8     │   │    1    │ │ ║
║  │  └────────┘   └────────┘   └────────┘   └──────────┘   └────────┘ │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  PROPOSALS LIST                                                      │ ║
║  │                                                                       │ ║
║  │  ┌─────────────────────────────────────────────────────────────────┐│ ║
║  │  │ PROP-2024-042  Website Redesign                     $2,265.50   ││ ║
║  │  │ John Smith - Acme Corp                                          ││ ║
║  │  │ 🟢 Accepted Nov 15 • Job #042 created                          ││ ║
║  │  │ [View] [Download PDF]                                           ││ ║
║  │  └─────────────────────────────────────────────────────────────────┘│ ║
║  │                                                                       │ ║
║  │  ┌─────────────────────────────────────────────────────────────────┐│ ║
║  │  │ PROP-2024-041  Marketing Retainer               $5,000/month    ││ ║
║  │  │ Jane Cooper - Tech Startup                                      ││ ║
║  │  │ 👁️ Viewed 3 times • Last viewed 2 hours ago                     ││ ║
║  │  │ ⏰ Expires in 5 days                                            ││ ║
║  │  │ [Follow Up] [Edit] [View]                                       ││ ║
║  │  └─────────────────────────────────────────────────────────────────┘│ ║
║  │                                                                       │ ║
║  │  ┌─────────────────────────────────────────────────────────────────┐│ ║
║  │  │ PROP-2024-040  E-commerce Build                    $12,500.00   ││ ║
║  │  │ Mike Johnson - Retail Co                                        ││ ║
║  │  │ 📧 Sent 1 week ago • Not viewed yet                            ││ ║
║  │  │ [Resend] [Edit] [View]                                          ││ ║
║  │  └─────────────────────────────────────────────────────────────────┘│ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
*/

/*
╔═══════════════════════════════════════════════════════════════════════════╗
║                    PROPOSAL BUILDER MODAL                                 ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  New Proposal for John Smith - Acme Corp               [× Close]    │ ║
║  ├─────────────────────────────────────────────────────────────────────┤ ║
║  │                                                                      │ ║
║  │  BASIC INFO                                                          │ ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │ ║
║  │  │ Title: [Website Redesign Proposal                        ]  │  │ ║
║  │  └──────────────────────────────────────────────────────────────┘  │ ║
║  │                                                                      │ ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │ ║
║  │  │ Template: [Custom ▼]                                        │  │ ║
║  │  │           Hourly | Fixed Price | Package | Retainer         │  │ ║
║  │  └──────────────────────────────────────────────────────────────┘  │ ║
║  │                                                                      │ ║
║  │  ─────────────────────────────────────────────────────────────────  │ ║
║  │  LINE ITEMS                                                          │ ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │ ║
║  │  │ Description            Qty   Rate      Unit    Total         │  │ ║
║  │  │ ──────────────────────────────────────────────────────────── │  │ ║
║  │  │ Homepage design        1     $500.00   item    $500.00   [x] │  │ ║
║  │  │ Development (hourly)   20    $75.00    hour    $1,500.00 [x] │  │ ║
║  │  │ Content migration      1     $300.00   item    $300.00   [x] │  │ ║
║  │  │                                                              │  │ ║
║  │  │ [+ Add Item]  [+ Add from Template]  [Bulk Import]         │  │ ║
║  │  └──────────────────────────────────────────────────────────────┘  │ ║
║  │                                                                      │ ║
║  │  ─────────────────────────────────────────────────────────────────  │ ║
║  │  PRICING                                                             │ ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │ ║
║  │  │ Subtotal:                                        $2,300.00   │  │ ║
║  │  │                                                              │  │ ║
║  │  │ Tax:  [8.5%]                                     $  195.50   │  │ ║
║  │  │                                                              │  │ ║
║  │  │ Discount: [10    ] [Percentage ▼]              -$  230.00   │  │ ║
║  │  │                                                              │  │ ║
║  │  │ ──────────────────────────────────────────────────────────── │  │ ║
║  │  │ TOTAL:                                           $2,265.50   │  │ ║
║  │  └──────────────────────────────────────────────────────────────┘  │ ║
║  │                                                                      │ ║
║  │  ─────────────────────────────────────────────────────────────────  │ ║
║  │  TERMS                                                               │ ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │ ║
║  │  │ Payment Terms: [Net 30 ▼]                                   │  │ ║
║  │  │ Valid Until: [Nov 30, 2024]                                  │  │ ║
║  │  │                                                              │  │ ║
║  │  │ Notes/Conditions:                                            │  │ ║
║  │  │ [50% deposit required before work begins...              ]  │  ║
║  │  └──────────────────────────────────────────────────────────────┘  │ ║
║  │                                                                      │ ║
║  │  ☑ Auto-create job when proposal is accepted                       │ ║
║  │                                                                      │ ║
║  │  [Preview PDF]  [Save Draft]              [Send to Client] →       │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
*/

/*
╔═══════════════════════════════════════════════════════════════════════════╗
║                   CLIENT VIEW (Public Page)                               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │                      YOUR COMPANY LOGO                              │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  PROPOSAL FOR                                                        │ ║
║  │  John Smith                                                          │ ║
║  │  Acme Corporation                                                    │ ║
║  │  john@acme.com                                                       │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  Website Redesign Proposal                                          │ ║
║  │  PROP-2024-042                                                       │ ║
║  │  Valid until: November 30, 2024                                     │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  SERVICES                                                            │ ║
║  │                                                                       │ ║
║  │  1. Homepage design mockups                                         │ ║
║  │     1 × $500.00                                      $500.00        │ ║
║  │                                                                       │ ║
║  │  2. Development (hourly)                                            │ ║
║  │     20 hours × $75.00                               $1,500.00       │ ║
║  │                                                                       │ ║
║  │  3. Content migration                                               │ ║
║  │     1 × $300.00                                      $300.00        │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  Subtotal:                                           $2,300.00      │ ║
║  │  Tax (8.5%):                                         $  195.50      │ ║
║  │  Discount (10%):                                    -$  230.00      │ ║
║  │  ──────────────────────────────────────────────────────────────────  │ ║
║  │  TOTAL:                                              $2,265.50      │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  PAYMENT TERMS                                                       │ ║
║  │  50% deposit required before work begins                            │ ║
║  │  Remaining balance due upon completion                              │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  ACCEPTANCE                                                          │ ║
║  │                                                                       │ ║
║  │  Your Name: [John Smith                                         ]  │ ║
║  │                                                                       │ ║
║  │  ☑ I agree to the terms and conditions outlined above               │ ║
║  │                                                                       │ ║
║  │  [✓ Accept Proposal]                    [✗ Decline]                │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  FEATURE IDEAS & FUNCTIONALITY                                   │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
🎯 CORE FEATURES:

1. QUICK CREATION
   - Click "Send Proposal" from lead detail
   - Choose template or start from scratch
   - Auto-fills lead info
   - Duplicate existing proposals

2. LINE ITEM BUILDER
   - Add/remove line items
   - Drag to reorder
   - Quick templates (hourly, fixed, package)
   - Bulk import from CSV
   - Save common items as templates

3. SMART CALCULATIONS
   - Auto-calculate subtotal from line items
   - Percentage or fixed discount
   - Tax rate with auto-calculation
   - Final total updates in real-time
   - Currency formatting

4. TEMPLATES SYSTEM
   Pre-built templates:
   - Hourly Rate (consulting)
   - Fixed Price (projects)
   - Package Pricing (Bronze/Silver/Gold)
   - Retainer (monthly recurring)
   - Time & Materials (estimates)

5. PDF GENERATION
   - Professional PDF layout
   - Custom branding/logo
   - Download or email
   - Mobile-friendly view
   - Print-optimized

6. CLIENT ACCEPTANCE PAGE
   - Clean public view (no CRM UI)
   - Accept/Decline buttons
   - Name + signature capture
   - Records IP and timestamp
   - Email confirmations

7. STATUS TRACKING
   - Draft → Sent → Viewed → Accepted/Declined
   - View count tracking
   - Last viewed timestamp
   - Time to acceptance metrics
   - Expiration warnings

8. AUTO-CONVERSION
   When accepted:
   - Auto-create job with line items
   - Update lead status to converted
   - Link proposal to job
   - Email notifications
   - Set job value = proposal total

9. INTEGRATION
   - "Send Proposal" from lead detail
   - Show proposal count on lead card
   - Pipeline stage: "Proposal Sent"
   - Analytics: conversion rate, avg value
   - Goal tracking: proposals sent/accepted

10. REMINDERS & NOTIFICATIONS
    - "Proposal viewed" notification
    - "Proposal accepted" celebration
    - Expiration warnings
    - Follow-up reminders for unseen proposals
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  TEMPLATES LIBRARY                                               │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
BUILT-IN TEMPLATES:

1. HOURLY CONSULTING
   Line items:
   - Consulting services (hourly)
   Payment: Net 30
   Notes: "Hourly rate subject to change with 30 days notice"

2. FIXED PROJECT
   Line items:
   - Discovery & planning (fixed)
   - Design (fixed)
   - Development (fixed)
   - Testing & deployment (fixed)
   Payment: 33% deposit, 33% midpoint, 34% completion
   Notes: "Scope changes may incur additional fees"

3. PACKAGE PRICING
   Line items (client selects tier):
   - Bronze Package ($X/month)
   - Silver Package ($Y/month)
   - Gold Package ($Z/month)
   Payment: Monthly recurring
   Notes: "Cancel anytime with 30 days notice"

4. RETAINER
   Line items:
   - Monthly retainer (X hours included)
   - Additional hours (hourly rate)
   Payment: Due on 1st of each month
   Notes: "Unused hours do not roll over"

5. TIME & MATERIALS
   Line items:
   - Estimated hours (range)
   - Materials (estimated)
   Payment: Weekly invoicing
   Notes: "Final cost may vary based on actual time and materials"
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  CLIENT ACCEPTANCE FLOW                                          │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
STEP 1: Client receives email
┌────────────────────────────────────────────┐
│ Subject: Proposal from Your Company        │
│                                            │
│ Hi John,                                   │
│                                            │
│ Please review your proposal for Website   │
│ Redesign.                                  │
│                                            │
│ [View Proposal]                            │
│                                            │
│ This proposal expires on Nov 30, 2024      │
└────────────────────────────────────────────┘

STEP 2: Client clicks link → public view page
- Clean, professional layout
- No CRM interface
- Clear pricing breakdown
- Terms and conditions

STEP 3: Client reviews and decides
Option A: Accept
  - Enter name
  - Check "I agree" box
  - Click "Accept Proposal"
  - See confirmation: "Proposal accepted! We'll be in touch soon."

Option B: Decline
  - Click "Decline"
  - Optional: provide reason
  - See message: "Thanks for considering us"

STEP 4: System actions
If accepted:
  - Send confirmation email to client
  - Notify sales person
  - Update proposal status to "accepted"
  - Auto-create job (if enabled)
  - Update lead status to "converted"

If declined:
  - Send notification to sales person
  - Update proposal status to "declined"
  - Store decline reason
  - Opportunity for follow-up

STEP 5: Sales person sees update
- Dashboard notification: "John accepted your proposal!"
- Proposal card updates to green "Accepted" badge
- Job appears in Jobs module
- Lead status updated
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ANALYTICS & INSIGHTS                                            │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
PROPOSAL METRICS:

1. CONVERSION FUNNEL
   Draft (12) → Sent (8) → Viewed (6) → Accepted (3)
   Conversion rate: 37.5%

2. AVERAGE TIME TO ACCEPTANCE
   - Draft → Sent: 2 days
   - Sent → Viewed: 1 day
   - Viewed → Accepted: 3 days
   - Total: 6 days average

3. PROPOSAL VALUE METRICS
   - Total value sent: $45,000
   - Total value accepted: $18,500
   - Average proposal value: $5,625
   - Win rate by value tier

4. VIEW TRACKING
   - Proposals viewed multiple times (higher intent)
   - Proposals never viewed (follow up needed)
   - Average views before acceptance: 2.3

5. TEMPLATE PERFORMANCE
   - Which templates convert best
   - Average value by template
   - Most popular templates

6. EXPIRATION ANALYSIS
   - Proposals expiring soon
   - Expired proposals (lost opportunity)
   - Average time between send and expiration
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  INTEGRATION POINTS                                              │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
LEADS MODULE:
- "Send Proposal" button in lead detail
- Proposal count badge on lead card
- Show latest proposal status
- Filter: "Has pending proposal"

PIPELINE MODULE:
- New stage: "Proposal Sent"
- Auto-move when proposal sent
- Auto-move to "Converted" when accepted
- Show proposal value in deal card

JOBS MODULE:
- Auto-create job from accepted proposal
- Copy line items as job materials/tasks
- Link proposal in job detail
- "View Original Proposal" button

GOALS MODULE:
- Track: "Send X proposals this month"
- Track: "Close $X in proposals"
- Auto-update when proposals accepted

ANALYTICS MODULE:
- Proposal conversion rate chart
- Average proposal value trend
- Time to acceptance metrics
- Revenue from proposals graph

NOTES MODULE:
- Quick note: "Sent proposal to John"
- Auto-link note to proposal
- Template: "Proposal follow-up notes"
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  MOBILE OPTIMIZATION                                             │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
MOBILE VIEW (390px):
- Stack proposal cards vertically
- Simplified line item view
- Touch-friendly buttons
- Swipe to mark sent/viewed
- Mobile-optimized PDF view

CLIENT MOBILE VIEW:
- Responsive layout for all screen sizes
- Large touch targets for accept/decline
- Easy signature/name input
- Mobile-friendly terms scrolling
- Quick loading on slow connections
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  IMPLEMENTATION PLAN                                             │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
PHASE 1: Foundation (3-4 hours)
├── Create proposals table
├── Create proposal number generation function
├── Add RLS policies
├── Create API functions in api.js
└── Test CRUD operations

PHASE 2: Builder UI (4-5 hours)
├── Proposal list view
├── Create/edit modal
├── Line item management (add/remove/reorder)
├── Real-time calculations
└── Template selector

PHASE 3: PDF Generation (2-3 hours)
├── HTML to PDF library integration
├── Professional layout design
├── Custom branding support
├── Download functionality
└── Email attachment

PHASE 4: Client View (3-4 hours)
├── Public proposal view page
├── Accept/decline flow
├── Signature capture
├── Confirmation screens
└── Email notifications

PHASE 5: Integration (2-3 hours)
├── Link to leads (send from lead detail)
├── Auto-create jobs on acceptance
├── Pipeline stage updates
├── Analytics tracking
└── Goal progress updates

PHASE 6: Advanced Features (2-3 hours)
├── Templates system
├── Duplicate proposals
├── View tracking
├── Expiration logic
└── Follow-up reminders

PHASE 7: Polish (2-3 hours)
├── Mobile responsive
├── Loading states
├── Error handling
├── Empty states
└── Animations

TOTAL TIME: 18-25 hours
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  SECURITY CONSIDERATIONS                                         │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
PUBLIC VIEW PAGE SECURITY:
- UUID-based URLs (hard to guess)
- No authentication required (client-friendly)
- Rate limiting on acceptance endpoint
- IP tracking for legal validity
- Timestamp everything for audit trail

DATA VALIDATION:
- Validate line items before saving
- Sanitize all text inputs
- Check totals match calculations
- Verify proposal belongs to user
- Ensure lead access permissions

EMAIL SECURITY:
- Use trusted email service (SendGrid, Mailgun)
- SPF/DKIM for deliverability
- Unsubscribe link compliance
- Track email opens/clicks
- Bounce handling
*/

console.log('📄 Proposals module design ready for implementation');
console.log('Database schema, API functions, and UI mockups defined above');
console.log('Estimated implementation time: 18-25 hours');
