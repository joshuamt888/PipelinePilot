/**
 * 🧰 TIER-SCALING API TOOLBOX - ORGANIZED EDITION
 * 
 * Clean, organized tools that scale with your subscription tier.
 * Your server.js handles security - this handles convenience!
 * 
 * TIER PROGRESSION:
 * 🆓 FREE: Core tools for individual users
 * 💼 PRO: FREE + Advanced analytics & automation  
 * 🏢 BUSINESS: PRO + Team collaboration & workflows
 * ⭐ ENTERPRISE: BUSINESS + Custom reports & integrations
 * 👑 ADMIN: ENTERPRISE + System control & god mode
 * 
 * @version 2.0.0 - Tier-Scaling Edition
 */

class TierScalingAPI {
  // 🔧 CORE REQUEST METHOD - Simple & Clean
 static async request(endpoint, method = 'GET', data = null) {
    try {
        const response = await fetch(endpoint, {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'Referer': window.location.href,        // Add this
                'Origin': window.location.origin        // Add this too
            },
            body: data ? JSON.stringify(data) : null,
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error: ${method} ${endpoint}`, error.message);
        throw error;
    }
}

  // =============================================
  // 🆓 FREE TIER - FOUNDATION TOOLS
  // =============================================

  // 🔐 AUTHENTICATION (All Tiers)
  static async login(email, password, rememberMe = false) {
    return await this.request('/api/login', 'POST', { email, password, rememberMe });
  }

  static async logout() {
    return await this.request('/api/logout', 'POST');
  }

  static async checkAuth() {
    return await this.request('/api/auth/check');
  }

  static async register(email, password, confirmPassword, pendingUpgrade = false, plan = null) {
    return await this.request('/api/register', 'POST', {
      email, password, confirmPassword, pendingUpgrade, plan
    });
  }

  static async startTrial(email, password, confirmPassword) {
    return await this.request('/api/start-trial', 'POST', {
      email, password, confirmPassword
    });
  }

  static async forgotPassword(email) {
    return await this.request('/api/forgot-password', 'POST', { email });
  }

  static async resetPassword(token, password, confirmPassword) {
    return await this.request('/api/reset-password', 'POST', {
      token, password, confirmPassword
    });
  }

  // 👤 USER MANAGEMENT (Free Tier)
  static async getProfile() {
    return await this.request('/api/user/profile');
  }

  static async getUserProfile() {
    return await this.request('/api/user/profile');
  }

  static async getSettings() {
    return await this.request('/api/user/settings');
  }

  static async updateProfile(data) {
    return await this.request('/api/user/settings', 'PUT', data);
  }

  static async updateSettings(settings) {
    return await this.request('/api/user/settings', 'PUT', { settings });
  }

  static async updateUserGoals(goals) {
    return await this.request('/api/user/settings', 'PUT', { goals });
  }

  static async getUserSubscriptionInfo() {
    const profile = await this.getUserProfile();
    return {
      tier: profile.subscriptionTier,
      leadLimit: profile.monthlyLeadLimit,
      currentLeads: profile.currentMonthLeads,
      isAdmin: profile.isAdmin
    };
  }

  static async getLeads() {
  const response = await this.request('/api/leads');
  
  // No field mapping needed - use database fields directly
  return {
    cold: response.cold || [],
    warm: response.warm || [],
    crm: response.crm || [],
    all: response.all || []
  };
}

  static async createLead(leadData) {
  return await this.request('/api/leads', 'POST', leadData);
}

  static async updateLead(leadId, data) {
    // Map camelCase frontend fields to snake_case database fields
    const mappedData = { ...data };
    
    // Field mappings for consistency with database
    if (data.qualityScore !== undefined) {
        mappedData.quality_score = data.qualityScore;
        delete mappedData.qualityScore;
    }
    
    if (data.potentialValue !== undefined) {
    mappedData.potential_value = isNaN(parseFloat(data.potentialValue)) ? 0.00 : parseFloat(data.potentialValue);
    delete mappedData.potentialValue;
}
    
    if (data.followUpDate !== undefined) {
        mappedData.follow_up_date = data.followUpDate;
        delete mappedData.followUpDate;
    }
    
    if (data.lostReason !== undefined) {
        mappedData.lost_reason = data.lostReason;
        delete mappedData.lostReason;
    }
    
    return await this.request(`/api/leads/${leadId}`, 'PUT', mappedData);
}

  static async deleteLead(leadId) {
    return await this.request(`/api/leads/${leadId}`, 'DELETE');
  }

  static async getLeadById(leadId) {
    return await this.request(`/api/leads/${leadId}`);
  }

  static async searchLeads(query) {
    return await this.request('/api/leads/search', 'POST', { query });
  }

  // 🎯 SMART LEAD HELPERS (Perfect for Pipeline.js)
  static async getLeadsByType(type = 'all') {
    const leads = await this.getLeads();
    if (type === 'all') return leads.all || [];
    return leads[type] || [];
  }

  static async getLeadsByStatus(status) {
    const leads = await this.getLeads();
    return leads.all.filter(lead => lead.status === status);
  }

  static async updateLeadStatus(leadId, status, notes = '') {
    return await this.updateLead(leadId, { 
      status: status,
      notes: notes,
      last_contact_date: new Date().toISOString().split('T')[0]
    });
  }

  static async getRecentLeads(limit = 5) {
    const leads = await this.getLeads();
    return leads.all
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  // 📊 ENHANCED STATISTICS (Perfect for Dashboard.js)
  static async getBasicStats() {
    return await this.request('/api/statistics');
  }

  static async getCurrentMonthStats() {
    return await this.request('/api/current-month-stats');
  }

  static async getDetailedStats() {
    const stats = await this.getBasicStats();
    const monthStats = await this.getCurrentMonthStats();
    
    return {
      ...stats,
      monthlyProgress: {
        current: monthStats.currentMonthLeads,
        limit: monthStats.monthlyLeadLimit,
        remaining: monthStats.leadsRemaining,
        percentage: monthStats.percentageUsed
      }
    };
  }

  static async getLeadCountByPlatform() {
    const stats = await this.getBasicStats();
    return stats.platformStats || {};
  }

  static async getProgressTowardGoal(goalType = 'monthly') {
    const profile = await this.getUserProfile();
    const stats = await this.getDetailedStats();
    
    const goals = profile.goals || {};
    const target = goals[goalType] || 50;
    const current = stats.totalLeads || 0;
    
    return {
      current: current,
      target: target,
      percentage: Math.min((current / target) * 100, 100),
      remaining: Math.max(target - current, 0),
      isComplete: current >= target
    };
  }

  // 📅 ENHANCED FOLLOW-UP WITH TIME (replaces addBasicReminder)
static async createFollowUpTask(leadId, leadName, date, time = null, notes = '') {
  const taskData = {
    leadId: leadId,
    title: `Follow up with ${leadName}`,
    description: notes || `Follow up call/email scheduled`,
    dueDate: date,
    dueTime: time, // This will be the new time field
    type: 'follow_up',
    status: 'pending'
  };
  
  return await this.createTask(taskData);
}

// Quick helper for lead creation with follow-up
static async createLeadWithFollowUp(leadData) {
  // Create the lead first
  const newLead = await this.createLead(leadData);
  
  // If they set a follow-up date, create the task
  if (leadData.follow_up_date) {
    await this.createFollowUpTask(
      newLead.id,
      newLead.name,
      leadData.follow_up_date,
      leadData.follow_up_time, // New field we'll add
      leadData.notes ? `Follow up: ${leadData.notes}` : ''
    );
  }
  
  return newLead;
}

  static async createTask(taskData) {
    return await this.request('/api/tasks', 'POST', taskData);
  }

  static async getTasks(filters = {}) {
    let query = '/api/tasks';
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    
    if (params.toString()) {
      query += '?' + params.toString();
    }
    
    return await this.request(query);
  }

  static async getUpcomingReminders() {
    return await this.getTasks({ status: 'pending', type: 'follow_up' });
  }

  static async getTodaysTasks() {
    const today = new Date().toISOString().split('T')[0];
    const allTasks = await this.getTasks({ status: 'pending' });
    return allTasks.filter(task => task.due_date === today);
  }

  static async getOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    const allTasks = await this.getTasks({ status: 'pending' });
    return allTasks.filter(task => task.due_date && task.due_date < today);
  }

  static async getTasksForDateRange(startDate, endDate) {
  const allTasks = await this.getTasks({ status: 'pending' });
  return allTasks.filter(task => {
    if (!task.due_date) return false;
    return task.due_date >= startDate && task.due_date <= endDate;
  });
}

static async getUpcomingWeek() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  return await this.getTasksForDateRange(
    today.toISOString().split('T')[0],
    nextWeek.toISOString().split('T')[0]
  );
}

  static async markReminderComplete(reminderId, notes = '') {
    return await this.request(`/api/tasks/${reminderId}`, 'PUT', {
      status: 'completed',
      completionNotes: notes
    });
  }

  static async completeTask(taskId, notes = '') {
  return await this.request(`/api/tasks/${taskId}`, 'PUT', {
    status: 'completed',
    completed_at: new Date().toISOString(),
    completion_notes: notes || 'Completed from scheduling module'
  });
}

static async updateTask(taskId, data) {
    return await this.request(`/api/tasks/${taskId}`, 'PUT', data);
}

  // 💳 BILLING & STRIPE (All Tiers)
  static async getStripeConfig() {
    return await this.request('/api/stripe-config');
  }

  static async getPricingPlans() {
    return await this.request('/api/pricing-plans');
  }

  static async createCheckoutSession(plan, email) {
    return await this.request('/api/create-checkout-session', 'POST', { plan, email });
  }

  // =============================================
  // 💼 PRO TIER - FREE + ENHANCED TOOLS
  // =============================================

  // 🎯 ADVANCED LEAD MANAGEMENT (Pro Tier+)
  static async bulkImportLeads(csvData) {
    return await this.request('/api/leads/bulk-import', 'POST', { csvData });
  }

  static async exportLeads(format = 'csv') {
    return await this.request(`/api/leads/export?format=${format}`);
  }

  // 🚨 DUPLICATE DETECTION SYSTEM
static async checkDuplicates(leadData) {
  const duplicates = {
    exact: [],
    similar: [],
    suggestions: []
  };
  
  try {
    // Get all existing leads
    const existingLeads = await this.getLeads();
    const allLeads = existingLeads.all || [];
    
    for (const existing of allLeads) {
      let matchScore = 0;
      let matchReasons = [];
      
      // EXACT EMAIL MATCH (immediate duplicate)
      if (leadData.email && existing.email && 
          leadData.email.toLowerCase() === existing.email.toLowerCase()) {
        duplicates.exact.push({
          lead: existing,
          reason: 'Exact email match',
          confidence: 100
        });
        continue; // Skip other checks if exact email match
      }
      
      // NAME MATCHING
      if (leadData.name && existing.name) {
        const nameScore = this.calculateNameSimilarity(leadData.name, existing.name);
        if (nameScore > 80) {
          matchScore += nameScore;
          matchReasons.push(`Name similarity: ${nameScore}%`);
        }
      }
      
      // COMPANY MATCHING
      if (leadData.company && existing.company) {
        const companyScore = this.calculateCompanySimilarity(leadData.company, existing.company);
        if (companyScore > 70) {
          matchScore += companyScore;
          matchReasons.push(`Company similarity: ${companyScore}%`);
        }
      }
      
      // PHONE MATCHING
      if (leadData.phone && existing.phone) {
        const phoneScore = this.calculatePhoneSimilarity(leadData.phone, existing.phone);
        if (phoneScore > 90) {
          matchScore += phoneScore;
          matchReasons.push(`Phone similarity: ${phoneScore}%`);
        }
      }
      
      // CATEGORIZE MATCHES
      if (matchScore > 150) {
        duplicates.similar.push({
          lead: existing,
          reasons: matchReasons,
          confidence: Math.min(matchScore / 2, 95),
          matchScore: matchScore
        });
      } else if (matchScore > 80) {
        duplicates.suggestions.push({
          lead: existing,
          reasons: matchReasons,
          confidence: Math.min(matchScore / 2, 75),
          matchScore: matchScore
        });
      }
    }
    
    // Sort by confidence
    duplicates.similar.sort((a, b) => b.confidence - a.confidence);
    duplicates.suggestions.sort((a, b) => b.confidence - a.confidence);
    
    return {
      hasExactDuplicates: duplicates.exact.length > 0,
      hasSimilarLeads: duplicates.similar.length > 0,
      hasSuggestions: duplicates.suggestions.length > 0,
      ...duplicates
    };
    
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return { hasExactDuplicates: false, hasSimilarLeads: false, hasSuggestions: false };
  }
}

// 🧠 SMART SIMILARITY ALGORITHMS
static calculateNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  
  const clean1 = name1.toLowerCase().trim();
  const clean2 = name2.toLowerCase().trim();
  
  // Exact match
  if (clean1 === clean2) return 100;
  
  // Levenshtein distance for fuzzy matching
  const distance = this.levenshteinDistance(clean1, clean2);
  const maxLength = Math.max(clean1.length, clean2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
}

static calculateCompanySimilarity(company1, company2) {
  if (!company1 || !company2) return 0;
  
  const clean1 = company1.toLowerCase().replace(/inc|llc|corp|ltd|co\.|company/g, '').trim();
  const clean2 = company2.toLowerCase().replace(/inc|llc|corp|ltd|co\.|company/g, '').trim();
  
  if (clean1 === clean2) return 100;
  
  // Check if one contains the other
  if (clean1.includes(clean2) || clean2.includes(clean1)) return 85;
  
  const distance = this.levenshteinDistance(clean1, clean2);
  const maxLength = Math.max(clean1.length, clean2.length);
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.round(similarity);
}

static calculatePhoneSimilarity(phone1, phone2) {
  if (!phone1 || !phone2) return 0;
  
  // Strip all non-digits
  const digits1 = phone1.replace(/\D/g, '');
  const digits2 = phone2.replace(/\D/g, '');
  
  // Exact match
  if (digits1 === digits2) return 100;
  
  // Last 10 digits match (US phone numbers)
  if (digits1.length >= 10 && digits2.length >= 10) {
    const last10_1 = digits1.slice(-10);
    const last10_2 = digits2.slice(-10);
    if (last10_1 === last10_2) return 95;
  }
  
  return 0;
}

// Helper: Levenshtein distance for fuzzy string matching
static levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

  static async mergeLeads(leadIds) {
    return await this.request('/api/leads/merge', 'POST', { leadIds });
  }

  // 📧 COMMUNICATIONS TRACKING (Pro Tier+)
  static async logCommunication(commData) {
    return await this.request('/api/communications', 'POST', commData);
  }

  static async getCommunicationHistory(leadId) {
    return await this.request(`/api/communications?leadId=${leadId}`);
  }

  static async getEmailTemplates() {
    return await this.request('/api/email-templates');
  }

  static async createEmailTemplate(templateData) {
    return await this.request('/api/email-templates', 'POST', templateData);
  }

  static async sendEmailFromTemplate(templateId, leadId, customData = {}) {
    return await this.request('/api/email-templates/send', 'POST', {
      templateId, leadId, customData
    });
  }

  static async getEmailPerformance() {
    return await this.request('/api/communications/email-performance');
  }

  // 📊 ANALYTICS & INSIGHTS (Pro Tier+)
  static async getConversionAnalytics() {
    return await this.request('/api/analytics/conversion');
  }

  static async getSourcePerformance() {
    return await this.request('/api/analytics/sources');
  }

  static async getMonthlyTrends() {
    return await this.request('/api/analytics/trends?period=monthly');
  }

  static async getLeadScoringData() {
    return await this.request('/api/analytics/lead-scoring');
  }

  // 🎯 GOAL MANAGEMENT (Pro Tier+)
  static async createGoal(goalData) {
    return await this.request('/api/goals', 'POST', goalData);
  }

  static async updateGoalProgress(goalId, progress) {
    return await this.request(`/api/goals/${goalId}/progress`, 'PUT', { progress });
  }

  static async getGoalAchievements() {
    return await this.request('/api/goals?status=completed');
  }

  static async getDailyGoals() {
    return await this.request('/api/goals?period=daily&status=active');
  }

  static async getWeeklyGoals() {
    return await this.request('/api/goals?period=weekly&status=active');
  }

  static async getMonthlyGoals() {
    return await this.request('/api/goals?period=monthly&status=active');
  }

  // 🏷️ TAGS & ORGANIZATION (Pro Tier+)
  static async createTag(tagData) {
    return await this.request('/api/tags', 'POST', tagData);
  }

  static async getLeadTags() {
    return await this.request('/api/tags');
  }

  static async addTagToLead(leadId, tagId) {
    return await this.request('/api/lead-tags', 'POST', { leadId, tagId });
  }

  static async removeTagFromLead(leadId, tagId) {
    return await this.request(`/api/lead-tags?leadId=${leadId}&tagId=${tagId}`, 'DELETE');
  }

  static async getLeadsByTag(tagId) {
    return await this.request(`/api/leads?tagId=${tagId}`);
  }

  static async bulkTagLeads(leadIds, tagId) {
    return await this.request('/api/lead-tags/bulk', 'POST', { leadIds, tagId });
  }

  // =============================================
  // 🏢 BUSINESS TIER - PRO + TEAM TOOLS
  // =============================================

  // 👥 TEAM MANAGEMENT (Business Tier+)
  static async getTeamMembers() {
    return await this.request('/api/team/members');
  }

  static async inviteTeamMember(email, role) {
    return await this.request('/api/team/invite', 'POST', { email, role });
  }

  static async updateTeamMemberRole(userId, role) {
    return await this.request(`/api/team/members/${userId}/role`, 'PUT', { role });
  }

  static async removeTeamMember(userId) {
    return await this.request(`/api/team/members/${userId}`, 'DELETE');
  }

  static async getTeamPermissions() {
    return await this.request('/api/team/permissions');
  }

  // 🎯 TEAM LEAD MANAGEMENT (Business Tier+)
  static async getTeamLeads() {
    return await this.request('/api/leads?team=true');
  }

  static async assignLeadToTeamMember(leadId, userId) {
    return await this.request(`/api/leads/${leadId}/assign`, 'POST', { userId });
  }

  static async reassignLead(leadId, newUserId) {
    return await this.request(`/api/leads/${leadId}/reassign`, 'PUT', { newUserId });
  }

  static async getMyAssignedLeads() {
    return await this.request('/api/leads?assignedToMe=true');
  }

  static async bulkAssignLeads(leadIds, userId) {
    return await this.request('/api/leads/bulk-assign', 'POST', { leadIds, userId });
  }

  // 🤖 AUTOMATION & WORKFLOWS (Business Tier+)
  static async createAutomation(autoData) {
    return await this.request('/api/automations', 'POST', autoData);
  }

  static async getAutomations() {
    return await this.request('/api/automations');
  }

  static async triggerAutomation(automationId, leadId) {
    return await this.request(`/api/automations/${automationId}/trigger`, 'POST', { leadId });
  }

  static async updateAutomationStatus(automationId, status) {
    return await this.request(`/api/automations/${automationId}/status`, 'PUT', { status });
  }

  static async getAutomationResults(automationId) {
    return await this.request(`/api/automations/${automationId}/results`);
  }

  static async createEmailSequence(sequenceData) {
    return await this.request('/api/email-sequences', 'POST', sequenceData);
  }

  static async triggerEmailSequence(leadId, sequenceId) {
    return await this.request('/api/email-sequences/trigger', 'POST', { leadId, sequenceId });
  }

  // 📊 TEAM ANALYTICS (Business Tier+)
  static async getTeamPerformance() {
    return await this.request('/api/analytics/team/performance');
  }

  static async getIndividualPerformance(userId) {
    return await this.request(`/api/analytics/team/individual/${userId}`);
  }

  static async getTeamLeaderboard() {
    return await this.request('/api/analytics/team/leaderboard');
  }

  static async getTeamGoals() {
    return await this.request('/api/goals?team=true');
  }

  static async createTeamGoal(goalData) {
    return await this.request('/api/goals/team', 'POST', goalData);
  }

  // =============================================
  // ⭐ ENTERPRISE TIER - BUSINESS + ADVANCED TOOLS
  // =============================================

  // 📊 ADVANCED REPORTING (Enterprise Tier+)
  static async generateCustomReport(filters) {
    return await this.request('/api/reports/custom', 'POST', { filters });
  }

  static async scheduleReport(reportConfig) {
    return await this.request('/api/reports/schedule', 'POST', reportConfig);
  }

  static async exportToExcel(data) {
    return await this.request('/api/export/excel', 'POST', { data });
  }

  static async exportToPDF(data) {
    return await this.request('/api/export/pdf', 'POST', { data });
  }

  static async shareReport(reportId, permissions) {
    return await this.request(`/api/reports/${reportId}/share`, 'POST', { permissions });
  }

  static async getReportHistory() {
    return await this.request('/api/reports/history');
  }

  // 🔗 INTEGRATIONS & API (Enterprise Tier+)
  static async getAPIKeys() {
    return await this.request('/api/integrations/api-keys');
  }

  static async createAPIKey(keyData) {
    return await this.request('/api/integrations/api-keys', 'POST', keyData);
  }

  static async revokeAPIKey(keyId) {
    return await this.request(`/api/integrations/api-keys/${keyId}`, 'DELETE');
  }

  static async connectCRM(crmConfig) {
    return await this.request('/api/integrations/crm/connect', 'POST', crmConfig);
  }

  static async syncExternalData() {
    return await this.request('/api/integrations/sync', 'POST');
  }

  static async createWebhook(webhookData) {
    return await this.request('/api/integrations/webhooks', 'POST', webhookData);
  }

  static async getIntegrationStatus() {
    return await this.request('/api/integrations/status');
  }

  // 🎨 WHITE LABEL & CUSTOMIZATION (Enterprise Tier+)
  static async customizeWhiteLabel(brandData) {
    return await this.request('/api/white-label/customize', 'POST', brandData);
  }

  static async updateBrandColors(colors) {
    return await this.request('/api/white-label/colors', 'PUT', { colors });
  }

  static async createCustomFields(fieldData) {
    return await this.request('/api/custom-fields', 'POST', fieldData);
  }

  static async updateCustomFields(fieldId, updates) {
    return await this.request(`/api/custom-fields/${fieldId}`, 'PUT', updates);
  }

  // 🎭 AI & MACHINE LEARNING (Enterprise Tier+)
  static async getLeadScore(leadId) {
    return await this.request(`/api/ai/lead-score/${leadId}`);
  }

  static async updateScoringRules(rules) {
    return await this.request('/api/ai/scoring-rules', 'PUT', { rules });
  }

  static async getAIInsights(leadId) {
    return await this.request(`/api/ai/insights/${leadId}`);
  }

  static async predictConversion(leadId) {
    return await this.request(`/api/ai/predict-conversion/${leadId}`);
  }

  static async getAIPerformance() {
    return await this.request('/api/ai/performance');
  }

  // =============================================
  // 👑 ADMIN TIER - ENTERPRISE + SYSTEM CONTROL
  // =============================================

  // 👤 USER MANAGEMENT (Admin Tier Only)
  static async getAllUsers() {
    return await this.request('/api/admin/users');
  }

  static async updateUserTier(userId, newTier) {
    return await this.request(`/api/admin/users/${userId}/tier`, 'PUT', { tier: newTier });
  }

  static async suspendUser(userId, reason) {
    return await this.request(`/api/admin/users/${userId}/suspend`, 'POST', { reason });
  }

  static async deleteUser(userId) {
    return await this.request(`/api/admin/users/${userId}`, 'DELETE');
  }

  static async getUserActivity(userId) {
    return await this.request(`/api/admin/users/${userId}/activity`);
  }

  static async impersonateUser(userId) {
    return await this.request(`/api/admin/users/${userId}/impersonate`, 'POST');
  }

  // ⚙️ SYSTEM MANAGEMENT (Admin Tier Only)
  static async getSystemMetrics() {
    return await this.request('/api/admin/system/metrics');
  }

  static async getSystemHealth() {
    return await this.request('/api/health');
  }

  static async updateSystemSettings(settings) {
    return await this.request('/api/admin/system/settings', 'PUT', settings);
  }

  static async getErrorLogs() {
    return await this.request('/api/admin/system/logs');
  }

  static async clearCache() {
    return await this.request('/api/admin/system/cache/clear', 'POST');
  }

  static async backupDatabase() {
    return await this.request('/api/admin/system/backup', 'POST');
  }

  // 💰 BILLING & REVENUE (Admin Tier Only)
  static async getBillingData() {
    return await this.request('/api/admin/billing');
  }

  static async getSubscriptionMetrics() {
    return await this.request('/api/admin/billing/metrics');
  }

  static async processRefund(userId, amount) {
    return await this.request('/api/admin/billing/refund', 'POST', { userId, amount });
  }

  static async updatePricing(pricingData) {
    return await this.request('/api/admin/billing/pricing', 'PUT', pricingData);
  }

  static async getChurnAnalysis() {
    return await this.request('/api/admin/billing/churn');
  }

  // 🔄 TIER SWITCHING (Admin Tier - Your BOMB Feature!)
  static async switchViewToTier(tier) {
    return await this.request('/api/admin/tier-switch', 'POST', { tier });
  }

  static async resetViewToAdmin() {
    return await this.request('/api/admin/tier-switch/reset', 'POST');
  }

  static async getAvailableTierViews() {
    return await this.request('/api/admin/tier-switch/available');
  }

  // 🎛️ ADMIN SPECIAL ENDPOINTS
  static async getAdminStats() {
    return await this.request('/api/admin/stats');
  }

  static async checkTrials() {
    return await this.request('/api/admin/check-trials', 'POST');
  }

// 🎯 TRIAL STATUS HELPER
static async getTrialStatus() {
  const profile = await this.getUserProfile();
  
  // Check current subscription
  const isOnTrial = profile.subscriptionTier === 'PROFESSIONAL_TRIAL';
  const hasUsedTrial = profile.trialUsed || false;
  
  // Determine trial state
  let trialState = 'available';  // Default for new users
  
  if (isOnTrial) {
    trialState = 'active';
  } else if (hasUsedTrial) {
    trialState = 'used';
  }
  
  return {
    state: trialState,          // 'available', 'active', 'used'
    hasUsedTrial,
    isCurrentlyOnTrial: isOnTrial,
    canStartTrial: !hasUsedTrial && !isOnTrial,
    subscriptionTier: profile.subscriptionTier
  };
}

  static async createTestTrial() {
    return await this.request('/api/admin/create-test-trial', 'POST');
  }

  static async getEmailStats() {
    return await this.request('/api/email-stats');
  }

  // =============================================
  // 🔧 UTILITY HELPERS
  // =============================================

  // 🔧 VALIDATION & UTILITY HELPERS
  static async validateLeadData(leadData) {
    const errors = [];
    
    if (!leadData.name || leadData.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (leadData.email && !this.isValidEmail(leadData.email)) {
      errors.push('Invalid email format');
    }
    
    if (leadData.qualityScore && (leadData.qualityScore < 1 || leadData.qualityScore > 10)) {
      errors.push('Quality score must be between 1 and 10');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  static formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString();
  }

  static calculateDaysUntil(dateString) {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // 🎨 UI HELPER METHODS (For consistent styling)
  static getStatusColor(status) {
    const statusColors = {
      'new': '#3B82F6',          // Blue
      'contacted': '#F59E0B',     // Yellow  
      'qualified': '#10B981',     // Green
      'proposal': '#8B5CF6',      // Purple
      'negotiation': '#F97316',   // Orange
      'closed': '#059669',        // Emerald
      'lost': '#EF4444'          // Red
    };
    return statusColors[status?.toLowerCase()] || '#6B7280';
  }

  static getTypeIcon(type) {
    const typeIcons = {
      'cold': '❄️',
      'warm': '🔥',
      'crm': '📊',
      'hot': '🌟'
    };
    return typeIcons[type?.toLowerCase()] || '';
  }

  static getPriorityColor(priority) {
    const priorityColors = {
      'low': '#10B981',      // Green
      'medium': '#F59E0B',   // Yellow
      'high': '#F97316',     // Orange
      'urgent': '#EF4444'    // Red
    };
    return priorityColors[priority?.toLowerCase()] || '#6B7280';
  }

  // 🚨 ERROR HANDLING
  static handleAPIError(error, context = '') {
    console.error(`API Error in ${context}:`, error);
    
    if (error.message.includes('Authentication')) {
      return 'Please log in again to continue.';
    }
    
    if (error.message.includes('limit reached')) {
      return 'You\'ve reached your monthly lead limit. Upgrade to add more leads!';
    }
    
    if (error.message.includes('Rate limited')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (error.message.includes('offline')) {
      return 'You appear to be offline. Please check your connection.';
    }
    
    return error.message || 'Something went wrong. Please try again.';
  }
}

// 🌍 GLOBAL EXPORT
const API = TierScalingAPI;

if (typeof window !== 'undefined') {
  window.API = API;
}

console.log('🧰 Tier-Scaling API Toolbox v2.0 loaded!');
console.log('🆓 FREE: Core lead management, stats, tasks');
console.log('💼 PRO: + Analytics, goals, tags, bulk operations');
console.log('🏢 BUSINESS: + Team management, automation, workflows');
console.log('⭐ ENTERPRISE: + Custom reports, integrations, AI');
console.log('👑 ADMIN: + System control, user management, tier switching');
console.log('🔒 Security handled by server.js - this just makes clean calls!');

/**
 * 🎯 TIER-BASED USAGE EXAMPLES:
 * 
 * // 🆓 FREE TIER - Core Foundation
 * const leads = await API.getLeadsByType('warm');
 * const progress = await API.getProgressTowardGoal('monthly');
 * await API.addBasicReminder(leadId, '2024-12-25', 'Holiday follow-up');
 * const todaysTasks = await API.getTodaysTasks();
 * 
 * // 💼 PRO TIER - FREE + Enhanced Features
 * await API.bulkImportLeads(csvData);
 * const analytics = await API.getConversionAnalytics();
 * await API.createGoal({ title: 'Monthly Target', target: 100 });
 * await API.addTagToLead(leadId, tagId);
 * 
 * // 🏢 BUSINESS TIER - PRO + Team Collaboration
 * await API.inviteTeamMember('colleague@company.com', 'sales_rep');
 * await API.assignLeadToTeamMember(leadId, userId);
 * const leaderboard = await API.getTeamLeaderboard();
 * await API.createAutomation(workflowConfig);
 * 
 * // ⭐ ENTERPRISE TIER - BUSINESS + Advanced Features
 * const report = await API.generateCustomReport(filters);
 * await API.connectCRM({ type: 'salesforce', config: {...} });
 * const leadScore = await API.getLeadScore(leadId);
 * await API.customizeWhiteLabel({ colors: { primary: '#FF6B35' } });
 * 
 * // 👑 ADMIN TIER - ENTERPRISE + System Control
 * const allUsers = await API.getAllUsers();
 * await API.updateUserTier(userId, 'enterprise');
 * const systemHealth = await API.getSystemHealth();
 * await API.switchViewToTier('professional'); // BOMB FEATURE!
 * 
 * // 🔧 UTILITY METHODS (All Tiers)
 * const validation = await API.validateLeadData(formData);
 * const statusColor = API.getStatusColor('qualified');
 * const daysLeft = API.calculateDaysUntil('2024-12-31');
 * const userFriendlyError = API.handleAPIError(error, 'Dashboard');
 * 
 * 🎯 PERFECT FOR SCRIPTS:
 * Each tier gets progressively more powerful tools, but all use the same
 * clean, simple syntax. Your server.js bouncer handles all the security,
 * permissions, and business logic. This just provides beautiful, organized
 * methods to interact with your fortress backend!
 * 
 * 🚀 TIER SCALING BENEFITS:
 * ✅ Free users get sophisticated tools that show platform value
 * ✅ Each upgrade unlocks genuinely useful new capabilities  
 * ✅ Script-friendly methods make building components easy
 * ✅ Consistent API patterns across all tiers
 * ✅ Server.js maintains security - API.js provides convenience
 * ✅ Clear upgrade path from individual → team → enterprise → admin
 */