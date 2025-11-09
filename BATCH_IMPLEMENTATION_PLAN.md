# Batch Operations Implementation Plan

## ✅ COMPLETED

### API.js - Batch APIs
- ✅ `API.batchUpdateEstimates(estimateIds, updates)`
- ✅ `API.batchDeleteEstimates(estimateIds)`
- ✅ `API.batchUpdateLeads(leadIds, updates)` (already existed)
- ✅ `API.batchDeleteLeads(leadIds)` (already existed)
- ✅ `API.batchUpdateTasks(taskIds, updates)` (already existed)
- ✅ `API.batchDeleteTasks(taskIds)` (already existed)
- ✅ `API.batchCompleteTasks(taskIds, notes)` (already existed)

### Scheduling.js - State
- ✅ Added `batchEditMode: false` to state
- ✅ Added `selectedTaskIds: []` to state

## 🔨 TODO - Tasks Batch UI (Scheduling.js)

### Files Modified
- `public/dashboard/tiers/professional/scripts/Scheduling.js` (4927 lines)

### Changes Needed

#### 1. Add Batch Toggle Button
Add after task count, before search:
```javascript
<div class="tasks-limit-bar">
    <div class="tasks-limit-counter">
        <span>${taskCount} / 10,000 tasks</span>
    </div>
    <button class="tasks-btn-batch-edit ${this.scheduling_state.batchEditMode ? 'active' : ''}"
            onclick="SchedulingModule.scheduling_toggleBatchMode()">
        <svg>...</svg>
        ${this.scheduling_state.batchEditMode ? `Cancel (${selectedCount} selected)` : 'Edit Multiple'}
    </button>
</div>
```

#### 2. Add Batch Actions Bar
Show when `batchEditMode && selectedTaskIds.length > 0`:
```javascript
<div class="tasks-batch-actions">
    <button class="tasks-batch-btn tasks-batch-btn-complete" onclick="SchedulingModule.scheduling_batchComplete()">
        Complete Selected (${selectedCount})
    </button>
    <button class="tasks-batch-btn tasks-batch-btn-delete" onclick="SchedulingModule.scheduling_batchDelete()">
        Delete Selected (${selectedCount})
    </button>
</div>
```

#### 3. Add Checkboxes to Task Cards
When in batch mode, prepend checkbox to each task card:
```javascript
${this.scheduling_state.batchEditMode ? `
    <div class="tasks-card-checkbox">
        <input type="checkbox"
               class="tasks-checkbox-input"
               ${isSelected ? 'checked' : ''}
               onclick="SchedulingModule.scheduling_toggleTaskSelection('${task.id}')">
        <div class="tasks-checkbox-custom">
            <svg>...</svg>
        </div>
    </div>
` : ''}
```

#### 4. Add Batch Functions
```javascript
scheduling_toggleBatchMode() {
    this.scheduling_state.batchEditMode = !this.scheduling_state.batchEditMode;
    if (!this.scheduling_state.batchEditMode) {
        this.scheduling_state.selectedTaskIds = [];
    }
    this.scheduling_render();
},

scheduling_toggleTaskSelection(taskId) {
    const index = this.scheduling_state.selectedTaskIds.indexOf(taskId);
    if (index > -1) {
        this.scheduling_state.selectedTaskIds.splice(index, 1);
    } else {
        this.scheduling_state.selectedTaskIds.push(taskId);
    }
    this.scheduling_render();
},

async scheduling_batchComplete() {
    if (this.scheduling_state.selectedTaskIds.length === 0) return;

    try {
        await API.batchCompleteTasks(this.scheduling_state.selectedTaskIds);
        this.scheduling_showNotification(`Completed ${this.scheduling_state.selectedTaskIds.length} task(s)`, 'success');

        this.scheduling_state.selectedTaskIds = [];
        this.scheduling_state.batchEditMode = false;
        await this.scheduling_loadTasks();
        this.scheduling_render();
    } catch (error) {
        console.error('Batch complete error:', error);
        this.scheduling_showNotification('Failed to complete tasks', 'error');
    }
},

async scheduling_batchDelete() {
    if (this.scheduling_state.selectedTaskIds.length === 0) return;

    // Show confirmation modal
    // ...then call:
    try {
        await API.batchDeleteTasks(this.scheduling_state.selectedTaskIds);
        this.scheduling_showNotification(`Deleted ${this.scheduling_state.selectedTaskIds.length} task(s)`, 'success');

        this.scheduling_state.selectedTaskIds = [];
        this.scheduling_state.batchEditMode = false;
        await this.scheduling_loadTasks();
        this.scheduling_render();
    } catch (error) {
        console.error('Batch delete error:', error);
        this.scheduling_showNotification('Failed to delete tasks', 'error');
    }
}
```

## 🔨 TODO - Leads Batch UI (Leads.js)

### Files Modified
- `public/dashboard/tiers/professional/scripts/Leads.js` (4422 lines)

### Changes Needed
Same pattern as Tasks, but with:
- `addlead_state.batchEditMode`
- `addlead_state.selectedLeadIds`
- Batch delete button (no complete needed for leads)

## 🔨 TODO - Estimates Batch Operations

### Files Modified
- `public/dashboard/tiers/professional/scripts/Estimates.js`

### Current Status
- ✅ Has batch UI already
- ❌ Batch operations use loops instead of batch APIs

### Changes Needed
Update these functions to use new batch APIs:
1. `estimates_batchMarkSent()` → use `API.batchUpdateEstimates(ids, {status: 'sent'})`
2. `estimates_batchMarkAccepted()` → use `API.batchUpdateEstimates(ids, {status: 'accepted'})`
3. `estimates_batchDelete()` → use `API.batchDeleteEstimates(ids)`

## 📝 TODO - Update Handoff Doc

Add section documenting all batch operations:

```markdown
## 🔋 BATCH OPERATIONS - WE LOVE BATCHING!

SteadyManager Pro implements efficient batch operations across all major modules for performance and UX.

### Modules with Batch UI
- ✅ **Goals** - Complete, Reset, Delete (multiple selection)
- ✅ **Tasks** - Complete, Delete (multiple selection)
- ✅ **Leads** - Delete (multiple selection)
- ✅ **Estimates** - Mark Sent, Mark Accepted, Delete (multiple selection)

### Batch APIs Available
| Module | Batch Update | Batch Delete | Batch Complete/Action |
|--------|-------------|--------------|---------------------|
| Leads | `batchUpdateLeads()` | `batchDeleteLeads()` | - |
| Tasks | `batchUpdateTasks()` | `batchDeleteTasks()` | `batchCompleteTasks()` |
| Goals | `updateGoal()` (loop) | Delete (loop) | Complete/Reset (loop) |
| Estimates | `batchUpdateEstimates()` ✨ NEW | `batchDeleteEstimates()` ✨ NEW | - |

### Performance Benefits
- **Single DB Transaction** - All updates in one query
- **Reduced Network Calls** - 100 deletes = 1 API call instead of 100
- **Atomic Operations** - All succeed or all fail
- **User Experience** - No loading spinner spam

### UI Pattern (Goals-style)
1. "Edit Multiple" button (shows selection count when active)
2. Checkboxes appear on all cards
3. Click cards to toggle selection
4. Batch action bar appears at bottom
5. Actions: Complete/Delete/Status Change
```

## Estimated Implementation Time
- Tasks Batch UI: 1-2 hours
- Leads Batch UI: 1-2 hours
- Estimates API integration: 30 minutes
- Handoff doc update: 15 minutes
- **Total: 3-4 hours**

## Testing Checklist
- [ ] Tasks: Select multiple, complete batch
- [ ] Tasks: Select multiple, delete batch
- [ ] Leads: Select multiple, delete batch
- [ ] Estimates: Select multiple, mark sent
- [ ] Estimates: Select multiple, mark accepted
- [ ] Estimates: Select multiple, delete
- [ ] All: Cancel batch mode clears selection
- [ ] All: Batch operations show loading state
- [ ] All: Success/error toasts work
- [ ] All: Data refreshes after batch operation
