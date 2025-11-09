/**
 * SUPABASE-POWERED API TOOLBOX v4.0
 * Direct database calls with automatic security via RLS
 * 
 * NEW IN v4.0:
 * - Server-side duplicate detection (faster)
 * - Batch operations for bulk updates/deletes
 * - Full schema field coverage (all jobs/goals fields exposed)
 * - Enhanced error handling with categorization
 * - Goal auto-tracking support (requires DB triggers)
 * - Performance optimizations
 */

import { supabase } from './supabase.js'

class TierScalingAPI {
  
  // =====================================================
  // AUTHENTICATION
  // =====================================================
  
  static async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Check if email is verified
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error('Please verify your email before logging in');
    }
    
    return data;
  }

  static async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = '/auth/login.html';
  }

  static async register(email, password, userType = 'free') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback.html`,
        data: { user_type: userType }
      }
    });
    
    if (error) throw error;
    return { success: true, message: 'Check your email to verify your account!' };
  }

  /**
   * Upgrade to 14-day Professional Trial
   * NOTE: This function calls a SECURITY DEFINER database function because
   * user_type, trial dates, and lead limits are protected by RLS trigger
   * and cannot be updated directly from the client.
   */
  static async upgradeToTrial() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user already used their trial
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('trial_end_date, user_type')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Block if trial was already used (trial_end_date is not null)
    if (profile.trial_end_date !== null) {
      throw new Error('You have already used your free trial. Upgrade to a paid plan to unlock Pro features.');
    }

    // Block if already on professional tier
    if (profile.user_type === 'professional' || profile.user_type === 'professional_trial') {
      throw new Error('You are already on a professional plan.');
    }

    // Call secure database function to upgrade (bypasses RLS protection)
    const { data, error } = await supabase.rpc('upgrade_to_trial');

    if (error) throw error;
    return { success: true, data };
  }

  static async checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    return { authenticated: !!session, user: session?.user };
  }

  static async resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password.html`
    });
    
    if (error) throw error;
    return { success: true, message: 'Password reset email sent!' };
  }

  static async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return { success: true, message: 'Password updated successfully!' };
  }

  /**
   * Check if user has accepted Terms of Service
   * Returns acceptance status and timestamp
   */
  static async checkTosAcceptance() {
    const profile = await this.getProfile();
    return {
      accepted: profile.tos_accepted_at !== null,
      acceptedAt: profile.tos_accepted_at,
      version: profile.tos_version
    };
  }

  /**
   * Accept Terms of Service
   * Calls secure database function that updates tos_accepted_at field
   * This field is protected and can only be set once via SECURITY DEFINER function
   */
  static async acceptTos(version = '1.0') {
    const { data, error } = await supabase.rpc('accept_terms_of_service', {
      version: version
    });

    if (error) throw error;
    return { success: true, data };
  }

  // =====================================================
  // USER PROFILE
  // =====================================================
  
  static async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getUserProfile() {
    return await this.getProfile();
  }

  static async getSettings() {
    return await this.getProfile();
  }

  static async updateProfile(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async updateSettings(settings) {
    return await this.updateProfile({ settings });
  }

  static async updateUserGoals(goals) {
    return await this.updateProfile({ goals });
  }

  static async getUserSubscriptionInfo() {
    const profile = await this.getProfile();
    return {
      tier: profile.user_type,
      leadLimit: profile.current_lead_limit,
      currentLeads: profile.current_leads,
      isAdmin: profile.user_type === 'admin'
    };
  }

  /**
   * NEW: Verify user has access to a specific tier
   * @param {string} requiredTier - 'free' or 'professional' or 'business' or 'enterprise' or 'admin'
   * @returns {Object} { authorized: boolean, userTier: string, message: string }
   */
  static async verifyTierAccess(requiredTier) {
    try {
      const profile = await this.getProfile();
      const userTier = profile.user_type;

      // Define tier hierarchies
      const tierHierarchy = {
        'free': ['free'],
        'professional': ['professional', 'professional_trial', 'business', 'enterprise', 'admin'],
        'business': ['business', 'enterprise', 'admin'],
        'enterprise': ['enterprise', 'admin'],
        'admin': ['admin']
      };

      const allowedTiers = tierHierarchy[requiredTier] || [];
      const authorized = allowedTiers.includes(userTier);

      if (!authorized) {
        console.warn(`🚫 Unauthorized tier access attempt: ${userTier} tried to access ${requiredTier} tier`);
      }

      return {
        authorized,
        userTier,
        requiredTier,
        message: authorized
          ? `Access granted to ${requiredTier} tier`
          : `Access denied: ${userTier} tier cannot access ${requiredTier} features`
      };

    } catch (error) {
      console.error('Tier verification error:', error);
      return {
        authorized: false,
        userTier: 'unknown',
        requiredTier,
        message: 'Tier verification failed'
      };
    }
  }

  // =====================================================
  // LEADS MANAGEMENT
  // =====================================================
  
  static async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      cold: data.filter(l => l.type === 'cold'),
      warm: data.filter(l => l.type === 'warm'),
      all: data
    };
  }

  static async createLead(leadData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        // Get user's current lead count and limit
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('user_type, current_lead_limit, current_leads')
            .eq('id', user.id)
            .single();
        
        if (userError) throw userError;
        
        const { current_leads, current_lead_limit, user_type } = userData;
        
        // Check if at limit
        if (current_leads >= current_lead_limit) {
            if (user_type === 'free') {
                throw new Error(`FREE_TIER_LIMIT:You've reached the free tier limit of ${current_lead_limit} leads. Upgrade to Pro for 5,000 leads!`);
            } else {
                throw new Error(`PRO_TIER_LIMIT:You've reached the tier limit of ${current_lead_limit} leads.`);
            }
        }
        
        // Insert lead and increment counter in a transaction
        const { data, error } = await supabase.rpc('create_lead_with_increment', {
            lead_data: { ...leadData, user_id: user.id }
        });
        
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Create lead error:', error);
        throw error;
    }
  }

  static async updateLead(leadId, updates) {
    // Use RPC function to safely update leads (bypasses any triggers blocking manual updates)
    const { data, error } = await supabase.rpc('update_lead_safe', {
      lead_id_val: leadId,
      lead_updates: updates
    });

    if (error) throw error;
    return data?.[0];
  }

  static async deleteLead(leadId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Step 1: Orphan any estimates linked to this lead (preserve them)
        await supabase
            .from('estimates')
            .update({ lead_id: null })
            .eq('lead_id', leadId)
            .eq('user_id', user.id);

        // Step 2: Delete the lead (tasks cascade automatically)
        const { error: deleteError } = await supabase
            .from('leads')
            .delete()
            .eq('id', leadId)
            .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // Step 3: Decrement the user's current_leads counter
        const { data: userData } = await supabase
            .from('users')
            .select('current_leads')
            .eq('id', user.id)
            .single();

        if (userData) {
            await supabase
                .from('users')
                .update({ current_leads: Math.max(0, (userData.current_leads || 0) - 1) })
                .eq('id', user.id);
        }

        return { success: true };

    } catch (error) {
        console.error('Delete lead error:', error);
        throw error;
    }
  }

  static async getLeadById(leadId) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async searchLeads(query) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`);
    
    if (error) throw error;
    return { success: true, results: data, count: data.length };
  }

  // Smart lead helpers
  static async getLeadsByType(type = 'all') {
    const leads = await this.getLeads();
    if (type === 'all') return leads.all || [];
    return leads[type] || [];
  }

  static async getLeadsByStatus(status) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', status);
    
    if (error) throw error;
    return data;
  }

  static async updateLeadStatus(leadId, status, notes = '') {
    return await this.updateLead(leadId, {
      status,
      notes,
      last_contact_date: new Date().toISOString().split('T')[0]
    });
  }

  static async getRecentLeads(limit = 5) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }

  // =====================================================
  // LEADS - BATCH OPERATIONS
  // =====================================================

  /**
   * Update multiple leads at once
   * Example: batchUpdateLeads(['id1', 'id2'], { status: 'contacted' })
   */
  static async batchUpdateLeads(leadIds, updates) {
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error('leadIds must be a non-empty array');
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .in('id', leadIds)
      .select();

    if (error) throw error;
    return { success: true, updated: data.length, leads: data };
  }

  /**
   * Delete multiple leads at once
   * WARNING: This will decrement lead counter for each deleted lead
   */
  static async batchDeleteLeads(leadIds) {
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      throw new Error('leadIds must be a non-empty array');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Step 1: Orphan any estimates linked to these leads
    await supabase
        .from('estimates')
        .update({ lead_id: null })
        .in('lead_id', leadIds)
        .eq('user_id', user.id);

    // Step 2: Delete all leads
    const { error: deleteError, count } = await supabase
        .from('leads')
        .delete({ count: 'exact' })
        .in('id', leadIds)
        .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    // Step 3: Decrement counter by the number deleted
    const deletedCount = count || 0;
    if (deletedCount > 0) {
        const { data: userData } = await supabase
            .from('users')
            .select('current_leads')
            .eq('id', user.id)
            .single();

        if (userData) {
            await supabase
                .from('users')
                .update({ current_leads: Math.max(0, (userData.current_leads || 0) - deletedCount) })
                .eq('id', user.id);
        }
    }

    return { success: true, deleted: deletedCount };
  }

  /**
   * Archive leads (soft delete by setting archived_at timestamp)
   * Requires: ALTER TABLE leads ADD COLUMN archived_at TIMESTAMPTZ;
   */
  static async archiveLeads(leadIds) {
    return await this.batchUpdateLeads(leadIds, {
      archived_at: new Date().toISOString()
    });
  }

  /**
   * Unarchive leads
   */
  static async unarchiveLeads(leadIds) {
    return await this.batchUpdateLeads(leadIds, {
      archived_at: null
    });
  }

  // =====================================================
  // DUPLICATE DETECTION (Server-Side - Fast)
  // =====================================================
  
  /**
   * NEW v4.0: Server-side duplicate detection
   * Requires database function (see SQL migration below)
   * Falls back to client-side if function doesn't exist
   */
  static async checkDuplicates(leadData) {
    try {
      // Try server-side duplicate detection first (faster)
      const { data, error } = await supabase.rpc('check_lead_duplicates', {
        check_email: leadData.email || null,
        check_name: leadData.name || null,
        check_company: leadData.company || null,
        check_phone: leadData.phone || null
      });

      if (error) {
        // If function doesn't exist, fall back to client-side
        console.warn('Server-side duplicate check failed, using client-side fallback');
        return await this._checkDuplicatesClientSide(leadData);
      }

      return {
        hasExactDuplicates: data.exact.length > 0,
        hasSimilarLeads: data.similar.length > 0,
        exact: data.exact,
        similar: data.similar
      };

    } catch (error) {
      console.error('Duplicate check failed:', error);
      return { hasExactDuplicates: false, hasSimilarLeads: false, exact: [], similar: [] };
    }
  }

  /**
   * Client-side duplicate detection (fallback)
   * Same logic as v3.0
   */
  static async _checkDuplicatesClientSide(leadData) {
    const duplicates = { exact: [], similar: [] };
    
    try {
        const existingLeads = await this.getLeads();
        const allLeads = existingLeads.all || [];
        
        for (const existing of allLeads) {
            // EXACT MATCHES
            
            // Exact email match
            if (leadData.email && existing.email &&
                leadData.email.toLowerCase() === existing.email.toLowerCase()) {
                duplicates.exact.push({
                    lead: existing,
                    reason: 'Exact email match',
                    confidence: 100
                });
                continue;
            }
            
            // Exact name + company match
            if (leadData.name && existing.name && leadData.company && existing.company) {
                const nameMatch = leadData.name.toLowerCase().trim() === existing.name.toLowerCase().trim();
                const companyMatch = leadData.company.toLowerCase().trim() === existing.company.toLowerCase().trim();
                
                if (nameMatch && companyMatch) {
                    duplicates.exact.push({
                        lead: existing,
                        reason: 'Exact name and company match',
                        confidence: 100
                    });
                    continue;
                }
            }
            
            // SIMILAR MATCHES
            
            let confidence = 0;
            const reasons = [];
            
            // Same name = 70% confidence
            if (leadData.name && existing.name) {
                const nameMatch = leadData.name.toLowerCase().trim() === existing.name.toLowerCase().trim();
                if (nameMatch) {
                    confidence = 70;
                    reasons.push('Same name');
                }
            }
            
            // Same company adds +20% confidence
            if (leadData.company && existing.company && confidence > 0) {
                const companyMatch = leadData.company.toLowerCase().trim() === existing.company.toLowerCase().trim();
                if (companyMatch) {
                    confidence += 20;
                    reasons.push('same company');
                }
            }
            
            // Same phone adds +30% confidence
            if (leadData.phone && existing.phone) {
                const phone1 = leadData.phone.replace(/\D/g, '');
                const phone2 = existing.phone.replace(/\D/g, '');
                if (phone1 === phone2 && phone1.length >= 10) {
                    confidence += 30;
                    reasons.push('same phone');
                }
            }
            
            // If confidence is 60% or higher, it's a similar lead
            if (confidence >= 60) {
                duplicates.similar.push({
                    lead: existing,
                    reason: reasons.join(', '),
                    confidence: confidence
                });
            }
        }
        
        // Sort similar leads by confidence (highest first)
        duplicates.similar.sort((a, b) => b.confidence - a.confidence);
        
        return {
            hasExactDuplicates: duplicates.exact.length > 0,
            hasSimilarLeads: duplicates.similar.length > 0,
            ...duplicates
        };
        
    } catch (error) {
        console.error('Duplicate check failed:', error);
        return { hasExactDuplicates: false, hasSimilarLeads: false, exact: [], similar: [] };
    }
  }

  // =====================================================
  // TASKS MANAGEMENT
  // =====================================================
  
  static async createTask(taskData) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check task count first
    const { count, error: countError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (countError) throw countError;
    
    if (count >= 10000) {
      throw new Error('Task limit reached (10,000 max)');
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...taskData, user_id: user.id }])
      .select();
    
    if (error) throw error;
    
    return data[0];
  }

  static async getTasks(filters = {}) {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('task_type', filters.type);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async updateTask(taskId, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async deleteTask(taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) throw error;
    return { success: true };
  }

  static async completeTask(taskId, notes = '') {
    return await this.updateTask(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_notes: notes
    });
  }

  static async createFollowUpTask(leadId, leadName, date, time = null, notes = '') {
    return await this.createTask({
      lead_id: leadId,
      title: `Follow up with ${leadName}`,
      description: notes || 'Follow up call/email scheduled',
      due_date: date,
      due_time: time,
      task_type: 'follow_up',
      status: 'pending'
    });
  }

  static async getTodaysTasks() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('due_date', today)
      .eq('status', 'pending');
    
    if (error) throw error;
    return data;
  }

  static async getOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .lt('due_date', today)
      .eq('status', 'pending');
    
    if (error) throw error;
    return data;
  }

  static async getUpcomingWeek() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', nextWeek.toISOString().split('T')[0])
      .eq('status', 'pending');
    
    if (error) throw error;
    return data;
  }

  // =====================================================
  // TASKS - BATCH OPERATIONS
  // =====================================================

  /**
   * Update multiple tasks at once
   * Example: batchUpdateTasks(['id1', 'id2'], { status: 'completed' })
   */
  static async batchUpdateTasks(taskIds, updates) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('taskIds must be a non-empty array');
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .in('id', taskIds)
      .select();

    if (error) throw error;
    return { success: true, updated: data.length, tasks: data };
  }

  /**
   * Delete multiple tasks at once
   */
  static async batchDeleteTasks(taskIds) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new Error('taskIds must be a non-empty array');
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .in('id', taskIds);

    if (error) throw error;
    return { success: true, deleted: taskIds.length };
  }

  /**
   * Complete multiple tasks at once
   */
  static async batchCompleteTasks(taskIds, notes = '') {
    return await this.batchUpdateTasks(taskIds, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      completion_notes: notes
    });
  }

  /**
   * Delete all completed tasks
   */
  static async deleteCompletedTasks() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (error) throw error;
    return { success: true };
  }

  // =====================================================
  // STATISTICS
  // =====================================================
  
  static async getBasicStats() {
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('status, type, quality_score, potential_value');
    
    if (leadsError) throw leadsError;

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('status, due_date');
    
    if (tasksError) throw tasksError;

    const today = new Date().toISOString().split('T')[0];
    
    return {
      totalLeads: leads?.length || 0,
      coldLeads: leads?.filter(l => l.type === 'cold').length || 0,
      warmLeads: leads?.filter(l => l.type === 'warm').length || 0,
      avgQualityScore: leads?.length ? 
        Math.round((leads.reduce((sum, l) => sum + (l.quality_score || 5), 0) / leads.length) * 10) / 10 : 0,
      totalPotentialValue: leads?.reduce((sum, l) => sum + (parseFloat(l.potential_value) || 0), 0) || 0,
      pendingTasks: tasks?.filter(t => t.status === 'pending').length || 0,
      overdueTasks: tasks?.filter(t => t.status === 'pending' && t.due_date < today).length || 0
    };
  }

  static async getCurrentStats() {
    const profile = await this.getProfile();
    return {
      currentLeads: profile.current_leads || 0,
      currentLeadLimit: profile.current_lead_limit || 50,
      leadsRemaining: Math.max(0, (profile.current_lead_limit || 50) - (profile.current_leads || 0)),
      percentageUsed: Math.round(((profile.current_leads || 0) / (profile.current_lead_limit || 50)) * 100)
    };
  }

  static async getDetailedStats() {
    const basic = await this.getBasicStats();
    const current = await this.getCurrentStats();
    
    return {
      ...basic,
      monthlyProgress: current
    };
  }

  // =====================================================
  // ACCOUNT MANAGEMENT
  // =====================================================
  
  static async deleteAccount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // This deletes the user from Supabase Auth
      // Your database should have CASCADE DELETE set up to:
      // - Delete all leads associated with user
      // - Delete all tasks associated with user
      // - Delete user profile from users table
      
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;
      
      // Sign out after successful deletion
      await supabase.auth.signOut();
      
      return { success: true };
    } catch (error) {
      console.error('Delete account error:', error);
      throw error;
    }
  }

  // =====================================================
  // STRIPE (still needs server)
  // =====================================================
  
  static async createCheckoutSession(plan, email) {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, email })
    });
    
    if (!response.ok) throw new Error('Checkout failed');
    return await response.json();
  }

  static async getStripeConfig() {
    const response = await fetch('/api/stripe-config');
    return await response.json();
  }

  static async getPricingPlans() {
    const response = await fetch('/api/pricing-plans');
    return await response.json();
  }

  // =====================================================
  // JOBS (Pro Tier - Financial Management & Job Tracking)
  // =====================================================

  /**
   * Get all jobs with optional filters
   * @param {Object} filters - Optional filters (status, job_type, lead_id, payment_status)
   * @returns {Promise<Array>} Array of job objects
   */
  static async getJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select('*, leads(name, email, phone)')
      .order('scheduled_date', { ascending: false, nullsFirst: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.job_type) query = query.eq('job_type', filters.job_type);
    if (filters.lead_id) query = query.eq('lead_id', filters.lead_id);
    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);
    if (filters.estimate_id) query = query.eq('estimate_id', filters.estimate_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Get single job by ID with full details
   * @param {string} jobId - Job UUID
   * @returns {Promise<Object>} Job object with lead details
   */
  static async getJobById(jobId) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, leads(name, email, phone, company)')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new job
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Created job object
   */
  static async createJob(jobData) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        ...jobData,
        user_id: user.id,
        status: jobData.status || 'draft',
        materials: jobData.materials || [],
        crew_members: jobData.crew_members || [],
        photos: jobData.photos || []
      }])
      .select();

    if (error) throw error;
    return data[0];
  }

  /**
   * Update an existing job
   * @param {string} jobId - Job UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated job object
   */
  static async updateJob(jobId, updates) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select();

    if (error) throw error;
    return data[0];
  }

  /**
   * Delete a job
   * @param {string} jobId - Job UUID
   * @returns {Promise<Object>} Success response
   */
  static async deleteJob(jobId) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Mark job as completed with final details
   * @param {string} jobId - Job UUID
   * @param {Object} finalData - Final price, actual hours, etc.
   * @returns {Promise<Object>} Updated job object
   */
  static async completeJob(jobId, finalData) {
    const updates = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      final_price: finalData.finalPrice,
      actual_labor_hours: finalData.actualLaborHours,
      materials: finalData.materials || [],
      crew_members: finalData.crewMembers || [],
      notes: finalData.notes || null
    };

    return await this.updateJob(jobId, updates);
  }

  /**
   * Batch update jobs
   * @param {Array<string>} jobIds - Array of job UUIDs
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Result object
   * Example: batchUpdateJobs(['id1', 'id2'], { status: 'completed' })
   */
  static async batchUpdateJobs(jobIds, updates) {
    const response = await fetch(`${this.baseUrl}/jobs/batch-update`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ job_ids: jobIds, updates })
    });

    if (!response.ok) {
      throw new Error(`Batch update failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Batch delete jobs
   * @param {Array<string>} jobIds - Array of job UUIDs to delete
   * @returns {Promise<Object>} Result object
   */
  static async batchDeleteJobs(jobIds) {
    const response = await fetch(`${this.baseUrl}/jobs/batch-delete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ job_ids: jobIds })
    });

    if (!response.ok) {
      throw new Error(`Batch delete failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get jobs by lead ID
   * @param {string} leadId - Lead UUID
   * @returns {Promise<Array>} Array of jobs for this lead
   */
  static async getJobsByLead(leadId) {
    return await this.getJobs({ lead_id: leadId });
  }

  /**
   * Get jobs by payment status
   * @param {string} status - Payment status (pending, partial, paid, overdue)
   * @returns {Promise<Array>} Array of jobs with this payment status
   */
  static async getJobsByPaymentStatus(status) {
    return await this.getJobs({ payment_status: status });
  }

  /**
   * Get scheduled jobs within date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of scheduled jobs
   */
  static async getScheduledJobs(startDate, endDate) {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, leads(name, email, phone)')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Get job statistics (revenue, profit, etc.)
   * @returns {Promise<Object>} Stats object
   */
  static async getJobStats() {
    const jobs = await this.getJobs({ status: 'completed' });

    const totalRevenue = jobs.reduce((sum, j) => sum + (parseFloat(j.final_price || j.quoted_price) || 0), 0);
    const totalCosts = jobs.reduce((sum, j) => sum + (parseFloat(j.total_cost) || 0), 0);
    const totalProfit = jobs.reduce((sum, j) => sum + (parseFloat(j.profit) || 0), 0);
    const avgMargin = jobs.length > 0
      ? jobs.reduce((sum, j) => sum + (parseFloat(j.profit_margin) || 0), 0) / jobs.length
      : 0;

    return {
      totalJobs: jobs.length,
      totalRevenue,
      totalCosts,
      totalProfit,
      avgMargin: Math.round(avgMargin * 10) / 10
    };
  }

  /**
   * Get job profitability report (sorted by profit)
   * @returns {Promise<Array>} Array of jobs with profit metrics
   */
  static async getJobProfitability() {
    const jobs = await this.getJobs({ status: 'completed' });

    return jobs.map(job => ({
      id: job.id,
      title: job.title,
      revenue: parseFloat(job.final_price || job.quoted_price) || 0,
      cost: parseFloat(job.total_cost) || 0,
      profit: parseFloat(job.profit) || 0,
      margin: parseFloat(job.profit_margin) || 0,
      scheduled_date: job.scheduled_date,
      completed_at: job.completed_at
    })).sort((a, b) => b.profit - a.profit);
  }

  // ─────────────────────────────────────────────────────────────
  // DEPOSIT TRACKING
  // ─────────────────────────────────────────────────────────────

  /**
   * Mark deposit as paid
   * @param {string} jobId - Job UUID
   * @param {number} amount - Deposit amount
   * @returns {Promise<Object>} Updated job object
   */
  static async markDepositPaid(jobId, amount) {
    return await this.updateJob(jobId, {
      deposit_amount: amount,
      deposit_paid: true,
      deposit_paid_at: new Date().toISOString()
    });
  }

  /**
   * Update deposit amount
   * @param {string} jobId - Job UUID
   * @param {number} amount - New deposit amount
   * @returns {Promise<Object>} Updated job object
   */
  static async updateDeposit(jobId, amount) {
    return await this.updateJob(jobId, { deposit_amount: amount });
  }

  // ─────────────────────────────────────────────────────────────
  // MATERIALS MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Add material to job
   * @param {string} jobId - Job UUID
   * @param {Object} material - Material object {name, quantity, unit, cost_per_unit, supplier, total}
   * @returns {Promise<Object>} Updated job object
   */
  static async addJobMaterial(jobId, material) {
    const job = await this.getJobById(jobId);
    const materials = job.materials || [];

    materials.push({
      ...material,
      id: crypto.randomUUID(),
      added_at: new Date().toISOString()
    });

    // Recalculate material_cost
    const totalMaterialCost = materials.reduce((sum, m) => sum + (parseFloat(m.total) || 0), 0);

    return await this.updateJob(jobId, {
      materials,
      material_cost: totalMaterialCost
    });
  }

  /**
   * Update materials list and recalculate cost
   * @param {string} jobId - Job UUID
   * @param {Array} materials - New materials array
   * @returns {Promise<Object>} Updated job object
   */
  static async updateJobMaterials(jobId, materials) {
    const totalMaterialCost = materials.reduce((sum, m) => sum + (parseFloat(m.total) || 0), 0);

    return await this.updateJob(jobId, {
      materials,
      material_cost: totalMaterialCost
    });
  }

  /**
   * Remove material from job
   * @param {string} jobId - Job UUID
   * @param {string} materialId - Material ID to remove
   * @returns {Promise<Object>} Updated job object
   */
  static async removeJobMaterial(jobId, materialId) {
    const job = await this.getJobById(jobId);
    const materials = (job.materials || []).filter(m => m.id !== materialId);

    return await this.updateJobMaterials(jobId, materials);
  }

  // ─────────────────────────────────────────────────────────────
  // CREW MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Add crew member to job
   * @param {string} jobId - Job UUID
   * @param {Object} crewMember - Crew object {name, hours, rate, total}
   * @returns {Promise<Object>} Updated job object
   */
  static async addJobCrewMember(jobId, crewMember) {
    const job = await this.getJobById(jobId);
    const crewMembers = job.crew_members || [];

    crewMembers.push({
      ...crewMember,
      id: crypto.randomUUID(),
      added_at: new Date().toISOString()
    });

    return await this.updateJob(jobId, { crew_members: crewMembers });
  }

  /**
   * Update crew members list
   * @param {string} jobId - Job UUID
   * @param {Array} crewMembers - New crew array
   * @returns {Promise<Object>} Updated job object
   */
  static async updateJobCrew(jobId, crewMembers) {
    return await this.updateJob(jobId, { crew_members: crewMembers });
  }

  /**
   * Remove crew member from job
   * @param {string} jobId - Job UUID
   * @param {string} crewMemberId - Crew member ID to remove
   * @returns {Promise<Object>} Updated job object
   */
  static async removeJobCrewMember(jobId, crewMemberId) {
    const job = await this.getJobById(jobId);
    const crewMembers = (job.crew_members || []).filter(c => c.id !== crewMemberId);

    return await this.updateJobCrew(jobId, crewMembers);
  }

  // ─────────────────────────────────────────────────────────────
  // PHOTO MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Add photo to job
   * @param {string} jobId - Job UUID
   * @param {Object} photo - Photo object {url, type, caption}
   * @returns {Promise<Object>} Updated job object
   */
  static async addJobPhoto(jobId, photo) {
    const job = await this.getJobById(jobId);
    const photos = job.photos || [];

    photos.push({
      ...photo,
      id: crypto.randomUUID(),
      uploaded_at: new Date().toISOString()
    });

    return await this.updateJob(jobId, { photos });
  }

  /**
   * Update photos list
   * @param {string} jobId - Job UUID
   * @param {Array} photos - New photos array
   * @returns {Promise<Object>} Updated job object
   */
  static async updateJobPhotos(jobId, photos) {
    return await this.updateJob(jobId, { photos });
  }

  /**
   * Remove photo from job
   * @param {string} jobId - Job UUID
   * @param {string} photoId - Photo ID to remove
   * @returns {Promise<Object>} Updated job object
   */
  static async removeJobPhoto(jobId, photoId) {
    const job = await this.getJobById(jobId);
    const photos = (job.photos || []).filter(p => p.id !== photoId);

    return await this.updateJobPhotos(jobId, photos);
  }

  /**
   * Upload photo to Supabase Storage
   * @param {File} file - File object from input
   * @param {string} jobId - Job UUID
   * @param {string} type - Photo type (before, during, after)
   * @returns {Promise<string>} Public URL of uploaded photo
   */
  static async uploadJobPhoto(file, jobId, type) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${jobId}/${type}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('job-photos')
      .upload(fileName, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('job-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Delete photo from Supabase Storage
   * @param {string} photoUrl - Photo URL to delete
   * @returns {Promise<void>}
   */
  static async deleteJobPhotoFile(photoUrl) {
    // Extract file path from URL
    const path = photoUrl.split('/job-photos/').pop();

    const { error } = await supabase.storage
      .from('job-photos')
      .remove([path]);

    if (error) throw error;
  }

  // ─────────────────────────────────────────────────────────────
  // INVOICE & PAYMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Update job invoice details
   * @param {string} jobId - Job UUID
   * @param {string} invoiceNumber - Invoice number
   * @param {string} paymentStatus - Payment status
   * @returns {Promise<Object>} Updated job object
   */
  static async updateJobInvoice(jobId, invoiceNumber, paymentStatus) {
    return await this.updateJob(jobId, {
      invoice_number: invoiceNumber,
      payment_status: paymentStatus
    });
  }

  /**
   * Mark job as fully paid
   * @param {string} jobId - Job UUID
   * @returns {Promise<Object>} Updated job object
   */
  static async markJobPaid(jobId) {
    return await this.updateJob(jobId, {
      payment_status: 'paid',
      status: 'paid'
    });
  }

  /**
   * Generate unique invoice number
   * @returns {Promise<string>} Invoice number (e.g., "INV-2025-001")
   */
  static async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const { data: jobs } = await supabase
      .from('jobs')
      .select('invoice_number')
      .like('invoice_number', `INV-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (jobs && jobs.length > 0 && jobs[0].invoice_number) {
      const lastNumber = parseInt(jobs[0].invoice_number.split('-').pop());
      nextNumber = lastNumber + 1;
    }

    return `INV-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

// =====================================================
// ESTIMATES (Pro Tier - Quote Management)
// =====================================================

  /**
   * Get all estimates with optional filters
   * @param {Object} filters - Filter criteria {status, lead_id}
   * @returns {Promise<Array>} Array of estimate objects
   */
  static async getEstimates(filters = {}) {
    let query = supabase
      .from('estimates')
      .select('*, leads(name, email, phone, company)')
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.lead_id) query = query.eq('lead_id', filters.lead_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Get estimate by ID
   * @param {string} estimateId - Estimate UUID
   * @returns {Promise<Object>} Estimate object
   */
  static async getEstimateById(estimateId) {
    const { data, error } = await supabase
      .from('estimates')
      .select('*, leads(name, email, phone, company)')
      .eq('id', estimateId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create new estimate
   * @param {Object} estimateData - Estimate data object
   * @returns {Promise<Object>} Created estimate object
   */
  static async createEstimate(estimateData) {
    // Generate estimate number
    const estimateNumber = await this.generateEstimateNumber();

    const { data, error } = await supabase
      .from('estimates')
      .insert([{
        ...estimateData,
        estimate_number: estimateNumber,
        user_id: (await supabase.auth.getUser()).data.user.id
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update estimate
   * @param {string} estimateId - Estimate UUID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated estimate object
   */
  static async updateEstimate(estimateId, updates) {
    const { data, error } = await supabase
      .from('estimates')
      .update(updates)
      .eq('id', estimateId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete estimate
   * @param {string} estimateId - Estimate UUID
   * @returns {Promise<void>}
   */
  static async deleteEstimate(estimateId) {
    // Delete associated photos from storage first
    const estimate = await this.getEstimateById(estimateId);
    if (estimate.photos && estimate.photos.length > 0) {
      for (const photo of estimate.photos) {
        try {
          await this.deleteEstimatePhotoFile(photo.url);
        } catch (err) {
          console.warn('Failed to delete photo file:', err);
        }
      }
    }

    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', estimateId);

    if (error) throw error;
  }

  /**
   * Generate next estimate number (EST-YYYY-001)
   * @returns {Promise<string>} Next estimate number
   */
  static async generateEstimateNumber() {
    const year = new Date().getFullYear();

    // Get most recent estimate number for this year
    const { data: estimates } = await supabase
      .from('estimates')
      .select('estimate_number')
      .like('estimate_number', `EST-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (estimates && estimates.length > 0 && estimates[0].estimate_number) {
      const lastNumber = parseInt(estimates[0].estimate_number.split('-').pop());
      nextNumber = lastNumber + 1;
    }

    return `EST-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Batch update multiple estimates at once
   * @param {string[]} estimateIds - Array of estimate IDs
   * @param {object} updates - Updates to apply to all estimates
   * @returns {Promise<object>} Success status and updated count
   */
  static async batchUpdateEstimates(estimateIds, updates) {
    if (!Array.isArray(estimateIds) || estimateIds.length === 0) {
      throw new Error('estimateIds must be a non-empty array');
    }

    const { data, error } = await supabase
      .from('estimates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in('id', estimateIds)
      .select();

    if (error) throw error;
    return { success: true, updated: data.length, estimates: data };
  }

  /**
   * Batch delete multiple estimates at once
   * @param {string[]} estimateIds - Array of estimate IDs to delete
   * @returns {Promise<object>} Success status
   */
  static async batchDeleteEstimates(estimateIds) {
    if (!Array.isArray(estimateIds) || estimateIds.length === 0) {
      throw new Error('estimateIds must be a non-empty array');
    }

    const { error} = await supabase
      .from('estimates')
      .delete()
      .in('id', estimateIds);

    if (error) throw error;
    return { success: true, deleted: estimateIds.length };
  }

  // ─────────────────────────────────────────────────────────────
  // ESTIMATE PHOTOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Upload photo to Supabase Storage (estimate-photos bucket)
   * @param {File} file - File object from input
   * @param {string} estimateId - Estimate UUID
   * @param {string} caption - Photo caption
   * @returns {Promise<string>} Public URL of uploaded photo
   */
  static async uploadEstimatePhoto(file, estimateId, caption = '') {
    // Compress image before upload
    const compressedFile = await this.compressImage(file, 1024, 0.8);

    const fileExt = compressedFile.name.split('.').pop();
    const fileName = `${estimateId}/photo-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('estimate-photos')
      .upload(fileName, compressedFile);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('estimate-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Add photo to estimate
   * @param {string} estimateId - Estimate UUID
   * @param {Object} photoData - Photo object {url, caption}
   * @returns {Promise<Object>} Updated estimate object
   */
  static async addEstimatePhoto(estimateId, photoData) {
    const estimate = await this.getEstimateById(estimateId);
    const photos = estimate.photos || [];

    // Enforce 3 photo limit
    if (photos.length >= 3) {
      throw new Error('Maximum 3 photos per estimate');
    }

    photos.push({
      id: crypto.randomUUID(),
      url: photoData.url,
      type: 'reference',
      caption: photoData.caption || '',
      uploaded_at: new Date().toISOString()
    });

    return await this.updateEstimate(estimateId, { photos });
  }

  /**
   * Remove photo from estimate
   * @param {string} estimateId - Estimate UUID
   * @param {string} photoId - Photo ID to remove
   * @returns {Promise<Object>} Updated estimate object
   */
  static async removeEstimatePhoto(estimateId, photoId) {
    const estimate = await this.getEstimateById(estimateId);
    const photo = estimate.photos.find(p => p.id === photoId);

    if (photo) {
      // Delete from storage
      await this.deleteEstimatePhotoFile(photo.url);
    }

    const photos = (estimate.photos || []).filter(p => p.id !== photoId);
    return await this.updateEstimate(estimateId, { photos });
  }

  /**
   * Delete photo from Supabase Storage
   * @param {string} photoUrl - Photo URL to delete
   * @returns {Promise<void>}
   */
  static async deleteEstimatePhotoFile(photoUrl) {
    // Extract file path from URL
    const path = photoUrl.split('/estimate-photos/').pop();

    const { error } = await supabase.storage
      .from('estimate-photos')
      .remove([path]);

    if (error) throw error;
  }

  // ─────────────────────────────────────────────────────────────
  // ESTIMATE STATUS MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  /**
   * Mark estimate as sent
   * @param {string} estimateId - Estimate UUID
   * @returns {Promise<Object>} Updated estimate object
   */
  static async markEstimateSent(estimateId) {
    return await this.updateEstimate(estimateId, {
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  }

  /**
   * Mark estimate as accepted
   * @param {string} estimateId - Estimate UUID
   * @returns {Promise<Object>} Updated estimate object
   */
  static async markEstimateAccepted(estimateId) {
    return await this.updateEstimate(estimateId, {
      status: 'accepted',
      accepted_at: new Date().toISOString()
    });
  }

  /**
   * Mark estimate as rejected
   * @param {string} estimateId - Estimate UUID
   * @returns {Promise<Object>} Updated estimate object
   */
  static async markEstimateRejected(estimateId) {
    return await this.updateEstimate(estimateId, {
      status: 'rejected',
      rejected_at: new Date().toISOString()
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CONVERT ESTIMATE TO JOB
  // ─────────────────────────────────────────────────────────────

  /**
   * Convert accepted estimate to job
   * Copies estimate data, photos (as "before"), and links estimate_id
   * @param {string} estimateId - Estimate UUID
   * @returns {Promise<Object>} Created job object
   */
  static async convertEstimateToJob(estimateId) {
    const estimate = await this.getEstimateById(estimateId);

    // Only convert accepted estimates
    if (estimate.status !== 'accepted') {
      throw new Error('Only accepted estimates can be converted to jobs');
    }

    // Convert estimate photos to job "before" photos
    const jobPhotos = (estimate.photos || []).map(photo => ({
      ...photo,
      type: 'before'  // Change from 'reference' to 'before'
    }));

    // Convert line_items to materials format
    const materials = (estimate.line_items || []).map(item => ({
      id: crypto.randomUUID(),
      name: item.description || item.name,
      quantity: item.quantity || 1,
      unit: item.unit || 'unit',
      cost_per_unit: item.rate || item.cost_per_unit || 0,
      total: item.total || 0,
      supplier: item.supplier || ''
    }));

    // Create job with estimate data
    const jobData = {
      estimate_id: estimate.id,
      lead_id: estimate.lead_id,
      title: estimate.title,
      description: estimate.description,
      quoted_price: estimate.total_price,
      photos: jobPhotos,
      materials: materials,
      notes: estimate.notes,
      status: 'scheduled'  // Start as scheduled
    };

    const job = await this.createJob(jobData);

    // Mark estimate as converted (optional - add 'converted' status if you want)
    // await this.updateEstimate(estimateId, { status: 'converted' });

    return job;
  }

  /**
   * Image compression helper
   * @param {File} file - Image file to compress
   * @param {number} maxWidth - Maximum width in pixels
   * @param {number} quality - JPEG quality (0-1)
   * @returns {Promise<File>} Compressed image file
   */
  static async compressImage(file, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if needed
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              }));
            },
            'image/jpeg',
            quality
          );
        };
      };
    });
  }

// =====================================================
// GOALS (Pro Tier - Apple Watch Style Goal Tracking)
// =====================================================

static async getGoals(status = 'active') {
    let query = supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

    // Only filter by status if explicitly provided (not null/undefined)
    if (status !== null && status !== undefined) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

static async createGoal(goalData) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goalData, user_id: user.id }])
        .select();
    
    if (error) throw error;
    return data[0];
}

static async updateGoal(goalId, updates) {
    const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .select();
    
    if (error) throw error;
    return data[0];
}

static async deleteGoal(goalId) {
    const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

    if (error) throw error;
    return { success: true };
}

/**
 * Batch update multiple goals at once
 * @param {string[]} goalIds - Array of goal IDs
 * @param {object} updates - Updates to apply to all goals
 */
static async batchUpdateGoals(goalIds, updates) {
    if (!Array.isArray(goalIds) || goalIds.length === 0) {
        throw new Error('goalIds must be a non-empty array');
    }

    const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .in('id', goalIds)
        .select();

    if (error) throw error;
    return { success: true, updated: data.length, goals: data };
}

/**
 * Batch delete multiple goals at once
 * @param {string[]} goalIds - Array of goal IDs to delete
 */
static async batchDeleteGoals(goalIds) {
    if (!Array.isArray(goalIds) || goalIds.length === 0) {
        throw new Error('goalIds must be a non-empty array');
    }

    const { error } = await supabase
        .from('goals')
        .delete()
        .in('id', goalIds);

    if (error) throw error;
    return { success: true, deleted: goalIds.length };
}

/**
 * Manual goal progress update
 * Only use this if auto_track is disabled
 */
static async updateGoalProgress(goalId, value) {
    return await this.updateGoal(goalId, { current_value: value });
}

/**
 * Check if any goals have hit their targets
 * Auto-completes goals that reached target_value
 *
 * IMPORTANT: task_list goals don't get marked "completed" - their status is always
 * calculated dynamically based on linked tasks (DB trigger handles current_value updates)
 *
 * Only value-based goals (auto/manual) get marked as completed
 */
static async checkGoalCompletion() {
    const goals = await this.getGoals('active');

    for (const goal of goals) {
        let progress = 0;

        // Calculate progress based on goal type
        if (goal.goal_type === 'task_list') {
            // Task-based goal - DB trigger handles current_value updates
            // Status is always dynamic - only handle recurring reset
            const taskProgress = await this.getTaskGoalProgress(goal.id);
            progress = taskProgress.progress;

            if (progress >= 100 && goal.is_recurring) {
                // Recurring task_list goal - increment count and reset all tasks
                await this.updateGoal(goal.id, {
                    completion_count: (goal.completion_count || 0) + 1,
                    current_value: 0
                });

                const tasks = await this.getGoalTasks(goal.id);
                for (const task of tasks) {
                    await this.updateTask(task.id, {
                        status: 'pending',
                        completed_at: null
                    });
                }
            }
            // Non-recurring task_list goals: NO status change - always stay dynamic

        } else {
            // Value-based goal (auto/manual) - check current vs target
            progress = (goal.current_value / goal.target_value) * 100;

            if (progress >= 100) {
                if (goal.is_recurring) {
                    // Recurring value goal - increment count and reset
                    await this.updateGoal(goal.id, {
                        completion_count: (goal.completion_count || 0) + 1,
                        current_value: 0,
                        status: 'active'
                    });
                } else {
                    // Normal value goal - mark as completed
                    await this.updateGoal(goal.id, {
                        status: 'completed'
                    });
                }
            }
        }
    }
}

/**
 * Get progress for all goals with calculated percentages
 * Handles both value-based and task-based goals
 */
static async getGoalProgress() {
    // Pass null to get ALL goals (active, completed, failed)
    const goals = await this.getGoals(null);
    
    const goalsWithProgress = await Promise.all(goals.map(async goal => {
        let progress = 0;
        let remaining = 0;

        // For ALL goal types (task_list, auto, manual), calculate progress from current_value / target_value
        // The DB trigger keeps current_value accurate for task_list goals
        progress = goal.target_value > 0
            ? Math.round((goal.current_value / goal.target_value) * 100)
            : 0;
        remaining = Math.max(0, goal.target_value - goal.current_value);

        return {
            ...goal,
            progress,
            remaining,
            daysRemaining: this.calculateDaysUntil(goal.end_date)
        };
    }));
    
    return goalsWithProgress;
}

// Goal appearance/settings
static async updateGoalReminder(goalId, remindAt) {
    return await this.updateGoal(goalId, { remind_at: remindAt });
}

static async updateGoalAppearance(goalId, color, icon) {
    return await this.updateGoal(goalId, { color, icon });
}

static async toggleGoalRecurring(goalId, isRecurring) {
    return await this.updateGoal(goalId, { is_recurring: isRecurring });
}

static async getRecurringGoals() {
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('is_recurring', true)
        .eq('status', 'active');
    
    if (error) throw error;
    return data;
}

/**
 * Refresh auto-tracked goals
 * Call this after creating leads/jobs to update goal progress
 * NOTE: If you have database triggers set up, this is automatic
 */
static async refreshGoalProgress() {
    const { data, error } = await supabase.rpc('refresh_goal_progress');
    if (error) throw error;
    return data;
}

// =====================================================
// GOAL TASKS (Task-Based Goals)
// =====================================================

/**
 * Link existing tasks to a goal
 * @param {string} goalId - Goal UUID
 * @param {string[]} taskIds - Array of task UUIDs
 */
static async linkTasksToGoal(goalId, taskIds) {
    const links = taskIds.map(taskId => ({
        goal_id: goalId,
        task_id: taskId
    }));
    
    const { data, error } = await supabase
        .from('goal_tasks')
        .insert(links)
        .select();
    
    if (error) throw error;
    return data;
}

/**
 * Remove task link from goal
 * @param {string} goalId - Goal UUID
 * @param {string} taskId - Task UUID to unlink
 */
static async unlinkTaskFromGoal(goalId, taskId) {
    const { error } = await supabase
        .from('goal_tasks')
        .delete()
        .eq('goal_id', goalId)
        .eq('task_id', taskId);
    
    if (error) throw error;
    return { success: true };
}

/**
 * Get all tasks linked to a goal
 * @param {string} goalId - Goal UUID
 */
static async getGoalTasks(goalId) {
    const { data, error } = await supabase
        .from('goal_tasks')
        .select(`
            id,
            task_id,
            tasks (
                id,
                title,
                description,
                status,
                due_date,
                priority,
                completed_at
            )
        `)
        .eq('goal_id', goalId);
    
    if (error) throw error;
    
    // Flatten the nested structure
    return data.map(link => ({
        link_id: link.id,
        ...link.tasks
    }));
}

/**
 * Create a new task and link it to a goal
 * @param {string} goalId - Goal UUID
 * @param {object} taskData - Task data (title, description, etc)
 */
static async createTaskForGoal(goalId, taskData) {
    // Create the task first
    const task = await this.createTask(taskData);

    // Link it to the goal
    await this.linkTasksToGoal(goalId, [task.id]);

    return task;
}

/**
 * Batch create multiple tasks and link them to a goal
 * Much faster than individual createTaskForGoal calls
 * @param {string} goalId - Goal UUID
 * @param {array} tasksArray - Array of task objects {title, due_date, status, etc}
 */
static async batchCreateTasksForGoal(goalId, tasksArray) {
    if (!tasksArray || tasksArray.length === 0) {
        return { created: 0, tasks: [] };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Add user_id to all tasks
    const tasksWithUserId = tasksArray.map(task => ({
        ...task,
        user_id: user.id,
        status: task.status || 'pending'
    }));

    // Batch insert tasks
    const { data: createdTasks, error: createError } = await supabase
        .from('tasks')
        .insert(tasksWithUserId)
        .select();

    if (createError) throw createError;

    // Extract task IDs
    const taskIds = createdTasks.map(t => t.id);

    // Link all tasks to the goal in one call
    await this.linkTasksToGoal(goalId, taskIds);

    return {
        created: createdTasks.length,
        tasks: createdTasks
    };
}

/**
 * Get task-based goal progress with linked task details
 * @param {string} goalId - Goal UUID
 */
static async getTaskGoalProgress(goalId) {
    const tasks = await this.getGoalTasks(goalId);
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    return {
        total: tasks.length,
        completed: completedTasks.length,
        remaining: tasks.length - completedTasks.length,
        progress: tasks.length > 0 
            ? Math.round((completedTasks.length / tasks.length) * 100)
            : 0,
        tasks: tasks
    };
}

  // =====================================================
  // PREFERENCES (Pro Tier - UI Customization)
  // =====================================================

  static async getPreferences() {
    const profile = await this.getProfile();
    return profile.preferences || {
      windowing_enabled: false,
      command_palette_enabled: true,
      quick_panels_enabled: true,
      default_view: 'dashboard',
      theme: 'light',
      density: 'comfortable',
      animations_enabled: true,
      keyboard_shortcuts_enabled: true
    };
  }

  static async updatePreferences(preferences) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('users')
      .update({ preferences })
      .eq('id', user.id)
      .select();

    if (error) throw error;
    return data[0];
  }

  static async toggleFeature(featureName, enabled) {
    const currentPrefs = await this.getPreferences();
    currentPrefs[featureName] = enabled;
    return await this.updatePreferences(currentPrefs);
  }

  // =====================================================
  // ENHANCED LEADS (Pro Tier - Tags, Position, etc)
  // =====================================================

  static async addLeadTags(leadId, tags) {
    const lead = await this.getLeadById(leadId);
    const currentTags = lead.tags || [];
    const newTags = Array.from(new Set([...currentTags, ...tags]));

    return await this.updateLead(leadId, { tags: newTags });
  }

  static async removeLeadTag(leadId, tag) {
    const lead = await this.getLeadById(leadId);
    const currentTags = lead.tags || [];
    const newTags = currentTags.filter(t => t !== tag);

    return await this.updateLead(leadId, { tags: newTags });
  }

  static async setWinProbability(leadId, probability) {
    if (probability < 0 || probability > 100) {
      throw new Error('Win probability must be between 0 and 100');
    }

    return await this.updateLead(leadId, { win_probability: probability });
  }

  static async setNextAction(leadId, action) {
    return await this.updateLead(leadId, { next_action: action });
  }

  // NEW v4.0: Full schema field coverage for leads
  static async updateLeadSocials(leadId, socials) {
    const updates = {};
    if (socials.linkedin) updates.linkedin_url = socials.linkedin;
    if (socials.facebook) updates.facebook_url = socials.facebook;
    if (socials.twitter) updates.twitter_url = socials.twitter;
    if (socials.instagram) updates.instagram_url = socials.instagram;

    return await this.updateLead(leadId, updates);
  }

  static async updateLeadJobInfo(leadId, jobTitle, department, position) {
    return await this.updateLead(leadId, {
      job_title: jobTitle,
      department: department,
      position: position
    });
  }

  static async updateLeadWebsite(leadId, website) {
    return await this.updateLead(leadId, { website });
  }

  static async updateLeadPlatform(leadId, platform) {
    return await this.updateLead(leadId, { platform });
  }

  static async setLeadFollowUpDate(leadId, date) {
    return await this.updateLead(leadId, { follow_up_date: date });
  }

  static async markLeadLost(leadId, reason) {
    return await this.updateLead(leadId, {
      status: 'lost',
      lost_reason: reason,
      last_contact_date: new Date().toISOString().split('T')[0]
    });
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================
  
  static escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }

  static formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    return new Date(dateTimeString).toLocaleString();
  }

  static calculateDaysUntil(dateString) {
    if (!dateString) return null;

    // Normalize dates to midnight for accurate day counting
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const targetDate = new Date(dateString);
    targetDate.setHours(23, 59, 59, 999); // End of target day

    const diffTime = targetDate - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    // Round down because if we're in the same day, it's 0 days
    // If we're partway through tomorrow, it's still 0 days until tomorrow
    return Math.floor(diffDays);
  }

  static getStatusColor(status) {
    const colors = {
      'new': '#3B82F6',
      'contacted': '#F59E0B',
      'qualified': '#10B981',
      'proposal': '#8B5CF6',
      'negotiation': '#F97316',
      'closed': '#059669',
      'lost': '#EF4444'
    };
    return colors[status?.toLowerCase()] || '#6B7280';
  }

  static getTypeIcon(type) {
    const icons = {
      'cold': '❄️',
      'warm': '🔥',
      'hot': '🌟'
    };
    return icons[type?.toLowerCase()] || '';
  }

  static getPriorityColor(priority) {
    const colors = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#F97316',
      'urgent': '#EF4444'
    };
    return colors[priority?.toLowerCase()] || '#6B7280';
  }

  /**
   * Enhanced error handling with categorization
   */
  static handleAPIError(error, context = '') {
    console.error(`API Error in ${context}:`, error);
    
    // Network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return 'Connection lost. Check your internet and try again.';
    }
    
    // Auth errors
    if (error.message.includes('Invalid login credentials')) {
      return 'Wrong email or password. Try again.';
    }
    
    if (error.message.includes('Email not confirmed')) {
      return 'Please verify your email before logging in.';
    }
    
    if (error.message.includes('verify your email')) {
      return 'Please verify your email before logging in.';
    }
    
    if (error.message.includes('JWT expired')) {
      return 'Your session expired. Please log in again.';
    }
    
    // Permission errors
    if (error.message.includes('new row violates row-level security')) {
      return 'You don\'t have permission to do that.';
    }
    
    if (error.message.includes('permission denied')) {
      return 'You don\'t have permission to access this.';
    }
    
    // Tier limit errors
    if (error.message.includes('FREE_TIER_LIMIT')) {
      const msg = error.message.split(':')[1];
      return msg || 'Lead limit reached. Upgrade to add more leads!';
    }
    
    if (error.message.includes('PRO_TIER_LIMIT')) {
      return 'You\'ve reached your tier limit.';
    }
    
    if (error.message.includes('Lead limit reached')) {
      return 'Lead limit reached. Upgrade to add more leads!';
    }
    
    if (error.message.includes('Task limit reached')) {
      return 'Task limit reached (10,000 max).';
    }
    
    // Trial errors
    if (error.message.includes('already used your free trial')) {
      return 'You\'ve already used your free trial. Upgrade to continue.';
    }
    
    if (error.message.includes('already on a professional plan')) {
      return 'You\'re already on a professional plan.';
    }
    
    // Validation errors
    if (error.message.includes('violates check constraint')) {
      return 'Invalid data. Please check your input.';
    }
    
    if (error.message.includes('duplicate key value')) {
      return 'This record already exists.';
    }
    
    if (error.message.includes('Not authenticated')) {
      return 'Please log in to continue.';
    }
    
    // Generic fallback
    return error.message || 'Something went wrong. Please try again.';
  }
}

// Export
const API = TierScalingAPI;
window.API = API;
window.escapeHtml = TierScalingAPI.escapeHtml;

export default API;

console.log('✨ Supabase-powered API v4.0 loaded');
console.log('🚀 NEW: Server-side duplicates, batch operations, full schema coverage');
console.log('⚡ OPTIMIZED: Better error handling, goal auto-tracking support');