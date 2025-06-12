// 📝 Add Lead Modal Component (FREE VERSION)
    const AddLeadModal = () => {
        const [formData, setFormData] = useState({
            name: '',
            email: '',
            phone: '',
            company: '',
            platform: '',
            status: 'New lead',
            notes: ''
        });

        const handleSubmit = (e) => {
            e.preventDefault();
            
            if (!formData.name.trim()) {
                window.SteadyUtils?.Toast?.error('Lead name is required');
                window.SteadyUtils?.Sound?.playContextual('validation_failed');
                return;
            }

            handleAddLead(formData);
        };

        const handleInputChange = (field, value) => {
            setFormData(prev => ({ ...prev, [field]: value }));
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Lead</h2>
                            <button
                                onClick={() => setShowAddLeadModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        {/* Lead Limit Warning */}
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900 rounded-lg">
                            <p className="text-sm text-orange-800 dark:text-orange-200">
                                📊 {FREE_CONFIG.leadLimit - (leads.all?.length || 0)} leads remaining in your free plan
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Name (Required) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Lead Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter lead's full name"
                                required
                            />
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                        </div>

                        {/* Company */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Company
                            </label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => handleInputChange('company', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Company name"
                            />
                        </div>

                        {/* Platform & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Platform Source
                                </label>
                                <select
                                    value={formData.platform}
                                    onChange={(e) => handleInputChange('platform', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select platform...</option>
                                    {Object.keys(PLATFORM_ICONS).map(platform => (
                                        <option key={platform} value={platform}>{platform}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="New lead">New Lead</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Additional notes about this lead..."
                            />
                        </div>

                        {/* Pro Features Teaser */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-blue-900 dark:text-blue-100">🚀 Want quality scores and potential value tracking?</p>
                                    <p className="text-sm text-blue-800 dark:text-blue-200">Upgrade to Pro for advanced lead scoring!</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                                >
                                    Upgrade
                                </button>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => setShowAddLeadModal(false)}
                                className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`px-6 py-3 ${freeStyles.buttonStyle} text-white rounded-lg hover:scale-105 active:scale-95 transition-all duration-200 font-medium`}
                            >
                                <i className="fas fa-plus mr-2"></i>
                                Add Lead
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // ✏️ Edit Lead Modal Component (FREE VERSION)
    const EditLeadModal = () => {
        const [formData, setFormData] = useState({
            name: selectedLead?.name || '',
            email: selectedLead?.email || '',
            phone: selectedLead?.phone || '',
            company: selectedLead?.company || '',
            platform: selectedLead?.platform || '',
            status: selectedLead?.status || 'New lead',
            notes: selectedLead?.notes || ''
        });

        const handleSubmit = (e) => {
            e.preventDefault();
            
            if (!formData.name.trim()) {
                window.SteadyUtils?.Toast?.error('Lead name is required');
                window.SteadyUtils?.Sound?.playContextual('validation_failed');
                return;
            }

            handleEditLead(selectedLead.id, formData);
        };

        const handleInputChange = (field, value) => {
            setFormData(prev => ({ ...prev, [field]: value }));
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Lead</h2>
                            <button
                                onClick={() => {
                                    setShowEditLeadModal(false);
                                    setSelectedLead(null);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Same form fields as AddLeadModal but with edit logic */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Lead Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Enter lead's full name"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Company
                            </label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => handleInputChange('company', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Company name"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Platform Source
                                </label>
                                <select
                                    value={formData.platform}
                                    onChange={(e) => handleInputChange('platform', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Select platform...</option>
                                    {Object.keys(PLATFORM_ICONS).map(platform => (
                                        <option key={platform} value={platform}>{platform}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="New lead">New Lead</option>
                                    <option value="Contacted">Contacted</option>
                                    <option value="Qualified">Qualified</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Additional notes about this lead..."
                            />
                        </div>

                        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowEditLeadModal(false);
                                    setSelectedLead(null);
                                }}
                                className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`px-6 py-3 ${freeStyles.buttonStyle} text-white rounded-lg hover:scale-105 active:scale-95 transition-all duration-200 font-medium`}
                            >
                                <i className="fas fa-save mr-2"></i>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    // 🚀 Upgrade Modal Component (THE CONVERSION MACHINE!)
    const UpgradeModal = () => {
        if (!showUpgradeModal) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <i className="fas fa-rocket text-2xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">🚀 Upgrade to Professional</h2>
                                    <p className="opacity-90">Unlock your full potential with Pro features!</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-2xl"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Feature Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Free Plan */}
                            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <div className="text-center mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">🆓 Free</h3>
                                    <p className="text-3xl font-bold text-gray-600">$0</p>
                                    <p className="text-sm text-gray-500">What you have now</p>
                                </div>
                                
                                <ul className="space-y-3">
                                    {[
                                        { feature: '50 leads limit', available: true },
                                        { feature: 'Basic dashboard', available: true },
                                        { feature: 'Simple lead management', available: true },
                                        { feature: 'Basic statistics', available: true },
                                        { feature: 'Analytics & reports', available: false },
                                        { feature: 'Data export', available: false },
                                        { feature: 'Advanced scheduling', available: false },
                                        { feature: 'Priority support', available: false }
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-center space-x-3">
                                            <i className={`fas ${item.available ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i>
                                            <span className={`${item.available ? 'text-gray-900 dark:text-white' : 'text-gray-400 line-through'}`}>
                                                {item.feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Pro Plan */}
                            <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-xl border-2 border-blue-200 dark:border-blue-700">
                                <div className="text-center mb-4">
                                    <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">🚀 Professional</h3>
                                    <p className="text-3xl font-bold text-blue-600">$19</p>
                                    <p className="text-sm text-blue-500">per month</p>
                                    <div className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold mt-2">
                                        RECOMMENDED
                                    </div>
                                </div>
                                
                                <ul className="space-y-3">
                                    {[
                                        { feature: '1,000 leads (20x more!)', highlight: true },
                                        { feature: 'Advanced analytics & reports', highlight: true },
                                        { feature: 'Data export (CSV, Excel)', highlight: true },
                                        { feature: 'Advanced lead scoring', highlight: true },
                                        { feature: 'Conversion tracking', highlight: true },
                                        { feature: 'Advanced scheduling', highlight: true },
                                        { feature: 'Priority email support', highlight: true },
                                        { feature: 'Everything in Free', highlight: false }
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-center space-x-3">
                                            <i className="fas fa-check text-green-500"></i>
                                            <span className={`${item.highlight ? 'text-blue-900 dark:text-blue-100 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {item.feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Social Proof */}
                        <div className="bg-green-50 dark:bg-green-900 rounded-xl p-6 mb-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                                    <i className="fas fa-users text-green-600 text-xl"></i>
                                </div>
                                <div>
                                    <h4 className="font-bold text-green-900 dark:text-green-100">Join 10,000+ Pro Users!</h4>
                                    <p className="text-green-800 dark:text-green-200">
                                        "Upgraded to Pro and 3x'd my leads in the first month!" - Sarah M.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Urgency & CTA */}
                        <div className="text-center">
                            <div className="mb-4">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Ready to 20x your lead capacity?
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Start your free 14-day trial - no credit card required!
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => {
                                        // Track upgrade attempt
                                        window.SteadyUtils?.Analytics?.track('upgrade_button_clicked', {
                                            trigger: 'upgrade_modal',
                                            userTier: 'free'
                                        });
                                        
                                        // Redirect to upgrade flow
                                        window.location.href = '/upgrade?plan=professional';
                                    }}
                                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-lg transition-all duration-200 hover:scale-105"
                                >
                                    🚀 Start Free 14-Day Trial
                                </button>
                                
                                <button
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="px-6 py-4 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    Maybe Later
                                </button>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-4">
                                💳 No credit card required • 🔒 Cancel anytime • 📧 Email support included
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // 🎯 Main Content Renderer
    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <DashboardTab />;
            case 'leads':
                return <LeadsTab />;
            case 'goals':
                return <GoalsTab />;
            case 'statistics':
                return <StatisticsTab />;
            case 'settings':
                return <SettingsTab />;
            default:
                return <DashboardTab />;
        }
    };

    // 🚀 MAIN RENDER - FREE TIER EXPERIENCE
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Navigation Sidebar */}
            <Navigation />
            
            {/* Mobile Sidebar Overlay */}
            {isMobile && sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header />
                
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-6">
                        {renderTabContent()}
                    </div>
                </main>
            </div>
            
            {/* Modals */}
            {showAddLeadModal && <AddLeadModal />}
            {showEditLeadModal && <EditLeadModal />}
            <UpgradeModal />
            
            {/* Global Toast Container */}
            <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2"></div>
        </div>
    );

// 🚀 INITIALIZE THE FREE DASHBOARD
const initFreeDashboard = () => {
    // Wait for React to be available
    if (typeof React === 'undefined') {
        setTimeout(initFreeDashboard, 100);
        return;
    }
    
    // Create root element if it doesn't exist
    let dashboardRoot = document.getElementById('dashboard-root');
    if (!dashboardRoot) {
        dashboardRoot = document.createElement('div');
        dashboardRoot.id = 'dashboard-root';
        document.body.appendChild(dashboardRoot);
    }
    
    // Clear any existing content
    dashboardRoot.innerHTML = '';
    
    // Create React root and render
    const root = ReactDOM.createRoot(dashboardRoot);
    root.render(React.createElement(SteadyManagerFreeDashboard));
    
    console.log('🆓 SteadyManager Free Dashboard initialized successfully!');
};

// 🎯 AUTO-INITIALIZE
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFreeDashboard);
} else {
    initFreeDashboard();
}

// 📊 EXPORT FOR EXTERNAL USE
window.SteadyManagerFreeDashboard = {
    init: initFreeDashboard,
    component: SteadyManagerFreeDashboard,
    version: '1.0.0-FREE',
    tier: 'free',
    features: FREE_CONFIG.features,
    leadLimit: FREE_CONFIG.leadLimit
};

console.log(`
🆓 STEADYMANAGER FREE DASHBOARD LOADED!
🎯 Target: Convert free users to Professional
📊 Lead Limit: ${FREE_CONFIG.leadLimit} leads
🚀 Upgrade CTAs: Strategically placed throughout
💯 Conversion Rate: Optimized for maximum upgrades!
`);

// 🎮 THE END - FREE TIER PERFECTION!    // 🎯 Goals Tab Component (FREE VERSION)
    const GoalsTab = () => (
        <div className="space-y-6">
            {/* Basic Goals Overview */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Goals</h2>
                        <p className="text-gray-600 dark:text-gray-400">Track your progress and stay motivated</p>
                    </div>
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                    >
                        🚀 Advanced Goals (Pro)
                    </button>
                </div>

                {/* Goal Progress Cards (Basic) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { 
                            type: 'daily', 
                            label: 'Daily Goal', 
                            icon: 'fas fa-calendar-day',
                            color: 'blue',
                            ...goalMetrics.daily
                        },
                        { 
                            type: 'weekly', 
                            label: 'Weekly Goal', 
                            icon: 'fas fa-calendar-week',
                            color: 'green',
                            ...goalMetrics.weekly
                        },
                        { 
                            type: 'monthly', 
                            label: 'Monthly Goal', 
                            icon: 'fas fa-calendar',
                            color: 'purple',
                            ...goalMetrics.monthly
                        }
                    ].map((goal) => (
                        <div key={goal.type} className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 bg-${goal.color}-100 dark:bg-${goal.color}-900 rounded-lg`}>
                                    <i className={`${goal.icon} text-${goal.color}-600 text-xl`}></i>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {goal.current}
                                        <span className="text-lg text-gray-500">/{goal.target}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{goal.label}</h3>
                            
                            {/* Progress Bar */}
                            <div className="mb-3">
                                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    <span>Progress</span>
                                    <span>{Math.round(goal.percentage)}%</span>
                                </div>
                                <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                                    <div 
                                        className={`bg-${goal.color}-500 rounded-full h-3 transition-all duration-300`}
                                        style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            {/* Status Message */}
                            <p className={`text-sm ${
                                goal.percentage >= 100 ? 'text-green-600' :
                                goal.percentage >= 75 ? 'text-blue-600' :
                                goal.percentage >= 50 ? 'text-yellow-600' :
                                'text-gray-600 dark:text-gray-400'
                            }`}>
                                {goal.percentage >= 100 ? '🎉 Goal achieved!' :
                                 goal.percentage >= 75 ? '🔥 Almost there!' :
                                 goal.percentage >= 50 ? '💪 Halfway there!' :
                                 'Keep going!'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Upgrade Prompts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Achievement History */}
                <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Progress</h3>
                    
                    <div className="space-y-4">
                        {[
                            { date: 'Today', achievement: 'Daily goal progress', icon: 'fas fa-bullseye', color: 'green' },
                            { date: 'Yesterday', achievement: 'Lead added successfully', icon: 'fas fa-user-plus', color: 'blue' },
                            { date: '2 days ago', achievement: 'Weekly progress updated', icon: 'fas fa-chart-line', color: 'purple' }
                        ].map((item, index) => (
                            <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className={`w-8 h-8 rounded-full bg-${item.color}-100 dark:bg-${item.color}-900 flex items-center justify-center`}>
                                    <i className={`${item.icon} text-${item.color}-600 text-sm`}></i>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">{item.achievement}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                            🚀 Upgrade to Pro for detailed achievement tracking and streaks!
                        </p>
                    </div>
                </div>

                {/* Goal Setting (Basic) */}
                <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Set Your Goals</h3>
                    
                    <div className="space-y-4">
                        {[
                            { label: 'Daily leads target', value: goals.daily, type: 'daily' },
                            { label: 'Weekly leads target', value: goals.weekly, type: 'weekly' },
                            { label: 'Monthly leads target', value: goals.monthly, type: 'monthly' }
                        ].map((goal) => (
                            <div key={goal.type}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {goal.label}
                                </label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="number"
                                        value={goal.value}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder={`Enter ${goal.type} target`}
                                        disabled
                                    />
                                    <button 
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg transition-colors font-medium hover:bg-blue-200"
                                    >
                                        🚀 Pro
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                        <p className="font-bold">📈 Unlock Advanced Goal Features!</p>
                        <p className="text-sm opacity-90 mt-1">Custom goals, streak tracking, achievements & more!</p>
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="w-full mt-3 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                        >
                            Upgrade to Professional
                        </button>
                    </div>
                </div>
            </div>

            {/* Motivational Section */}
            <div className={`${freeStyles.headerGradient} rounded-xl p-6 text-white`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Stay Motivated! 🎯</h3>
                        <p className="opacity-90">
                            {FREE_CONFIG.motivations[Math.floor(Math.random() * FREE_CONFIG.motivations.length)]}
                        </p>
                    </div>
                    <div className="text-right">
                        <button
                            onClick={() => {
                                window.SteadyUtils?.Toast?.success('You got this! 💪');
                                window.SteadyUtils?.Sound?.playContextual('celebration');
                            }}
                            className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
                        >
                            🎉 Celebrate Progress
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // 📊 Statistics Tab Component (FREE VERSION - BASIC)
    const StatisticsTab = () => (
        <div className="space-y-6">
            {/* Basic Statistics Overview */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Basic Statistics</h2>
                        <p className="text-gray-600 dark:text-gray-400">Simple insights into your leads</p>
                    </div>
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        🚀 Unlock Advanced Analytics
                    </button>
                </div>

                {/* Basic Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { 
                            title: 'Total Leads', 
                            value: leads.all?.length || 0, 
                            icon: 'fas fa-users', 
                            color: 'blue'
                        },
                        { 
                            title: 'This Month', 
                            value: goalMetrics.monthly.current, 
                            icon: 'fas fa-calendar', 
                            color: 'green'
                        },
                        { 
                            title: 'Free Limit Used', 
                            value: `${Math.round(((leads.all?.length || 0) / FREE_CONFIG.leadLimit) * 100)}%`, 
                            icon: 'fas fa-chart-pie', 
                            color: 'orange'
                        },
                        { 
                            title: 'Pro Features', 
                            value: 'Locked', 
                            icon: 'fas fa-lock', 
                            color: 'purple',
                            isUpgrade: true
                        }
                    ].map((stat, index) => (
                        <div 
                            key={index} 
                            className={`p-6 bg-gray-50 dark:bg-gray-700 rounded-xl ${stat.isUpgrade ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900' : ''}`}
                            onClick={stat.isUpgrade ? () => setShowUpgradeModal(true) : undefined}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900 rounded-lg`}>
                                    <i className={`${stat.icon} text-${stat.color}-600 text-xl`}></i>
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.title}</h3>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stat.value}
                            </p>
                            {stat.isUpgrade && (
                                <p className="text-xs text-blue-600 mt-2 font-medium">Click to upgrade</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Platform Breakdown (Basic) */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Breakdown</h3>
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        🚀 Full Analytics
                    </button>
                </div>
                
                <div className="space-y-4">
                    {Object.entries(statistics.platformStats || {}).slice(0, 3).map(([platform, count], index) => {
                        const total = Object.values(statistics.platformStats || {}).reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (count / total) * 100 : 0;
                        const platformInfo = PLATFORM_ICONS[platform] || { icon: 'fas fa-globe', color: '#6b7280', bgColor: 'bg-gray-100' };
                        
                        return (
                            <div key={platform} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className={`w-10 h-10 rounded-lg ${platformInfo.bgColor} flex items-center justify-center`}>
                                            <i className={`${platformInfo.icon} text-lg`} 
                                               style={{ color: platformInfo.color }}></i>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900 dark:text-white">{platform}</h4>
                                            <div className="flex items-center space-x-4 mt-2">
                                                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                                                    {Math.round(percentage)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{count}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">leads</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {Object.keys(statistics.platformStats || {}).length === 0 && (
                    <div className="text-center py-12">
                        <i className="fas fa-chart-pie text-gray-400 text-4xl mb-4"></i>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No data available</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Add some leads to see basic statistics</p>
                        <button
                            onClick={() => setShowAddLeadModal(true)}
                            className={`px-6 py-3 ${freeStyles.buttonStyle} text-white rounded-lg font-medium transition-colors`}
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Add Your First Lead
                        </button>
                    </div>
                )}

                {/* Pro Features Teaser */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-bold">📊 Unlock Advanced Analytics</h4>
                            <p className="text-sm opacity-90">Conversion funnels, detailed reports, trends & more!</p>
                        </div>
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                        >
                            Upgrade
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // ⚙️ Settings Tab Component (FREE VERSION)
    const SettingsTab = () => (
        <div className="space-y-6">
            {/* Account Settings */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Account Settings</h3>
                
                <div className="space-y-6">
                    {/* Profile Information */}
                    <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Profile Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Account Type
                                </label>
                                <div className={`px-4 py-3 rounded-lg ${freeStyles.badgeClass} font-medium`}>
                                    {FREE_CONFIG.badge}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subscription Info */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Subscription</h4>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{FREE_CONFIG.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Free plan with basic features</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        {user?.currentMonthLeads || 0}/{FREE_CONFIG.leadLimit} leads
                                    </p>
                                    <button 
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Upgrade Plan
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Appearance Settings */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Appearance</h3>
                
                <div className="space-y-6">
                    {/* Theme Selection */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Switch between light and dark themes</p>
                        </div>
                        <button
                            onClick={() => window.SteadyUtils?.toggleTheme()}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Sound Settings */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Sound Effects</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Enable or disable interface sounds</p>
                        </div>
                        <button
                            onClick={() => {
                                const enabled = window.SteadyUtils?.Sound?.toggle();
                                window.SteadyUtils?.Toast?.info(`Sounds ${enabled ? 'enabled' : 'disabled'}`);
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                window.SteadyUtils?.Sound?.isEnabled() ? 'bg-gray-600' : 'bg-gray-200'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    window.SteadyUtils?.Sound?.isEnabled() ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Upgrade Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <i className="fas fa-rocket text-2xl"></i>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">Ready to Upgrade?</h3>
                        <p className="opacity-90">Unlock all features and 20x your lead capacity!</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                        { feature: 'Analytics', icon: '📊' },
                        { feature: 'Export', icon: '📤' },
                        { feature: '1000 Leads', icon: '👥' },
                        { feature: 'Priority Support', icon: '🚀' }
                    ].map((item, index) => (
                        <div key={index} className="text-center">
                            <div className="text-2xl mb-1">{item.icon}</div>
                            <div className="text-sm font-medium">{item.feature}</div>
                        </div>
                    ))}
                </div>
                
                <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-colors"
                >
                    🚀 Upgrade to Professional - Only $19/month
                </button>
            </div>

            {/* Danger Zone */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-red-200 dark:border-red-800`}>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-6">Account Actions</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Sign Out</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Sign out of your account</p>
                        </div>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to sign out?')) {
                                    window.SteadyAPI?.Auth?.logout();
                                }
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                        >
                            <i className="fas fa-sign-out-alt mr-2"></i>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );    // 📊 Dashboard Tab Component (FREE VERSION)
    const DashboardTab = () => (
        <div className="space-y-6">
            {/* Welcome Section with Upgrade Nudge */}
            <div className={`${freeStyles.headerGradient} rounded-xl p-6 text-white`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">
                            Welcome back, Free Explorer! 🆓
                        </h2>
                        <p className="opacity-90">
                            Great start! You're using {leads.all?.length || 0} of your {FREE_CONFIG.leadLimit} free leads
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">
                            {leads.all?.length || 0}
                        </div>
                        <div className="text-sm opacity-90">
                            Total Leads
                        </div>
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                        >
                            🚀 Upgrade for 1000 leads
                        </button>
                    </div>
                </div>
                
                {/* Upgrade Hint */}
                {leads.all?.length >= 35 && (
                    <div className="mt-4 p-3 bg-white/10 rounded-lg">
                        <p className="text-sm font-medium">
                            🎯 You're doing amazing! Upgrade to Pro to unlock unlimited potential!
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Stats Grid (Basic for Free) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        title: 'Today\'s Leads', 
                        value: goalMetrics.daily.current, 
                        target: goalMetrics.daily.target,
                        icon: 'fas fa-calendar-day', 
                        color: 'blue',
                        progress: goalMetrics.daily.percentage
                    },
                    { 
                        title: 'This Week', 
                        value: goalMetrics.weekly.current, 
                        target: goalMetrics.weekly.target,
                        icon: 'fas fa-calendar-week', 
                        color: 'green',
                        progress: goalMetrics.weekly.percentage
                    },
                    { 
                        title: 'This Month', 
                        value: goalMetrics.monthly.current, 
                        target: goalMetrics.monthly.target,
                        icon: 'fas fa-calendar', 
                        color: 'purple',
                        progress: goalMetrics.monthly.percentage
                    },
                    { 
                        title: 'Free Limit', 
                        value: `${leads.all?.length || 0}/${FREE_CONFIG.leadLimit}`, 
                        icon: 'fas fa-limit', 
                        color: 'orange',
                        upgradeHint: true
                    }
                ].map((stat, index) => (
                    <div key={index} className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder} transition-all duration-200 hover:shadow-md`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.title}</p>
                                <p className={`text-2xl font-bold text-${stat.color}-600`}>
                                    {stat.value}
                                    {stat.target && <span className="text-lg text-gray-400">/{stat.target}</span>}
                                </p>
                                {stat.progress && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                                            <span>Progress</span>
                                            <span>{Math.round(stat.progress)}%</span>
                                        </div>
                                        <div className="mt-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div 
                                                className={`bg-${stat.color}-500 rounded-full h-2 transition-all duration-300`}
                                                style={{ width: `${Math.min(stat.progress, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                                {stat.upgradeHint && (
                                    <button
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        🚀 Upgrade for 20x more
                                    </button>
                                )}
                            </div>
                            <div className={`p-3 bg-${stat.color}-100 dark:bg-${stat.color}-900 rounded-lg`}>
                                <i className={`${stat.icon} text-${stat.color}-600 text-xl`}></i>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity & Upgrade Prompts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Leads */}
                <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Leads</h3>
                        <button
                            onClick={() => handleTabChange('leads')}
                            className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                        >
                            View All
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {leads.all?.slice(0, 5).map((lead) => (
                            <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full ${PLATFORM_ICONS[lead.platform]?.bgColor || 'bg-gray-100'} flex items-center justify-center`}>
                                        <i className={`${PLATFORM_ICONS[lead.platform]?.icon || 'fas fa-user'} text-xs`} 
                                           style={{ color: PLATFORM_ICONS[lead.platform]?.color || '#6b7280' }}></i>
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{lead.platform}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium
                                        ${lead.status === 'New lead' ? 'bg-blue-100 text-blue-800' :
                                          lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800' :
                                          lead.status === 'Qualified' ? 'bg-green-100 text-green-800' :
                                          'bg-gray-100 text-gray-800'}`}>
                                        {lead.status}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {window.SteadyUtils?.Date?.formatRelative(lead.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {(!leads.all || leads.all.length === 0) && (
                            <div className="text-center py-8">
                                <i className="fas fa-users text-gray-400 text-3xl mb-3"></i>
                                <p className="text-gray-600 dark:text-gray-400">No leads yet</p>
                                <button
                                    onClick={() => setShowAddLeadModal(true)}
                                    className="mt-2 text-gray-600 hover:text-gray-700 font-medium"
                                >
                                    Add your first lead
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upgrade Prompts & Features */}
                <div className="space-y-6">
                    {/* Goal Progress */}
                    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Progress</h3>
                        
                        <div className="space-y-4">
                            {[
                                { label: 'Daily Goal', ...goalMetrics.daily, color: 'blue' },
                                { label: 'Weekly Goal', ...goalMetrics.weekly, color: 'green' },
                                { label: 'Monthly Goal', ...goalMetrics.monthly, color: 'purple' }
                            ].map((goal, index) => (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{goal.label}</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {goal.current}/{goal.target}
                                        </span>
                                    </div>
                                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div 
                                            className={`bg-${goal.color}-500 rounded-full h-2 transition-all duration-300`}
                                            style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {Math.round(goal.percentage)}% complete
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upgrade CTA */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <i className="fas fa-rocket text-2xl"></i>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold mb-1">Unlock Pro Features!</h3>
                                <p className="text-sm opacity-90">Analytics, Export, 1000 leads & more!</p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="text-center">
                                <div className="font-bold">📊</div>
                                <div className="text-xs">Analytics</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold">📤</div>
                                <div className="text-xs">Export</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="w-full mt-4 px-4 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                        >
                            🚀 Upgrade Now - Just $19/month!
                        </button>
                    </div>
                </div>
            </div>

            {/* Platform Performance Overview (Basic for Free) */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Platform Overview</h3>
                    <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        🚀 Unlock Full Analytics
                    </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(statistics.platformStats || {}).slice(0, 6).map(([platform, count]) => (
                        <div key={platform} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className={`w-8 h-8 mx-auto mb-2 rounded-full ${PLATFORM_ICONS[platform]?.bgColor || 'bg-gray-100'} flex items-center justify-center`}>
                                <i className={`${PLATFORM_ICONS[platform]?.icon || 'fas fa-globe'} text-sm`} 
                                   style={{ color: PLATFORM_ICONS[platform]?.color || '#6b7280' }}></i>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{platform}</p>
                            <p className="font-bold text-gray-900 dark:text-white">{count}</p>
                        </div>
                    ))}
                </div>
                
                {Object.keys(statistics.platformStats || {}).length === 0 && (
                    <div className="text-center py-8">
                        <i className="fas fa-chart-bar text-gray-400 text-3xl mb-3"></i>
                        <p className="text-gray-600 dark:text-gray-400">No platform data yet</p>
                        <p className="text-sm text-gray-500">Add leads to see platform insights</p>
                    </div>
                )}
            </div>
        </div>
    );

    // 👥 Leads Tab Component (FREE VERSION)
    const LeadsTab = () => (
        <div className="space-y-6">
            {/* Search and Filter Bar (Basic for Free) */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm ${freeStyles.cardBorder}`}>
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input
                                type="text"
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                    
                    {/* Basic Filter */}
                    <div className="flex gap-3">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="all">All Status</option>
                            <option value="New lead">New Lead</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Closed Won">Closed Won</option>
                            <option value="Closed Lost">Closed Lost</option>
                        </select>
                        
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-4 py-3 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition-colors"
                        >
                            🚀 More Filters (Pro)
                        </button>
                    </div>
                </div>
                
                {/* Results Count & Actions */}
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Showing {filteredLeads.length} of {leads.all?.length || 0} leads
                    </p>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddLeadModal(true)}
                            className={`px-4 py-2 ${freeStyles.buttonStyle} text-white rounded-lg hover:scale-105 active:scale-95 transition-all duration-200 font-medium`}
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Add Lead
                        </button>
                        
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium hover:bg-green-200 transition-colors"
                        >
                            <i className="fas fa-download mr-2"></i>
                            Export (Pro)
                        </button>
                    </div>
                </div>
            </div>

            {/* Leads Table/Grid (Basic for Free) */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm ${freeStyles.cardBorder} overflow-hidden`}>
                {filteredLeads.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lead</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{lead.name}</div>
                                                {lead.company && (
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{lead.company}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-white">
                                                {lead.email && (
                                                    <div className="flex items-center">
                                                        <i className="fas fa-envelope text-gray-400 mr-2"></i>
                                                        {lead.email}
                                                    </div>
                                                )}
                                                {lead.phone && (
                                                    <div className="flex items-center mt-1">
                                                        <i className="fas fa-phone text-gray-400 mr-2"></i>
                                                        {lead.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`w-6 h-6 rounded-full ${PLATFORM_ICONS[lead.platform]?.bgColor || 'bg-gray-100'} flex items-center justify-center mr-2`}>
                                                    <i className={`${PLATFORM_ICONS[lead.platform]?.icon || 'fas fa-globe'} text-xs`} 
                                                       style={{ color: PLATFORM_ICONS[lead.platform]?.color || '#6b7280' }}></i>
                                                </div>
                                                <span className="text-sm text-gray-900 dark:text-white">{lead.platform}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium
                                                ${lead.status === 'New lead' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                                  lead.status === 'Contacted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                                  lead.status === 'Qualified' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                  lead.status === 'Closed Won' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' :
                                                  lead.status === 'Closed Lost' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {window.SteadyUtils?.Date?.formatRelative(lead.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedLead(lead);
                                                        setShowEditLeadModal(true);
                                                    }}
                                                    className="text-gray-600 hover:text-gray-700 p-1"
                                                    title="Edit lead"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLead(lead.id)}
                                                    className="text-red-600 hover:text-red-700 p-1"
                                                    title="Delete lead"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <i className="fas fa-users text-gray-400 text-4xl mb-4"></i>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {searchQuery || filterStatus !== 'all' ? 
                             'No leads match your filters' : 'No leads yet'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {searchQuery || filterStatus !== 'all' ? 
                             'Try adjusting your search or filters' : 'Add your first lead to get started'}
                        </p>
                        <button
                            onClick={() => setShowAddLeadModal(true)}
                            className={`px-6 py-3 ${freeStyles.buttonStyle} text-white rounded-lg hover:scale-105 active:scale-95 transition-all duration-200 font-medium`}
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Add Your First Lead
                        </button>
                    </div>
                )}
            </div>
        </div>
    );// 🆓 STEADYMANAGER FREE DASHBOARD V1.0 - THE PERFECT ENTRY EXPERIENCE
// Clean, professional, with strategic upgrade nudges to convert to Pro!
// Built with React + Babel + Tailwind + Font Awesome

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// 🎯 FREE TIER CONFIGURATION
const FREE_CONFIG = {
    name: "Free Explorer",
    badge: "🆓 FREE",
    leadLimit: 50,
    color: "#6b7280",
    bgGradient: "from-gray-400 to-gray-600",
    features: [
        "basic_dashboard",
        "lead_management", 
        "simple_statistics",
        "basic_goals",
        "settings"
    ],
    restrictions: [
        "no_analytics",
        "no_export", 
        "no_advanced_scheduling",
        "limited_statistics"
    ],
    motivations: [
        "Great start! 🌟 Add your first lead!",
        "You're building something amazing! 🚀",
        "Every journey starts with a single step! 💪",
        "Ready to unlock more features? 🔓"
    ],
    upgradePrompts: [
        "🚀 Ready to unlock Pro analytics?",
        "📊 Upgrade for advanced lead scoring!",
        "💼 Join 10,000+ Pro users today!",
        "🎯 Unlock your full potential!"
    ]
};

// 🎨 PLATFORM ICON MAPPING (FONT AWESOME ICONS)
const PLATFORM_ICONS = {
    'LinkedIn': { icon: 'fab fa-linkedin', color: '#0077b5', bgColor: 'bg-blue-100' },
    'Facebook': { icon: 'fab fa-facebook', color: '#1877f2', bgColor: 'bg-blue-100' },
    'Instagram': { icon: 'fab fa-instagram', color: '#e1306c', bgColor: 'bg-pink-100' },
    'Twitter/X': { icon: 'fab fa-twitter', color: '#1da1f2', bgColor: 'bg-blue-100' },
    'TikTok': { icon: 'fab fa-tiktok', color: '#000000', bgColor: 'bg-gray-100' },
    'YouTube': { icon: 'fab fa-youtube', color: '#ff0000', bgColor: 'bg-red-100' },
    'Cold Calls': { icon: 'fas fa-phone', color: '#059669', bgColor: 'bg-green-100' },
    'Cold Emails': { icon: 'fas fa-envelope', color: '#7c3aed', bgColor: 'bg-purple-100' },
    'Referrals': { icon: 'fas fa-users', color: '#f59e0b', bgColor: 'bg-amber-100' },
    'Website Contact': { icon: 'fas fa-globe', color: '#6366f1', bgColor: 'bg-indigo-100' },
    'Custom Platform': { icon: 'fas fa-plus-circle', color: '#6b7280', bgColor: 'bg-gray-100' }
};

// 🎯 MAIN FREE DASHBOARD COMPONENT
const SteadyManagerFreeDashboard = () => {
    // 🔐 Authentication and User State
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // 📊 Data State (Limited for Free)
    const [leads, setLeads] = useState({ all: [] });
    const [statistics, setStatistics] = useState({});
    const [goals, setGoals] = useState({ daily: 3, weekly: 20, monthly: 100 });
    
    // 🎨 UI State
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showAddLeadModal, setShowAddLeadModal] = useState(false);
    const [showEditLeadModal, setShowEditLeadModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    
    // 🔍 Search and Filter State (Basic)
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    
    // 📱 Responsive State
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // 📱 Check mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 🔐 Authentication Check
    useEffect(() => {
        const initAuth = async () => {
            try {
                if (window.SteadyAPI?.isAuthenticated()) {
                    const currentUser = window.SteadyAPI.getCurrentUser();
                    
                    // Ensure user is actually free tier
                    if (currentUser.userType !== 'free') {
                        window.location.href = '/dashboard'; // Redirect to appropriate dashboard
                        return;
                    }
                    
                    setUser(currentUser);
                    setIsAuthenticated(true);
                    
                    // Track free dashboard load
                    window.SteadyUtils?.Analytics?.track('free_dashboard_load', {
                        userTier: 'free'
                    });
                    
                } else {
                    window.location.href = '/login';
                    return;
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);
                window.location.href = '/login';
                return;
            }
            
            setIsLoading(false);
        };

        initAuth();
    }, []);

    // 📊 Data Loading (Limited for Free)
    useEffect(() => {
        if (!isAuthenticated) return;

        const loadDashboardData = async () => {
            try {
                // Load leads (with free tier limits)
                const leadsResponse = await window.SteadyAPI.Leads.getLeads();
                if (leadsResponse.success) {
                    setLeads({ all: leadsResponse.data.all || [] });
                }

                // Load basic statistics
                const statsResponse = await window.SteadyAPI.Leads.getBasicStatistics();
                if (statsResponse.success) {
                    setStatistics(statsResponse.data);
                }

                // Play welcome sound
                window.SteadyUtils?.Sound?.playContextual('dashboard_load');

                // Show upgrade prompt if near limit
                const leadCount = leadsResponse.data?.all?.length || 0;
                if (leadCount >= 40) { // 80% of limit
                    setTimeout(() => {
                        window.SteadyUtils?.Toast?.info('📊 Getting close to your 50 lead limit! Upgrade to Pro for 1000 leads!');
                    }, 2000);
                }

            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                window.SteadyUtils?.Toast?.error('Failed to load data. Please refresh.');
            }
        };

        loadDashboardData();
    }, [isAuthenticated]);

    // 🎨 Theme Management
    useEffect(() => {
        const theme = window.SteadyUtils?.Theme?.getCurrentTheme();
        setIsDarkMode(theme === 'dark');
        
        const handleThemeChange = (event) => {
            setIsDarkMode(event.detail.theme === 'dark');
        };
        
        window.addEventListener('themeChanged', handleThemeChange);
        return () => window.removeEventListener('themeChanged', handleThemeChange);
    }, []);

    // 🎵 Tab Changes with Upgrade Tracking
    const handleTabChange = (tabName) => {
        // Check if tab requires upgrade
        const restrictedTabs = ['analytics', 'advanced_schedule'];
        if (restrictedTabs.includes(tabName)) {
            setShowUpgradeModal(true);
            window.SteadyUtils?.Analytics?.track('upgrade_prompt_shown', {
                trigger: `tab_${tabName}`,
                userTier: 'free'
            });
            return;
        }

        setActiveTab(tabName);
        window.SteadyUtils?.Sound?.playContextual('tab_switch');
        
        window.SteadyUtils?.Analytics?.track('tab_change', {
            from: activeTab,
            to: tabName,
            userTier: 'free'
        });
        
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    // 📊 Lead Management Functions
    const handleAddLead = async (leadData) => {
        try {
            // Check lead limit
            if (leads.all.length >= FREE_CONFIG.leadLimit) {
                setShowUpgradeModal(true);
                window.SteadyUtils?.Toast?.error(`📊 You've reached your ${FREE_CONFIG.leadLimit} lead limit! Upgrade to Pro for 1000 leads!`);
                window.SteadyUtils?.Analytics?.track('upgrade_prompt_shown', {
                    trigger: 'lead_limit_reached',
                    userTier: 'free'
                });
                return;
            }

            const response = await window.SteadyAPI.Leads.createLead(leadData);
            
            if (response.success) {
                // Refresh leads data
                const leadsResponse = await window.SteadyAPI.Leads.getLeads();
                if (leadsResponse.success) {
                    setLeads({ all: leadsResponse.data.all || [] });
                }
                
                // Refresh statistics
                const statsResponse = await window.SteadyAPI.Leads.getBasicStatistics();
                if (statsResponse.success) {
                    setStatistics(statsResponse.data);
                }
                
                window.SteadyUtils?.Toast?.success('Lead added successfully! 🎉');
                window.SteadyUtils?.Sound?.playContextual('lead_added');
                
                setShowAddLeadModal(false);
                
                // Track lead creation
                window.SteadyUtils?.Analytics?.track('lead_created', {
                    platform: leadData.platform,
                    totalLeads: leadsResponse.data.all.length,
                    userTier: 'free'
                });

                // Show upgrade hint if getting close to limit
                const newCount = leadsResponse.data.all.length;
                if (newCount === 30) {
                    window.SteadyUtils?.Toast?.info('🚀 Great progress! You\'re 60% to your free limit. Upgrade to Pro for 20x more leads!');
                } else if (newCount === 45) {
                    window.SteadyUtils?.Toast?.info('📈 Almost at your 50 lead limit! Upgrade to Pro to keep growing!');
                }
                
            } else {
                window.SteadyUtils?.Toast?.error(response.error || 'Failed to add lead');
                window.SteadyUtils?.Sound?.playContextual('validation_failed');
            }
        } catch (error) {
            console.error('Add lead error:', error);
            window.SteadyUtils?.Toast?.error('Failed to add lead. Please try again.');
            window.SteadyUtils?.Sound?.playContextual('api_error');
        }
    };

    const handleEditLead = async (leadId, leadData) => {
        try {
            const response = await window.SteadyAPI.Leads.updateLead(leadId, leadData);
            
            if (response.success) {
                const leadsResponse = await window.SteadyAPI.Leads.getLeads();
                if (leadsResponse.success) {
                    setLeads({ all: leadsResponse.data.all || [] });
                }
                
                window.SteadyUtils?.Toast?.success('Lead updated successfully!');
                window.SteadyUtils?.Sound?.playContextual('lead_updated');
                
                setShowEditLeadModal(false);
                setSelectedLead(null);
                
            } else {
                window.SteadyUtils?.Toast?.error(response.error || 'Failed to update lead');
                window.SteadyUtils?.Sound?.playContextual('validation_failed');
            }
        } catch (error) {
            console.error('Edit lead error:', error);
            window.SteadyUtils?.Toast?.error('Failed to update lead. Please try again.');
        }
    };

    const handleDeleteLead = async (leadId) => {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        
        try {
            const response = await window.SteadyAPI.Leads.deleteLead(leadId);
            
            if (response.success) {
                const leadsResponse = await window.SteadyAPI.Leads.getLeads();
                if (leadsResponse.success) {
                    setLeads({ all: leadsResponse.data.all || [] });
                }
                
                const statsResponse = await window.SteadyAPI.Leads.getBasicStatistics();
                if (statsResponse.success) {
                    setStatistics(statsResponse.data);
                }
                
                window.SteadyUtils?.Toast?.success('Lead deleted successfully');
                window.SteadyUtils?.Sound?.playContextual('lead_deleted');
                
            } else {
                window.SteadyUtils?.Toast?.error(response.error || 'Failed to delete lead');
            }
        } catch (error) {
            console.error('Delete lead error:', error);
            window.SteadyUtils?.Toast?.error('Failed to delete lead. Please try again.');
        }
    };

    // 🔍 Filtered Leads (Basic filtering for Free)
    const filteredLeads = useMemo(() => {
        let filtered = [...(leads.all || [])];
        
        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(lead => 
                lead.name?.toLowerCase().includes(query) ||
                lead.email?.toLowerCase().includes(query) ||
                lead.company?.toLowerCase().includes(query) ||
                lead.platform?.toLowerCase().includes(query)
            );
        }
        
        // Apply status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(lead => lead.status === filterStatus);
        }
        
        return filtered;
    }, [leads.all, searchQuery, filterStatus]);

    // 🎯 Goal Progress Calculations (Basic for Free)
    const goalMetrics = useMemo(() => {
        const today = new Date();
        const thisWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const todayLeads = leads.all?.filter(lead => {
            const leadDate = new Date(lead.created_at);
            return leadDate.toDateString() === today.toDateString();
        }).length || 0;
        
        const weekLeads = leads.all?.filter(lead => {
            const leadDate = new Date(lead.created_at);
            return leadDate >= thisWeek;
        }).length || 0;
        
        const monthLeads = leads.all?.filter(lead => {
            const leadDate = new Date(lead.created_at);
            return leadDate >= thisMonth;
        }).length || 0;
        
        return {
            daily: {
                current: todayLeads,
                target: goals.daily || 3,
                percentage: Math.min((todayLeads / (goals.daily || 3)) * 100, 100)
            },
            weekly: {
                current: weekLeads,
                target: goals.weekly || 20,
                percentage: Math.min((weekLeads / (goals.weekly || 20)) * 100, 100)
            },
            monthly: {
                current: monthLeads,
                target: goals.monthly || 100,
                percentage: Math.min((monthLeads / (goals.monthly || 100)) * 100, 100)
            }
        };
    }, [leads.all, goals]);

    // 🎨 Free Tier Styling
    const freeStyles = {
        headerGradient: `bg-gradient-to-r ${FREE_CONFIG.bgGradient}`,
        badgeClass: `bg-gradient-to-r ${FREE_CONFIG.bgGradient} text-white`,
        cardBorder: 'border-gray-200 dark:border-gray-700',
        buttonStyle: 'bg-gray-600 hover:bg-gray-700',
        upgradeButtonStyle: 'bg-blue-600 hover:bg-blue-700'
    };

    // 🚀 Render Loading State
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Loading SteadyManager...</h2>
                    <p className="text-gray-600 dark:text-gray-400">Preparing your free dashboard</p>
                </div>
            </div>
        );
    }

    // 🎯 Navigation Items (Limited for Free)
    const navigationItems = [
        { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-line', description: 'Overview & insights' },
        { id: 'leads', name: 'Leads', icon: 'fas fa-users', description: 'Manage your leads' },
        { 
            id: 'analytics', 
            name: 'Analytics', 
            icon: 'fas fa-chart-bar', 
            description: 'Performance metrics',
            isPro: true,
            proFeature: true
        },
        { id: 'goals', name: 'Goals', icon: 'fas fa-bullseye', description: 'Track your targets' },
        { id: 'statistics', name: 'Statistics', icon: 'fas fa-chart-pie', description: 'Basic insights' },
        { id: 'settings', name: 'Settings', icon: 'fas fa-cog', description: 'Preferences' }
    ];

    // 🎨 Navigation Component
    const Navigation = () => (
        <nav className={`${isMobile ? 'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out' + (sidebarOpen ? ' translate-x-0' : ' -translate-x-full') : 'w-64'} bg-white dark:bg-gray-800 shadow-lg flex flex-col`}>
            {/* Header */}
            <div className={`p-6 ${freeStyles.headerGradient} text-white`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">SteadyManager</h1>
                        <p className="text-sm opacity-90">Free Lead Management</p>
                    </div>
                    {isMobile && (
                        <button 
                            onClick={() => setSidebarOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
                
                {/* User Info */}
                <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <i className="fas fa-user text-white/80"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.email}</p>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${freeStyles.badgeClass} mt-1`}>
                                {FREE_CONFIG.badge}
                            </div>
                        </div>
                    </div>
                    
                    {/* Lead Limit Display */}
                    <div className="mt-3 p-3 bg-white/10 rounded-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-sm opacity-90">Lead Limit:</span>
                            <span className="text-sm font-bold">
                                {user?.currentMonthLeads || 0}/{FREE_CONFIG.leadLimit}
                            </span>
                        </div>
                        <div className="mt-2 bg-white/20 rounded-full h-2">
                            <div 
                                className="bg-white rounded-full h-2 transition-all duration-300"
                                style={{ 
                                    width: `${Math.min(((user?.currentMonthLeads || 0) / FREE_CONFIG.leadLimit) * 100, 100)}%` 
                                }}
                            ></div>
                        </div>
                        {(user?.currentMonthLeads || 0) >= FREE_CONFIG.leadLimit * 0.8 && (
                            <p className="text-xs text-yellow-200 mt-1">Getting close to limit!</p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Navigation Items */}
            <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navigationItems.map((item) => {
                    const isActive = activeTab === item.id;
                    
                    return (
                        <div key={item.id} className="relative">
                            <button
                                onClick={() => handleTabChange(item.id)}
                                className={`
                                    w-full flex items-center px-4 py-3 rounded-lg text-left transition-all duration-200
                                    ${isActive 
                                        ? `${freeStyles.buttonStyle} text-white shadow-lg` 
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }
                                `}
                            >
                                <i className={`${item.icon} w-5 text-center mr-3`}></i>
                                <div className="flex-1">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs opacity-75">{item.description}</div>
                                </div>
                                {item.proFeature && (
                                    <div className="flex items-center space-x-1">
                                        <i className="fas fa-lock text-xs opacity-50"></i>
                                        <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">PRO</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
            
            {/* Upgrade CTA */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full flex items-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
                >
                    <i className="fas fa-rocket mr-3"></i>
                    <span className="font-medium">🚀 Upgrade to Pro</span>
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Unlock analytics, export & 1000 leads!
                </p>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Free v1.0</span>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => window.SteadyUtils?.toggleTheme()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Toggle theme"
                        >
                            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                        </button>
                        <button
                            onClick={() => window.SteadyUtils?.Sound?.toggle()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Toggle sounds"
                        >
                            <i className={`fas ${window.SteadyUtils?.Sound?.isEnabled() ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );

    // 🎨 Header Component
const Header = () => (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    {isMobile && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <i className="fas fa-bars text-gray-600 dark:text-gray-400"></i>
                        </button>
                    )}
                    
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {FREE_CONFIG.motivations[Math.floor(Math.random() * FREE_CONFIG.motivations.length)]}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-4">
                    {/* Quick Stats */}
                    <div className="hidden md:flex items-center space-x-6 text-sm">
                        <div className="text-center">
                            <div className="font-bold text-gray-900 dark:text-white">
                                {leads.all?.length || 0}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">Total Leads</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-green-600">
                                {goalMetrics.monthly.current}/{goalMetrics.monthly.target}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">Monthly Goal</div>
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-blue-600">
                                {Math.round(goalMetrics.monthly.percentage)}%
                            </div>
                            <div className="text-gray-600 dark:text-gray-400">Progress</div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowAddLeadModal(true)}
                            className={`px-4 py-2 ${freeStyles.buttonStyle} text-white rounded-lg hover:scale-105 active:scale-95 transition-all duration-200 font-medium`}
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Add Lead
                        </button>
                        
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            className={`px-4 py-2 ${freeStyles.upgradeButtonStyle} text-white rounded-lg transition-all duration-200 font-medium`}
                        >
                            <i className="fas fa-rocket mr-2"></i>
                            Upgrade
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>
    );
};