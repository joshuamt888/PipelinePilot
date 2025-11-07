/**
 * ═══════════════════════════════════════════════════════════════════
 * NOTES MODULE - CONCEPT & DESIGN DOCUMENT
 * ═══════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Quick note-taking with tagging, search, and lead linking
 * INSPIRATION: Apple Notes + Notion simplicity + CRM context
 *
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  DATABASE SCHEMA DESIGN                                          │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
-- `notes` table
CREATE TABLE notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    title           TEXT,                    -- Optional title
    content         TEXT NOT NULL,           -- Main note body (rich text or markdown)

    -- Categorization
    tags            TEXT[],                  -- ['meeting', 'idea', 'follow-up']
    color           TEXT,                    -- Color coding like goals
    is_pinned       BOOLEAN DEFAULT false,   -- Pin important notes to top

    -- Linking
    lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Link to lead
    task_id         UUID REFERENCES tasks(id) ON DELETE SET NULL,  -- Link to task
    goal_id         UUID REFERENCES goals(id) ON DELETE SET NULL,  -- Link to goal
    job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,   -- Link to job

    -- Organization
    folder          TEXT,                    -- 'Personal', 'Work', 'Ideas', etc.
    is_archived     BOOLEAN DEFAULT false,

    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    last_viewed_at  TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_lead_id ON notes(lead_id);
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);  -- For array search
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_pinned ON notes(is_pinned) WHERE is_pinned = true;

-- Full-text search support
CREATE INDEX idx_notes_content_search ON notes USING GIN(to_tsvector('english', content));
CREATE INDEX idx_notes_title_search ON notes USING GIN(to_tsvector('english', title));

-- RLS Policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
    ON notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
    ON notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
    ON notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
    ON notes FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  API.JS FUNCTIONS                                                │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
// Add to api.js

// =====================================================
// NOTES (Pro Tier - Quick Note Taking)
// =====================================================

static async getNotes(filters = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // Apply filters
    if (filters.folder) {
        query = query.eq('folder', filters.folder);
    }
    if (filters.is_pinned) {
        query = query.eq('is_pinned', true);
    }
    if (filters.is_archived === false) {
        query = query.eq('is_archived', false);
    }
    if (filters.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
    }
    if (filters.tag) {
        query = query.contains('tags', [filters.tag]);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

static async createNote(noteData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('notes')
        .insert({
            ...noteData,
            user_id: user.id
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

static async updateNote(noteId, updates) {
    const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

static async deleteNote(noteId) {
    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

    if (error) throw error;
    return { success: true };
}

static async searchNotes(query) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) throw error;
    return data;
}

static async togglePinNote(noteId, isPinned) {
    return await this.updateNote(noteId, { is_pinned: isPinned });
}

static async archiveNote(noteId) {
    return await this.updateNote(noteId, { is_archived: true });
}

static async getNotesForLead(leadId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('lead_id', leadId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  UI/UX CONCEPT & VISUAL DESIGN                                   │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
╔═══════════════════════════════════════════════════════════════════════════╗
║                        NOTES MODULE LAYOUT                                ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  HEADER                                                             │ ║
║  │  ┌──────────────────┐  ┌────────────────────────┐  ┌────────────┐ │ ║
║  │  │  Notes  📝       │  │  🔍 Search notes...    │  │ + New Note │ │ ║
║  │  └──────────────────┘  └────────────────────────┘  └────────────┘ │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  FILTERS & FOLDERS                                                  │ ║
║  │  [📌 Pinned] [📁 All] [💼 Work] [💡 Ideas] [📋 Meeting Notes]     │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  PINNED NOTES (If any)                                              │ ║
║  │  ┌───────────────────┐  ┌───────────────────┐                      │ ║
║  │  │ 📌 Meeting Notes  │  │ 📌 Q4 Strategy    │                      │ ║
║  │  │ Discussed pricing │  │ Revenue targets   │                      │ ║
║  │  │ with John Smith   │  │ and expansion...  │                      │ ║
║  │  │ #meeting #lead    │  │ #planning #goals  │                      │ ║
║  │  │ 2 hours ago       │  │ Yesterday         │                      │ ║
║  │  └───────────────────┘  └───────────────────┘                      │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  ALL NOTES (Grid View)                                              │ ║
║  │                                                                      │ ║
║  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │ ║
║  │  │ Follow-up Jane  │  │ Product Ideas   │  │ Budget Review   │   │ ║
║  │  │ Call tomorrow   │  │ - Feature X     │  │ Need to review  │   │ ║
║  │  │ about proposal  │  │ - Integration Y │  │ Q4 expenses...  │   │ ║
║  │  │                 │  │ - UI Polish     │  │                 │   │ ║
║  │  │ 🏷️ follow-up    │  │ 🏷️ ideas        │  │ 🏷️ finance      │   │ ║
║  │  │ 👤 Jane Cooper  │  │                 │  │                 │   │ ║
║  │  │ 3 hours ago     │  │ 1 day ago       │  │ 2 days ago      │   │ ║
║  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │ ║
║  │                                                                      │ ║
║  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │ ║
║  │  │ Team Standup    │  │ Design Feedback │  │ Client Feedback │   │ ║
║  │  │ Sprint planning │  │ Dashboard needs │  │ Really happy    │   │ ║
║  │  │ for next week   │  │ mobile updates  │  │ with progress!  │   │ ║
║  │  │                 │  │                 │  │                 │   │ ║
║  │  │ 🏷️ meeting      │  │ 🏷️ design       │  │ 🏷️ testimonial  │   │ ║
║  │  │ 3 days ago      │  │ 1 week ago      │  │ 1 week ago      │   │ ║
║  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
*/

/*
╔═══════════════════════════════════════════════════════════════════════════╗
║                    NOTE DETAIL / EDIT MODAL                               ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  ┌──────────────────────────────────────────────────────────┐       │ ║
║  │  │  Title (Optional)                                         │       │ ║
║  │  │  Meeting Notes - John Smith Pricing Discussion           │       │ ║
║  │  └──────────────────────────────────────────────────────────┘       │ ║
║  │                                                                      │ ║
║  │  ┌──────────────────────────────────────────────────────────┐       │ ║
║  │  │  Note Content                                            │       │ ║
║  │  │                                                          │       │ ║
║  │  │  Discussed Q4 pricing strategy with John Smith.         │       │ ║
║  │  │                                                          │       │ ║
║  │  │  Key Points:                                             │       │ ║
║  │  │  - Willing to commit to annual plan                     │       │ ║
║  │  │  - Needs volume discount for 5+ users                   │       │ ║
║  │  │  - Decision by end of month                             │       │ ║
║  │  │                                                          │       │ ║
║  │  │  Action Items:                                           │       │ ║
║  │  │  - Send custom quote by Friday                          │       │ ║
║  │  │  - Schedule follow-up call next Tuesday                 │       │ ║
║  │  │                                                          │       │ ║
║  │  └──────────────────────────────────────────────────────────┘       │ ║
║  │                                                                      │ ║
║  │  ┌──────────────────────────────────────────────────────────┐       │ ║
║  │  │  Link to Lead/Task/Goal/Job (Optional)                  │       │ ║
║  │  │  [Dropdown: Select a lead...]  👤 John Smith - Acme Inc │       │ ║
║  │  └──────────────────────────────────────────────────────────┘       │ ║
║  │                                                                      │ ║
║  │  ┌──────────────────────────────────────────────────────────┐       │ ║
║  │  │  Tags (Type and press Enter)                            │       │ ║
║  │  │  [meeting] [pricing] [follow-up] [+]                    │       │ ║
║  │  └──────────────────────────────────────────────────────────┘       │ ║
║  │                                                                      │ ║
║  │  ┌──────────────────────────────────────────────────────────┐       │ ║
║  │  │  Folder                                                  │       │ ║
║  │  │  [Dropdown: Work ▼]  Personal | Work | Ideas            │       │ ║
║  │  └──────────────────────────────────────────────────────────┘       │ ║
║  │                                                                      │ ║
║  │  ┌──────────────────────────────────────────────────────────┐       │ ║
║  │  │  Color (Optional)                                        │       │ ║
║  │  │  ⚪ 🔴 🟢 🔵 🟡 🟣 🟠                                      │       │ ║
║  │  └──────────────────────────────────────────────────────────┘       │ ║
║  │                                                                      │ ║
║  │  [📌 Pin to Top]  [🗑️ Delete]     [Cancel]  [Save Note]           │ ║
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

1. QUICK CAPTURE
   - Fast note creation (single click + type)
   - Auto-save as you type (no manual save needed)
   - Optional title (defaults to first line of content)
   - Markdown support (bold, italic, lists, links)

2. ORGANIZATION
   - Tags for categorization (#meeting, #idea, #follow-up)
   - Folders (Personal, Work, Ideas, Meeting Notes)
   - Color coding (like goals)
   - Pin important notes to top
   - Archive old notes

3. SEARCH & FILTER
   - Full-text search across all notes
   - Filter by tag, folder, date range
   - Filter by linked entity (show all notes for a lead)
   - Recent notes view
   - Pinned notes at top always

4. CRM INTEGRATION
   - Link notes to leads (meeting notes, conversation logs)
   - Link notes to tasks (task notes, completion details)
   - Link notes to goals (strategy notes, progress updates)
   - Link notes to jobs (project notes, client requests)
   - Show note count badge on linked entities

5. SMART FEATURES
   - Detect lead names in content, suggest linking
   - Detect dates, suggest creating tasks
   - Detect dollar amounts, suggest creating goals/jobs
   - Copy note content to task description
   - Convert note to task with one click

6. VIEWS
   - Grid view (cards, like current design)
   - List view (compact, more notes per page)
   - Timeline view (chronological with date headers)
   - Calendar view (notes by date created)

7. COLLABORATION (Future - Admin Tier)
   - Share note with team members
   - Note permissions (view only, edit)
   - Note comments/discussion threads
   - @mention team members in notes

8. EXPORT & BACKUP
   - Export single note as .txt or .md
   - Export all notes as ZIP
   - Export notes for specific lead as PDF
   - Automatic backup to user's storage
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  SMART LINKING EXAMPLES                                          │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
EXAMPLE 1: Note with Lead Detection
─────────────────────────────────────
User types: "Had a great call with John Smith from Acme Corp today"

Smart suggestion appears:
┌─────────────────────────────────────────────┐
│ 💡 Found lead: John Smith - Acme Corp      │
│ [Link this note to lead] [Dismiss]         │
└─────────────────────────────────────────────┘


EXAMPLE 2: Note with Task Creation
─────────────────────────────────────
User types: "Need to send proposal by Friday"

Smart suggestion appears:
┌─────────────────────────────────────────────┐
│ 📋 Create task: Send proposal               │
│ Due: Friday                                 │
│ [Create Task] [Dismiss]                     │
└─────────────────────────────────────────────┘


EXAMPLE 3: Note with Goal Tracking
─────────────────────────────────────
User types: "Closed deal worth $15,000"

Smart suggestion appears:
┌─────────────────────────────────────────────┐
│ 🎯 Update goal: Revenue Target              │
│ Add $15,000 to current progress             │
│ [Update Goal] [Dismiss]                     │
└─────────────────────────────────────────────┘


EXAMPLE 4: Meeting Notes Template
─────────────────────────────────────
User clicks "New Note" → "Meeting Template"

Auto-fills with:
┌─────────────────────────────────────────────┐
│ Meeting Notes - [Date]                      │
│                                             │
│ Attendees:                                  │
│ -                                           │
│                                             │
│ Agenda:                                     │
│ -                                           │
│                                             │
│ Key Points:                                 │
│ -                                           │
│                                             │
│ Action Items:                               │
│ -                                           │
│                                             │
│ Next Steps:                                 │
│ -                                           │
└─────────────────────────────────────────────┘
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  MOBILE OPTIMIZATION                                             │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
MOBILE VIEW (390px - iPhone 12):
- Single column grid
- Tap to edit (full screen modal)
- Swipe actions (pin, archive, delete)
- Voice-to-text support
- Camera integration (add photos to notes)
- Quick note FAB (floating action button)

TABLET VIEW (768px - iPad):
- Two column grid
- Split view (list + detail)
- Keyboard shortcuts
- Drag and drop to reorder/organize

DESKTOP VIEW (1024px+):
- Three column grid
- Sidebar navigation (folders/tags)
- Hover previews
- Full keyboard shortcuts
- Bulk operations
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  KEYBOARD SHORTCUTS                                              │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
Cmd/Ctrl + N     - New note
Cmd/Ctrl + K     - Quick search
Cmd/Ctrl + P     - Toggle pin
Cmd/Ctrl + E     - Edit current note
Cmd/Ctrl + S     - Save note
Cmd/Ctrl + /     - Add tag
Esc              - Close modal
Delete           - Delete note (with confirmation)
↑/↓              - Navigate notes
Enter            - Open note
Cmd/Ctrl + F     - Find in note
Cmd/Ctrl + B     - Bold text
Cmd/Ctrl + I     - Italic text
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  PERFORMANCE CONSIDERATIONS                                      │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
1. LAZY LOADING
   - Load 50 notes initially
   - Infinite scroll for more
   - Cache loaded notes in memory

2. SEARCH OPTIMIZATION
   - Debounce search input (300ms)
   - Use PostgreSQL full-text search
   - Highlight search terms in results

3. AUTO-SAVE
   - Debounce auto-save (1 second after typing stops)
   - Show "Saving..." indicator
   - Show "All changes saved" confirmation

4. IMAGE HANDLING
   - Compress images before upload
   - Store in Supabase storage
   - Lazy load images in grid
   - Thumbnail generation

5. BATCH OPERATIONS
   - Batch delete multiple notes
   - Batch tag assignment
   - Batch move to folder
   - Batch archive
*/

/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  IMPLEMENTATION PLAN                                             │
 * └─────────────────────────────────────────────────────────────────┘
 */

/*
PHASE 1: Foundation (4-5 hours)
├── Create database table and indexes
├── Add RLS policies
├── Create API functions in api.js
└── Basic note CRUD in Notes.js

PHASE 2: Core UI (3-4 hours)
├── Grid view layout
├── Note cards with preview
├── Create/edit modal
├── Search functionality
└── Tags and folders

PHASE 3: CRM Integration (2-3 hours)
├── Lead linking
├── Task/Goal/Job linking
├── Show notes in lead detail view
├── Note count badges
└── Quick note from lead view

PHASE 4: Smart Features (2-3 hours)
├── Auto-save
├── Smart linking suggestions
├── Meeting notes template
├── Markdown support
└── Pin/archive/color

PHASE 5: Polish (2-3 hours)
├── Keyboard shortcuts
├── Mobile responsive
├── Loading states
├── Empty states
└── Animations

TOTAL TIME: 13-18 hours
*/

console.log('📝 Notes module design ready for implementation');
console.log('Database schema, API functions, and UI mockups defined above');
console.log('Estimated implementation time: 13-18 hours');
