/**
 * SUPABASE-POWERED API TOOLBOX
 * Direct database calls with automatic security via RLS
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

  static async startTrial(email, password) {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback.html`,
        data: { 
          user_type: 'professional_trial',
          trial_end_date: trialEndDate.toISOString()
        }
      }
    });
    
    if (error) throw error;
    return { success: true, message: 'Check your email to activate your 14-day trial!' };
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
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('leads')
      .insert([{ ...leadData, user_id: user.id }])
      .select();
    
    if (error) {
      if (error.message.includes('violates row-level security')) {
        throw new Error('Lead limit reached. Upgrade to add more leads!');
      }
      throw error;
    }
    
    return data[0];
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
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);
    
    if (error) throw error;
    return { success: true };
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
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...taskData, user_id: user.id }])
      .select();
    
    if (error) {
      if (error.message.includes('violates row-level security')) {
        throw new Error('Task limit reached (10,000 max)');
      }
      throw error;
    }
    
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
      }
      
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

console.log('Supabase-powered API loaded');
console.log('Direct database calls with automatic RLS security');