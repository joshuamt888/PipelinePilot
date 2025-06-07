const PaymentSuccess = () => {
  const [sessionId, setSessionId] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    
    if (sessionIdParam) {
      setSessionId(sessionIdParam);
    }

    // Get email from localStorage if available
    const savedEmail = localStorage.getItem('checkoutEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      localStorage.removeItem('checkoutEmail'); // Clean up
    }

    setIsLoading(false);
  }, []);

  const handleContinue = () => {
    // Redirect to login with success message
    window.location.href = '/login?upgrade=success';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to V1 Pro! 🚀
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your payment was successful and your account has been upgraded!
          </p>

          {/* Features Box */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">You now have access to:</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                1,000 leads per month
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Advanced pipeline tracking
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                40+ lead data fields
              </div>
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Priority support
              </div>
            </div>
          </div>

          {/* Session Info */}
          {sessionId && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
              <p className="text-gray-600">
                <strong>Session:</strong> {sessionId.slice(-8)}...
              </p>
              {email && (
                <p className="text-gray-600">
                  <strong>Email:</strong> {email}
                </p>
              )}
            </div>
          )}

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-left">
                <h4 className="text-yellow-800 font-medium text-sm">Next Step Required</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  Please log in to set your password and access your upgraded account.
                </p>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            Continue to Login
          </button>

          {/* Footer */}
          <p className="text-xs text-gray-500 mt-4">
            Need help? Contact support at{' '}
            <a href="mailto:support@steadyleadflow.com" className="text-blue-600 hover:underline">
              support@steadyleadflow.com
            </a>
          </p>
        </div>

        {/* SteadyLeadFlow Logo/Brand */}
        <div className="text-center mt-6">
          <p className="text-white text-sm font-medium">SteadyLeadFlow</p>
          <p className="text-blue-100 text-xs">Transform leads into revenue</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;