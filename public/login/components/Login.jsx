import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Loader, 
  AlertTriangle, 
  CheckCircle, 
  Crown, 
  Zap,
  Star,
  ArrowRight,
  CreditCard,
  Clock
} from 'lucide-react';

const Login = () => {
  // State management
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState({
    login: false,
    signup: false,
    confirm: false
  });

  // Form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    tier: 'pro', // Default to Pro tier
    billingCycle: 'monthly' // monthly or annual
  });

  // Check for URL parameters (cancelled payment, locked account, etc.)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('cancelled') === 'true') {
      setError('Payment was cancelled. You can try again or create a free account.');
    }
    if (urlParams.get('locked') === 'true') {
      setError('Account is temporarily locked due to too many failed login attempts.');
    }
  }, []);

  // Pricing options
  const pricingPlans = {
    free: {
      name: 'Free',
      price: { monthly: 0, annual: 0 },
      features: ['100 leads/month', 'Basic pipeline', 'Email support'],
      limitations: ['Limited features', 'No automation', 'Basic analytics']
    },
    pro: {
      name: 'Pro',
      price: { monthly: 6.99, annual: 69.99 },
      features: ['1,000 leads/month', 'Advanced pipeline', 'Priority support', 'Full analytics'],
      popular: true
    }
  };

  // Clear error when switching forms
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [isLogin]);

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 423) {
          throw new Error('Account is temporarily locked. Please try again later.');
        }
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));

      setSuccess(data.message);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Pro tier Stripe payment
  const handleProPayment = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Create Stripe checkout session
      const plan = signupData.billingCycle === 'monthly' ? 'monthly_pro' : 'annual_pro';
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan: plan,
          email: signupData.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;

    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Handle signup form submission
  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Client-side validation
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Check password strength (must match server requirements)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(signupData.password)) {
      setError('Password must be 8+ characters with uppercase, lowercase, number, and special character');
      setIsLoading(false);
      return;
    }

    try {
      // If Pro tier selected, go through Stripe payment flow
      if (signupData.tier === 'pro') {
        await handleProPayment();
        return; // Will redirect to Stripe
      }

      // For free tier, create account directly with correct format
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password,
          confirmPassword: signupData.confirmPassword // ✅ Required by server
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from server
        if (data.details && Array.isArray(data.details)) {
          throw new Error(data.details.join(', '));
        }
        throw new Error(data.error || 'Registration failed');
      }

      // Store token and user data immediately for free accounts
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));

      setSuccess(data.message);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePassword = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden">
        {/* Gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>
        
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SteadyLeadFlow</h1>
            <p className="text-gray-600">Transform leads into revenue</p>
          </div>

          {/* Form Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                isLogin 
                  ? 'bg-white text-blue-600 shadow-sm transform translate-y-[-1px]' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                !isLogin 
                  ? 'bg-white text-blue-600 shadow-sm transform translate-y-[-1px]' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.login ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200 pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('login')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.login ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => togglePassword('login')}
                  className="text-blue-600 hover:text-purple-600 text-sm font-medium mt-2 transition-colors"
                >
                  {showPassword.login ? 'Hide password' : 'Show password'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:translate-y-[-2px] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center">
                <a 
                  href="/login/forgot-password" 
                  className="text-blue-600 hover:text-purple-600 text-sm font-medium transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Pricing Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Choose Your Plan
                </label>
                
                {/* Pro Plan (Default/Recommended) */}
                <div 
                  onClick={() => setSignupData({...signupData, tier: 'pro'})}
                  className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 mb-3 ${
                    signupData.tier === 'pro' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Popular badge */}
                  <div className="absolute -top-3 left-4">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      ⭐ RECOMMENDED
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Crown className="w-6 h-6 text-blue-600" />
                      <div>
                        <h3 className="font-bold text-gray-900">Pro Plan</h3>
                        <p className="text-sm text-gray-600">1,000 leads • Full features</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        ${signupData.billingCycle === 'monthly' ? '6.99/mo' : '69.99/yr'}
                      </p>
                      {signupData.billingCycle === 'annual' && (
                        <p className="text-xs text-green-600">Save 20%!</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing Cycle Toggle (only for Pro) */}
                {signupData.tier === 'pro' && (
                  <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                    <button
                      type="button"
                      onClick={() => setSignupData({...signupData, billingCycle: 'monthly'})}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-all ${
                        signupData.billingCycle === 'monthly'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupData({...signupData, billingCycle: 'annual'})}
                      className={`flex-1 py-2 px-3 text-sm font-medium rounded transition-all ${
                        signupData.billingCycle === 'annual'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      <span>Annual</span>
                      <span className="ml-1 text-xs text-green-600">Save 20%</span>
                    </button>
                  </div>
                )}

                {/* Free Plan */}
                <div 
                  onClick={() => setSignupData({...signupData, tier: 'free'})}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    signupData.tier === 'free' 
                      ? 'border-gray-400 bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-6 h-6 text-gray-500" />
                      <div>
                        <h3 className="font-bold text-gray-900">Free Plan</h3>
                        <p className="text-sm text-gray-600">100 leads • Basic features</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-600">$0/mo</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.signup ? 'text' : 'password'}
                    value={signupData.password}
                    onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200 pr-12"
                    placeholder="Create a password (8+ chars, mixed case, number, symbol)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('signup')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.signup ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-all duration-200 pr-12"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePassword('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">Password must contain:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>At least 8 characters</li>
                  <li>Uppercase and lowercase letters</li>
                  <li>At least one number</li>
                  <li>At least one special character (@$!%*?&)</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl font-semibold transform hover:translate-y-[-2px] transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${
                  signupData.tier === 'pro'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>
                      {signupData.tier === 'pro' ? 'Creating Checkout...' : 'Creating Account...'}
                    </span>
                  </div>
                ) : signupData.tier === 'pro' ? (
                  <div className="flex items-center justify-center space-x-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Continue to Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                ) : (
                  'Create Free Account'
                )}
              </button>

              {signupData.tier === 'pro' && (
                <p className="text-xs text-center text-gray-600">
                  You'll be redirected to secure payment processing
                </p>
              )}

              {signupData.tier === 'free' && (
                <p className="text-xs text-center text-gray-600">
                  No credit card required • Upgrade anytime
                </p>
              )}
            </form>
          )}

          {/* Footer Links */}
          <div className="flex justify-center space-x-6 pt-8 border-t border-gray-200 mt-8">
            <a href="/pricing" className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors">
              Pricing
            </a>
            <a href="/privacy" className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors">
              Privacy
            </a>
            <a href="/terms" className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors">
              Terms
            </a>
            <a href="/" className="text-gray-500 hover:text-blue-600 text-sm font-medium transition-colors">
              ← Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;