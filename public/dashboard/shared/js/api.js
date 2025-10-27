/**
 * SUPABASE-POWERED API TOOLBOX v2.0
 * Direct database calls with automatic security via RLS
 * Now with 2FA, Account Management, and Export features
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
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select();
    
    if (error) throw error;
    return data[0];
  }

  static async deleteLead(leadId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { error } = await supabase.rpc('delete_lead_with_decrement', {
            lead_id: leadId,
            user_id_val: user.id
        });
        
        if (error) throw error;
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
  // 2FA / MULTI-FACTOR AUTHENTICATION
  // =====================================================
  // NOTE: 2FA functionality removed as per HANDOFF.md
  // Reserved for Professional tier in future releases
  // Free tier users do not have access to 2FA features


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
  // DUPLICATE DETECTION (client-side)
  // =====================================================
  
  static async checkDuplicates(leadData) {
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
            
            // SIMILAR MATCHES (NEW - Simple approach)
            
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
        return { hasExactDuplicates: false, hasSimilarLeads: false };
    }
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
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  // =====================================================
  // JOBS (Pro Tier - Better Google Sheets for Financials)
  // =====================================================

  static async getJobs(filters = {}) {
    let query = supabase
      .from('jobs')
      .select('*')
      .order('scheduled_date', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.job_type) query = query.eq('job_type', filters.job_type);
    if (filters.lead_id) query = query.eq('lead_id', filters.lead_id);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async createJob(jobData) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('jobs')
      .insert([{ ...jobData, user_id: user.id }])
      .select();

    if (error) throw error;
    return data[0];
  }

  static async updateJob(jobId, updates) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select();

    if (error) throw error;
    return data[0];
  }

  static async deleteJob(jobId) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);

    if (error) throw error;
    return { success: true };
  }

  static async completeJob(jobId, finalPrice, laborHours, materials = []) {
    const updates = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      final_price: finalPrice,
      labor_hours: laborHours,
      materials: materials
    };

    return await this.updateJob(jobId, updates);
  }

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

  static async getJobsByLead(leadId) {
    return await this.getJobs({ lead_id: leadId });
  }

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

  // =====================================================
  // GOALS (Pro Tier - Apple Watch Style Goal Tracking)
  // =====================================================

  static async getGoals(status = 'active') {
    let query = supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

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

  static async updateGoalProgress(goalId, value) {
    return await this.updateGoal(goalId, { current_value: value });
  }

  static async checkGoalCompletion() {
    const goals = await this.getGoals('active');
    const completed = goals.filter(g => g.current_value >= g.target_value);

    for (const goal of completed) {
      await this.updateGoal(goal.id, { status: 'completed' });
    }

    return { completedCount: completed.length, completed };
  }

  static async getGoalProgress() {
    const goals = await this.getGoals();

    return goals.map(goal => ({
      ...goal,
      progress: goal.target_value > 0
        ? Math.round((goal.current_value / goal.target_value) * 100)
        : 0,
      remaining: Math.max(0, goal.target_value - goal.current_value),
      daysRemaining: this.calculateDaysUntil(goal.end_date)
    }));
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

  static handleAPIError(error, context = '') {
    console.error(`API Error in ${context}:`, error);
    
    if (error.message.includes('Lead limit reached')) {
      return 'Lead limit reached. Upgrade to add more leads!';
    }
    
    if (error.message.includes('Task limit reached')) {
      return 'Task limit reached (10,000 max).';
    }
    
    if (error.message.includes('verify your email')) {
      return 'Please verify your email before logging in.';
    }
    
    return error.message || 'Something went wrong. Please try again.';
  }
}

// Export
const API = TierScalingAPI;
window.API = API;
window.escapeHtml = TierScalingAPI.escapeHtml;

export default API;

console.log('Supabase-powered API v3.0 loaded');
console.log('✅ Direct database calls with RLS security');
console.log('✨ NEW: Jobs, Goals, Preferences, Enhanced Leads');