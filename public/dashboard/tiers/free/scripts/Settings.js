import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, User, Bell, Shield, Palette, Globe, 
  Moon, Sun, Monitor, Eye, EyeOff, Mail, Phone,
  Lock, Key, Trash2, Download, Upload, Save,
  ArrowLeft, Crown, Sparkles, Zap, Star,
  Check, X, AlertTriangle, Info, Camera,
  Edit3, RotateCcw, Volume2, VolumeX,
  Smartphone, Laptop, Tablet, Coffee,
  Heart, Gift, HelpCircle, ExternalLink,
  ChevronRight, ChevronDown, Toggle,
  Sliders, Brush, Image, Type, Layout
} from 'lucide-react';

const Settings = ({ onBack }) => {
  // State management
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('account');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Theme and preferences
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'auto';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved ? JSON.parse(saved) : true;
  });

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    timezone: 'America/New_York',
    language: 'en',
    currency: 'USD'
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation states
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUserData();
    applyTheme();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [darkMode, themeMode]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const currentUser = window.SteadyAPI?.getCurrentUser();
      
      if (currentUser) {
        setUser(currentUser);
        setFormData({
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          phone: currentUser.phone || '',
          company: currentUser.company || '',
          timezone: currentUser.timezone || 'America/New_York',
          language: currentUser.language || 'en',
          currency: currentUser.currency || 'USD'
        });
      }
    } catch (error) {
      showToast('Failed to load user data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = () => {
    const root = document.documentElement;
    
    if (themeMode === 'dark' || (themeMode === 'auto' && darkMode)) {
      root.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
    
    localStorage.setItem('themeMode', themeMode);
  };

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    if (mode === 'dark') {
      setDarkMode(true);
    } else if (mode === 'light') {
      setDarkMode(false);
    } else {
      // Auto mode - check system preference
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemDark);
    }
    
    if (window.playSound) {
      window.playSound('click');
    }
  };

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
    localStorage.setItem('soundEnabled', JSON.stringify(!soundEnabled));
    
    if (!soundEnabled && window.playSound) {
      window.playSound('success');
    }
  };

  const handleNotificationToggle = () => {
    setNotificationsEnabled(!notificationsEnabled);
    localStorage.setItem('notificationsEnabled', JSON.stringify(!notificationsEnabled));
    
    if (window.playSound) {
      window.playSound('click');
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      const response = await window.SettingsAPI?.updateSettings(formData);
      
      if (response?.success) {
        // Update local user state
        const updatedUser = { ...user, ...formData };
        setUser(updatedUser);
        
        // Update auth manager
        if (window.SteadyAPI?.authManager) {
          window.SteadyAPI.authManager.user = updatedUser;
          localStorage.setItem('steadymanager_user', JSON.stringify(updatedUser));
        }
        
        showToast('Profile updated successfully! 🎉', 'success');
      } else {
        throw new Error(response?.error || 'Failed to update profile');
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      setSaving(true);
      
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
      showToast('Password updated successfully! 🔒', 'success');
      
    } catch (error) {
      showToast('Failed to update password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        // For now, just show success
        showToast('Avatar uploaded! (Feature coming soon)', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    if (type === 'success') {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } else {
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 4000);
    }
    
    if (window.playSound) {
      window.playSound(type === 'success' ? 'success' : 'error');
    }
  };

  const handleUpgrade = () => {
    window.UpgradeAPI?.showUpgradeFor('settings');
  };

  const getUserColor = (email) => {
    if (!email) return 'from-blue-400 to-purple-500';
    
    const colors = [
      'from-blue-400 to-blue-500',
      'from-purple-400 to-purple-500', 
      'from-green-400 to-green-500',
      'from-pink-400 to-pink-500',
      'from-indigo-400 to-indigo-500',
      'from-red-400 to-red-500',
      'from-yellow-400 to-yellow-500',
      'from-teal-400 to-teal-500',
      'from-orange-400 to-orange-500',
      'from-cyan-400 to-cyan-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const ToggleSwitch = ({ enabled, onChange, size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-8 h-4',
      md: 'w-12 h-6',
      lg: 'w-16 h-8'
    };
    
    const dotClasses = {
      sm: 'w-3 h-3',
      md: 'w-5 h-5', 
      lg: 'w-7 h-7'
    };

    return (
      <button
        onClick={onChange}
        className={`${sizeClasses[size]} ${
          enabled 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600' 
            : 'bg-gray-300 dark:bg-gray-600'
        } relative rounded-full transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
      >
        <div
          className={`${dotClasses[size]} bg-white rounded-full shadow-lg transform transition-all duration-300 ease-in-out ${
            enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        >
          {enabled ? (
            <Check className="w-full h-full p-0.5 text-blue-500" />
          ) : (
            <X className="w-full h-full p-0.5 text-gray-400" />
          )}
        </div>
      </button>
    );
  };

  const ThemeSelector = () => {
    const themes = [
      { id: 'light', name: 'Light', icon: Sun, preview: 'bg-white border-gray-200' },
      { id: 'dark', name: 'Dark', icon: Moon, preview: 'bg-gray-900 border-gray-700' },
      { id: 'auto', name: 'Auto', icon: Monitor, preview: 'bg-gradient-to-r from-white to-gray-900' }
    ];

    return (
      <div className="grid grid-cols-3 gap-3">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeChange(theme.id)}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
              themeMode === theme.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className={`w-full h-12 ${theme.preview} rounded-lg mb-3 flex items-center justify-center`}>
              <theme.icon className={`w-6 h-6 ${
                theme.id === 'light' ? 'text-yellow-500' :
                theme.id === 'dark' ? 'text-blue-400' : 'text-gray-500'
              }`} />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{theme.name}</p>
            {themeMode === theme.id && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    );
  };

  const SettingCard = ({ icon: Icon, title, description, children, locked = false, onClick }) => {
    return (
      <div 
        className={`bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
          locked ? 'cursor-pointer' : ''
        } ${activeCard === title ? 'ring-2 ring-blue-500' : ''}`}
        onClick={locked ? onClick : undefined}
        onMouseEnter={() => setActiveCard(title)}
        onMouseLeave={() => setActiveCard(null)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              locked 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500' 
                : 'bg-gradient-to-r from-blue-400 to-purple-500'
            }`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                {title}
                {locked && <Lock className="w-4 h-4 ml-2 text-yellow-500" />}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
          </div>
          {locked && (
            <Crown className="w-5 h-5 text-yellow-500 animate-pulse" />
          )}
        </div>
        {locked ? (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-2">
              🚀 This feature requires Professional plan
            </p>
            <button className="text-xs text-yellow-600 dark:text-yellow-400 font-medium hover:underline">
              Upgrade to unlock →
            </button>
          </div>
        ) : (
          children
        )}
      </div>
    );
  };

  const sections = [
    { id: 'account', name: 'Account', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'preferences', name: 'Preferences', icon: Settings },
    { id: 'billing', name: 'Billing', icon: Crown },
    { id: 'danger', name: 'Danger Zone', icon: AlertTriangle }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all duration-200 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
              >
                <Crown className="w-4 h-4" />
                <span>Upgrade</span>
                <Sparkles className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 space-y-2">
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 hover:scale-105 ${
                    activeSection === section.id
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  <span className="font-medium">{section.name}</span>
                  {section.id === 'billing' && (
                    <Crown className="w-4 h-4 ml-auto text-yellow-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="space-y-6">
                {/* Profile Card */}
                <SettingCard
                  icon={User}
                  title="Profile Information"
                  description="Update your personal information and profile details"
                >
                  <div className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-center space-x-6">
                      <div 
                        className="relative group cursor-pointer"
                        onMouseEnter={() => setIsProfileHovered(true)}
                        onMouseLeave={() => setIsProfileHovered(false)}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className={`w-20 h-20 bg-gradient-to-r ${getUserColor(user?.email)} rounded-full flex items-center justify-center text-white text-2xl font-bold transition-all duration-300 ${
                          isProfileHovered ? 'scale-110 shadow-xl' : ''
                        }`}>
                          {user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className={`absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isProfileHovered ? 'opacity-100' : 'opacity-0'
                        }`}>
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formData.firstName || formData.lastName ? 
                            `${formData.firstName} ${formData.lastName}`.trim() : 
                            user?.email?.split('@')[0] || 'User'
                          }
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">FREE TIER</p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => handleFormChange('firstName', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => handleFormChange('lastName', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter last name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleFormChange('phone', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Company
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => handleFormChange('company', e.target.value)}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter company name"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none flex items-center space-x-2"
                      >
                        {saving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                </SettingCard>
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                {/* Password */}
                <SettingCard
                  icon={Lock}
                  title="Password"
                  description="Keep your account secure with a strong password"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Password</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Last updated 30 days ago</p>
                      </div>
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                      >
                        <Key className="w-4 h-4" />
                        <span>Change</span>
                      </button>
                    </div>
                  </div>
                </SettingCard>

                {/* Two-Factor Authentication - Locked */}
                <SettingCard
                  icon={Shield}
                  title="Two-Factor Authentication"
                  description="Add an extra layer of security to your account"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* Login Sessions - Locked */}
                <SettingCard
                  icon={Smartphone}
                  title="Active Sessions"
                  description="Manage devices that are logged into your account"
                  locked={true}
                  onClick={handleUpgrade}
                />
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                {/* Theme */}
                <SettingCard
                  icon={Palette}
                  title="Theme"
                  description="Choose how SteadyManager looks on this device"
                >
                  <ThemeSelector />
                </SettingCard>

                {/* Advanced Appearance - Locked */}
                <SettingCard
                  icon={Brush}
                  title="Custom Themes"
                  description="Create your own color schemes and layouts"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* Font Settings - Locked */}
                <SettingCard
                  icon={Type}
                  title="Typography"
                  description="Customize fonts and text sizing"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* Layout Customization - Locked */}
                <SettingCard
                  icon={Layout}
                  title="Layout Customization"
                  description="Personalize your dashboard layout and widgets"
                  locked={true}
                  onClick={handleUpgrade}
                />
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                {/* Basic Notifications */}
                <SettingCard
                  icon={Bell}
                  title="Notification Preferences"
                  description="Control when and how you receive notifications"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Browser Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about important updates</p>
                      </div>
                      <ToggleSwitch enabled={notificationsEnabled} onChange={handleNotificationToggle} />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Sound Effects</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Play sounds for actions and alerts</p>
                      </div>
                      <ToggleSwitch enabled={soundEnabled} onChange={handleSoundToggle} />
                    </div>
                  </div>
                </SettingCard>

                {/* Email Notifications - Locked */}
                <SettingCard
                  icon={Mail}
                  title="Email Notifications"
                  description="Customize your email notification preferences"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* Push Notifications - Locked */}
                <SettingCard
                  icon={Smartphone}
                  title="Mobile Push Notifications"
                  description="Receive notifications on your mobile devices"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* Notification Scheduling - Locked */}
                <SettingCard
                  icon={Clock}
                  title="Notification Schedule"
                  description="Set quiet hours and notification timing"
                  locked={true}
                  onClick={handleUpgrade}
                />
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="space-y-6">
                {/* Basic Preferences */}
                <SettingCard
                  icon={Globe}
                  title="Localization"
                  description="Set your language, timezone, and regional preferences"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleFormChange('language', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="zh">中文</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => handleFormChange('timezone', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="America/New_York">Eastern Time (EST)</option>
                        <option value="America/Chicago">Central Time (CST)</option>
                        <option value="America/Denver">Mountain Time (MST)</option>
                        <option value="America/Los_Angeles">Pacific Time (PST)</option>
                        <option value="UTC">UTC</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => handleFormChange('currency', e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="AUD">AUD (A$)</option>
                        <option value="JPY">JPY (¥)</option>
                      </select>
                    </div>
                  </div>
                </SettingCard>

                {/* Advanced Preferences - Locked */}
                <SettingCard
                  icon={Sliders}
                  title="Advanced Preferences"
                  description="Fine-tune your SteadyManager experience"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* Workflow Automation - Locked */}
                <SettingCard
                  icon={Zap}
                  title="Workflow Automation"
                  description="Set up automated actions and triggers"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* API Settings - Locked */}
                <SettingCard
                  icon={Settings}
                  title="API & Integrations"
                  description="Manage third-party connections and API access"
                  locked={true}
                  onClick={handleUpgrade}
                />
              </div>
            )}

            {/* Billing Section */}
            {activeSection === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <SettingCard
                  icon={Crown}
                  title="Current Plan"
                  description="You're currently on the FREE tier"
                >
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">FREE TIER</h3>
                          <p className="text-gray-600 dark:text-gray-400">Perfect for getting started</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">$0</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">per month</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Up to 50 leads per month</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Basic lead management</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Simple analytics</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">Email support</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-gray-500 line-through">Advanced analytics</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-gray-500 line-through">Goal tracking</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-gray-500 line-through">Data export</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <X className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-gray-500 line-through">Priority support</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleUpgrade}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Crown className="w-5 h-5" />
                        <span>Upgrade to Professional</span>
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </button>
                    </div>
                    
                    {/* Usage Stats */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">This Month's Usage</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Leads Created</span>
                            <span className="font-medium text-gray-900 dark:text-white">{user?.currentMonthLeads || 0}/50</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((user?.currentMonthLeads || 0) / 50 * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SettingCard>

                {/* Payment Methods - Locked */}
                <SettingCard
                  icon={Credit}
                  title="Payment Methods"
                  description="Manage your payment methods and billing details"
                  locked={true}
                  onClick={handleUpgrade}
                />

                {/* Billing History - Locked */}
                <SettingCard
                  icon={FileText}
                  title="Billing History"
                  description="View and download your billing history"
                  locked={true}
                  onClick={handleUpgrade}
                />
              </div>
            )}

            {/* Danger Zone */}
            {activeSection === 'danger' && (
              <div className="space-y-6">
                <SettingCard
                  icon={AlertTriangle}
                  title="Danger Zone"
                  description="Irreversible and destructive actions"
                >
                  <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Delete Account</h4>
                          <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                          </p>
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Account</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Download className="w-5 h-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Export Data</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
                            Download a copy of your data before making any irreversible changes.
                          </p>
                          <button
                            onClick={() => window.UpgradeAPI?.showUpgradeFor('export')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Export Data</span>
                            <Lock className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </SettingCard>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 transform scale-95 opacity-0 animate-modal">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Change Password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordUpdate}
                disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Key className="w-4 h-4" />
                )}
                <span>{saving ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Delete Account</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  showToast('Account deletion requires Professional plan', 'error');
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-up z-50">
          <Check className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Toast */}
      {showErrorToast && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-up z-50">
          <X className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      <style jsx>{`
        @keyframes modal {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-modal {
          animation: modal 0.2s ease-out forwards;
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Settings;