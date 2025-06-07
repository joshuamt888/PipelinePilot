import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader,
  User,
  Mail,
  Phone,
  Building,
  Globe,
  FileText,
  Star,
  Lock,
  Shield,
  Crown,
  Zap,
  ArrowLeft
} from 'lucide-react';

const AddLead = () => {
  // Authentication & User State
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    platform: '',
    notes: '',
    qualityScore: 5
  });

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // Lead Sources with enhanced security
  const leadSources = [
    { name: 'LinkedIn', icon: '💼', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { name: 'Facebook Groups', icon: '👥', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { name: 'Facebook', icon: '📘', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { name: 'Referrals', icon: '🤝', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { name: 'Cold Calls', icon: '📞', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    { name: 'Reddit', icon: '🔴', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    { name: 'Discord', icon: '🎮', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
    { name: 'Instagram', icon: '📸', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
    { name: 'Twitter/X', icon: '🐦', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
    { name: 'TikTok', icon: '🎵', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
    { name: 'YouTube', icon: '📹', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    { name: 'Email Marketing', icon: '📧', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { name: 'Google Ads', icon: '🎯', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { name: 'Website', icon: '🌐', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
    { name: 'Events/Conferences', icon: '🎪', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    { name: 'Trade Shows', icon: '🏢', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    { name: 'Networking', icon: '🤝', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
    { name: 'Partner Referral', icon: '🔗', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' },
    { name: 'Word of Mouth', icon: '💬', color: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200' },
    { name: 'Custom', icon: '⚡', color: 'bg-gradient-to-r from-purple-400 to-pink-400 text-white' }
  ];

  // Mock user data for demo - replace with actual authentication
  const mockUsers = {
    free: {
      id: 1,
      email: 'user@example.com',
      userType: 'client_free',
      isAdmin: false,
      monthlyLeadLimit: 50,
      currentMonthLeads: 47
    },
    pro: {
      id: 2,
      email: 'pro@example.com',
      userType: 'client_v1',
      isAdmin: false,
      monthlyLeadLimit: 1000,
      currentMonthLeads: 247
    },
    admin: {
      id: 3,
      email: 'admin@steadyleadflow.com',
      userType: 'admin',
      isAdmin: true,
      monthlyLeadLimit: null,
      currentMonthLeads: 0
    }
  };

  // Demo user type switcher
  const [demoUserType, setDemoUserType] = useState('pro');

  // 🔒 SECURITY: Authentication check on component mount
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        // In real app, this would check JWT token and validate with server
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
          setAuthError('Please log in to access this page');
          window.location.href = '/login';
          return;
        }

        // For demo, use mock user
        const currentUser = mockUsers[demoUserType];
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Check if user is near their limit
        if (!currentUser.isAdmin && currentUser.currentMonthLeads >= currentUser.monthlyLeadLimit * 0.9) {
          setShowLimitWarning(true);
        }
        
      } catch (error) {
        setAuthError('Authentication failed');
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    authenticateUser();
  }, [demoUserType]);

  // 🔒 SECURITY: Server-side lead limit validation
  const checkLeadLimit = async () => {
    if (user?.isAdmin) return true;
    
    try {
      // In real app, this would make API call to verify current count
      const response = await fetch('/api/user/lead-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to check lead limit');
      
      const data = await response.json();
      return data.canAddLead;
      
    } catch (error) {
      // Fallback to stored user data for demo
      return user.currentMonthLeads < user.monthlyLeadLimit;
    }
  };

  // Form validation with security
  const validateForm = () => {
    const errors = [];
    
    // Required field validation
    if (!formData.name.trim()) {
      errors.push('Name is required');
    }
    
    // Name length and character validation
    if (formData.name.length > 255) {
      errors.push('Name must be less than 255 characters');
    }
    
    // Email validation (if provided)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address');
    }
    
    // Phone validation (if provided)
    if (formData.phone && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      errors.push('Please enter a valid phone number');
    }
    
    // Prevent XSS attacks
    const dangerousChars = /<script|javascript:|on\w+=/i;
    Object.values(formData).forEach(value => {
      if (typeof value === 'string' && dangerousChars.test(value)) {
        errors.push('Invalid characters detected');
      }
    });
    
    return errors;
  };

  // 🔒 SECURE form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Validate form data
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setSubmitError(validationErrors.join(', '));
        return;
      }

      // Check lead limit with server
      const canAddLead = await checkLeadLimit();
      if (!canAddLead) {
        setSubmitError(`Monthly lead limit reached (${user.monthlyLeadLimit}). Upgrade to add more!`);
        return;
      }

      // Sanitize and prepare data for server
      const sanitizedData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        company: formData.company.trim() || null,
        platform: formData.platform || null,
        notes: formData.notes.trim() || null,
        qualityScore: parseInt(formData.qualityScore) || 5
      };

      // Submit to server with authentication
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(sanitizedData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create lead');
      }

      const newLead = await response.json();
      
      // Success! Reset form and show success message
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        platform: '',
        notes: '',
        qualityScore: 5
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);

      // Update user's lead count for demo
      if (!user.isAdmin) {
        setUser(prev => ({
          ...prev,
          currentMonthLeads: prev.currentMonthLeads + 1
        }));
      }

    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Failed to create lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes with security
  const handleInputChange = (field, value) => {
    // Basic XSS prevention
    if (typeof value === 'string') {
      value = value.replace(/<script.*?>.*?<\/script>/gi, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get tier configuration
  const getTierConfig = () => {
    if (user?.isAdmin) {
      return {
        name: 'God Mode',
        icon: <Crown className="w-5 h-5 text-yellow-500" />,
        color: 'from-yellow-400 to-orange-500'
      };
    }
    
    switch (user?.userType) {
      case 'client_free':
        return {
          name: 'Free Tier',
          icon: <Lock className="w-5 h-5 text-gray-500" />,
          color: 'from-gray-400 to-gray-600'
        };
      case 'client_v1':
        return {
          name: 'Pro Tier',
          icon: <Zap className="w-5 h-5 text-blue-500" />,
          color: 'from-blue-400 to-purple-500'
        };
      default:
        return {
          name: 'Unknown',
          icon: <Shield className="w-5 h-5 text-red-500" />,
          color: 'from-red-400 to-red-600'
        };
    }
  };

  const tierConfig = getTierConfig();

  // Demo tier switcher component
  const TierSwitcher = () => (
    <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border">
      <div className="text-sm font-medium mb-2">Demo Mode:</div>
      <div className="flex gap-2">
        {['free', 'pro', 'admin'].map(type => (
          <button
            key={type}
            onClick={() => setDemoUserType(type)}
            className={`px-3 py-1 text-xs rounded ${
              demoUserType === type 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600 dark:text-gray-400">Authenticating...</span>
        </div>
      </div>
    );
  }

  // Authentication error
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{authError}</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TierSwitcher />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r ${tierConfig.color} text-white text-sm font-medium`}>
                {tierConfig.icon}
                <span>{tierConfig.name}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Limit Warning */}
      {showLimitWarning && !user?.isAdmin && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-800 dark:text-yellow-200">
                  Approaching Lead Limit
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  You have {user.monthlyLeadLimit - user.currentMonthLeads} leads remaining this month.
                  <button 
                    onClick={() => window.location.href = '/pricing'}
                    className="ml-2 underline hover:no-underline"
                  >
                    Upgrade for more leads
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Lead</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Add a new lead to your pipeline with basic information
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div className="font-medium text-green-800 dark:text-green-200">
                    Lead added successfully!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Lead Form */}
          <div className="p-6 space-y-6">
            {/* Name (Required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter lead's full name"
                maxLength={255}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="lead@company.com"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Building className="w-4 h-4 inline mr-2" />
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Company name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            {/* Platform/Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Where did you find this lead?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {leadSources.map((source) => (
                  <button
                    key={source.name}
                    type="button"
                    onClick={() => handleInputChange('platform', source.name)}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                      formData.platform === source.name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className="text-lg">{source.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {source.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Star className="w-4 h-4 inline mr-2" />
                Lead Quality (1-10)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.qualityScore}
                  onChange={(e) => handleInputChange('qualityScore', e.target.value)}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-12 text-center">
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formData.qualityScore}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this lead..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
              />
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div className="font-medium text-red-800 dark:text-red-200">
                    {submitError}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.name.trim()}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isSubmitting || !formData.name.trim()
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Adding Lead...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Add Lead</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddLead;