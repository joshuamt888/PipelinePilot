// 🧠 STEADYMANAGER DASHBOARD - THE ABSOLUTE CHAOS BRAIN
// This is where the magic happens! 🎭

const { useState, useEffect, useCallback, useMemo, useRef } = React;

// 👑 ADMIN CHAOS LEAD LIMIT OPTIONS - THE RIDICULOUS DROPDOWN
const ADMIN_LEAD_OPTIONS = [
    { value: 'unlimited', label: '∞ Unlimited', emoji: '♾️', chaos: 1 },
    { value: 'grillion', label: '1 GRILLION', emoji: '🚀', chaos: 10 },
    { value: 'bazillion', label: '69 Bazillion', emoji: '😎', chaos: 8 },
    { value: 'kajillion', label: '420 Kajillion', emoji: '🔥', chaos: 9 },
    { value: 'infinity_plus_one', label: '∞ + 1', emoji: '🤯', chaos: 7 },
    { value: 'over_9000', label: 'OVER 9000!', emoji: '💥', chaos: 6 },
    { value: 'all_the_leads', label: 'ALL THE LEADS', emoji: '👑', chaos: 5 },
    { value: 'universe', label: 'Every atom in universe', emoji: '🌌', chaos: 10 },
    { value: 'god_mode', label: 'GOD MODE', emoji: '⚡', chaos: 8 },
    { value: 'chuck_norris', label: 'Chuck Norris approved', emoji: '🥋', chaos: 7 },
    { value: 'bitcoin', label: '21 Million (like Bitcoin)', emoji: '₿', chaos: 4 },
    { value: 'google', label: '1 Googol', emoji: '🔢', chaos: 6 },
    { value: 'potato', label: '7 Billion Potatoes', emoji: '🥔', chaos: 3 },
    { value: 'meme', label: 'Tree Fiddy Million', emoji: '🌳', chaos: 2 }
];

// 🎨 TIER CONFIGURATIONS WITH PERSONALITY
const TIER_CONFIGS = {
    free: {
        welcome: "Welcome, brave soul! 🌱",
        subtitle: "Start your lead journey here",
        color: '#6b7280',
        limits: "50 leads/month",
        cta: "Ready to supercharge your leads? 🚀",
        badge: "FREE",
        personality: "humble"
    },
    professional_trial: {
        welcome: "TRIAL POWER ACTIVATED! 🎁",
        subtitle: "You're experiencing the good stuff",
        color: '#8b5cf6',
        limits: "1000 leads (trial mode)",
        cta: "⏰ Keep this momentum going!",
        badge: "🎁 TRIAL",
        personality: "excited"
    },
    professional: {
        welcome: "You're absolutely crushing it! 🚀",
        subtitle: "Professional tier unlocked",
        color: '#3b82f6',
        limits: "1000 leads/month",
        badge: "🚀 PRO",
        personality: "confident"
    },
    business: {
        welcome: "Business mode ENGAGED! 💼",
        subtitle: "Scaling like a champion",
        color: '#059669',
        limits: "10,000 leads/month",
        badge: "💼 BUSINESS",
        personality: "powerful"
    },
    enterprise: {
        welcome: "Enterprise DOMINATION! ⭐",
        subtitle: "Unlimited potential unlocked",
        color: '#dc2626',
        limits: "Unlimited leads",
        badge: "⭐ ENTERPRISE",
        personality: "unstoppable"
    },
    admin: {
        welcome: "ALL HAIL THE SUPREME OVERLORD! 👑",
        subtitle: "Master of the digital realm",
        color: '#fbbf24',
        limits: "∞ EVERYTHING",
        badge: "👑 ADMIN",
        personality: "chaotic_good",
        effects: ['golden_glow', 'crown_animation', 'sparkles']
    }
};

// 🎭 NAVIGATION ITEMS WITH TIER RESTRICTIONS
const NAV_ITEMS = [
    { 
        id: 'overview', 
        icon: 'fa-chart-line', 
        label: 'Overview',
        minTier: 'free',
        description: 'Your dashboard home'
    },
    { 
        id: 'leads', 
        icon: 'fa-users', 
        label: 'Leads',
        minTier: 'free',
        description: 'Manage your pipeline'
    },
    { 
        id: 'analytics', 
        icon: 'fa-chart-bar', 
        label: 'Analytics',
        minTier: 'professional',
        description: 'Deep insights & reporting'
    },
    { 
        id: 'pipeline', 
        icon: 'fa-stream', 
        label: 'Pipeline',
        minTier: 'professional',
        description: 'Visual sales pipeline'
    },
    { 
        id: 'schedule', 
        icon: 'fa-calendar', 
        label: 'Schedule',
        minTier: 'business',
        description: 'Follow-up scheduling'
    },
    { 
        id: 'activity', 
        icon: 'fa-history', 
        label: 'Activity',
        minTier: 'business',
        description: 'Timeline & history'
    },
    { 
        id: 'insights', 
        icon: 'fa-lightbulb', 
        label: 'AI Insights',
        minTier: 'business',
        description: 'AI-powered recommendations'
    },
    { 
        id: 'settings', 
        icon: 'fa-cog', 
        label: 'Settings',
        minTier: 'free',
        description: 'Customize your experience'
    }
];

// 🎪 ADMIN CHAOS EFFECTS
const AdminChaosEffects = ({ isActive, chaosLevel = 5 }) => {
    const [particles, setParticles] = useState([]);
    const intervalRef = useRef();

    useEffect(() => {
        if (!isActive || chaosLevel < 3) return;

        const createParticle = () => ({
            id: Math.random(),
            emoji: ['✨', '⚡', '🔥', '💫', '⭐'][Math.floor(Math.random() * 5)],
            x: Math.random() * 100,
            y: Math.random() * 100,
            life: 100
        });

        intervalRef.current = setInterval(() => {
            setParticles(prev => {
                const updated = prev
                    .map(p => ({ ...p, life: p.life - 2, y: p.y - 1 }))
                    .filter(p => p.life > 0);
                
                if (updated.length < chaosLevel) {
                    updated.push(createParticle());
                }
                
                return updated;
            });
        }, 100);

        return () => clearInterval(intervalRef.current);
    }, [isActive, chaosLevel]);

    if (!isActive) return null;

    return (
        <div className="admin-chaos-container" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9999
        }}>
            {particles.map(particle => (
                <div
                    key={particle.id}
                    style={{
                        position: 'absolute',
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        opacity: particle.life / 100,
                        fontSize: '1.5rem',
                        transform: `scale(${particle.life / 100})`,
                        transition: 'all 0.1s ease'
                    }}
                >
                    {particle.emoji}
                </div>
            ))}
        </div>
    );
};

// 👑 ADMIN LEAD COUNTER WITH RIDICULOUS DROPDOWN
const AdminLeadCounter = ({ user, onChaosLevelChange }) => {
    const [selectedOption, setSelectedOption] = useState(ADMIN_LEAD_OPTIONS[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [pulseEffect, setPulseEffect] = useState(false);

    const handleOptionSelect = useCallback((option) => {
        setSelectedOption(option);
        setIsDropdownOpen(false);
        setPulseEffect(true);
        
        // Trigger chaos effects based on selection
        onChaosLevelChange?.(option.chaos);
        
        // Add some admin sass
        if (option.chaos >= 8) {
            console.log(`🎭 Admin selected "${option.label}" - MAXIMUM CHAOS ENGAGED!`);
        }
        
        setTimeout(() => setPulseEffect(false), 600);
    }, [onChaosLevelChange]);

    // Regular user display
    if (!user.isAdmin) {
        const progressPercentage = Math.min((user.currentMonthLeads / user.monthlyLeadLimit) * 100, 100);
        
        return (
            <div className="lead-counter">
                <div className="counter-label">Monthly Progress</div>
                <div className="counter-display">
                    <div className="counter-button">
                        {user.currentMonthLeads} / {user.monthlyLeadLimit}
                    </div>
                    <div className="progress-bar" style={{ marginTop: '8px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}>
                        <div 
                            className="progress-fill" 
                            style={{ 
                                width: `${progressPercentage}%`,
                                height: '100%',
                                background: 'rgba(255,255,255,0.8)',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease'
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // 👑 ADMIN SUPREME CHAOS COUNTER
    return (
        <div className="lead-counter">
            <div className="counter-label">Supreme Overlord Status</div>
            <div className="counter-display" style={{ position: 'relative' }}>
                <button 
                    className={`counter-button admin-glow ${pulseEffect ? 'chaos-button' : ''}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    style={{
                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                        border: 'none',
                        color: 'white',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        minWidth: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.3rem' }}>{selectedOption.emoji}</span>
                        <span>{selectedOption.label}</span>
                    </span>
                    <i 
                        className="fas fa-chevron-down" 
                        style={{ 
                            transition: 'transform 0.15s ease',
                            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}
                    />
                    
                    {/* Shimmer effect */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: isDropdownOpen ? '100%' : '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        transition: 'left 0.6s ease'
                    }} />
                </button>
                
                {/* THE RIDICULOUS DROPDOWN */}
                <div 
                    className="admin-dropdown"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        minWidth: '250px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        transform: isDropdownOpen ? 'translateY(4px) scale(1)' : 'translateY(-8px) scale(0.95)',
                        opacity: isDropdownOpen ? 1 : 0,
                        visibility: isDropdownOpen ? 'visible' : 'hidden',
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    {ADMIN_LEAD_OPTIONS.map((option, index) => (
                        <div
                            key={option.value}
                            className={`dropdown-item ${selectedOption.value === option.value ? 'selected' : ''}`}
                            onClick={() => handleOptionSelect(option)}
                            style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                borderBottom: index < ADMIN_LEAD_OPTIONS.length - 1 ? '1px solid var(--border-light)' : 'none',
                                background: selectedOption.value === option.value 
                                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' 
                                    : 'transparent',
                                color: selectedOption.value === option.value ? 'white' : 'var(--text-primary)',
                                transition: 'all 0.15s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedOption.value !== option.value) {
                                    e.target.style.background = 'var(--bg-secondary)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedOption.value !== option.value) {
                                    e.target.style.background = 'transparent';
                                }
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{option.emoji}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '500' }}>{option.label}</div>
                                <div style={{ 
                                    fontSize: '0.75rem', 
                                    opacity: 0.7,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    Chaos Level: {'🔥'.repeat(Math.min(option.chaos, 5))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 🎨 TIER-BASED WELCOME HEADER
const WelcomeHeader = ({ user, tierConfig }) => {
    const [timeOfDay, setTimeOfDay] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setTimeOfDay('morning');
        else if (hour < 17) setTimeOfDay('afternoon');
        else setTimeOfDay('evening');
    }, []);

    const getTimeGreeting = () => {
        const greetings = {
            morning: user.isAdmin ? 'Good morning, Supreme Overlord' : 'Good morning',
            afternoon: user.isAdmin ? 'Good afternoon, Your Majesty' : 'Good afternoon', 
            evening: user.isAdmin ? 'Good evening, Ruler of All' : 'Good evening'
        };
        return greetings[timeOfDay] || 'Hello';
    };

    return (
        <div className={`welcome-header gradient-bg fade-in ${user.isAdmin ? 'sparkle-container' : ''}`}>
            <div className="welcome-content">
                <h1 className="welcome-title">
                    {getTimeGreeting()}! {tierConfig.welcome}
                </h1>
                <p className="welcome-subtitle">
                    {tierConfig.subtitle} • {user.currentMonthLeads} leads added this month
                </p>
                {tierConfig.cta && (
                    <p style={{ marginTop: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                        {tierConfig.cta}
                    </p>
                )}
            </div>
            <div className="tier-badge">{tierConfig.badge}</div>
        </div>
    );
};

// 📊 STATS CARDS WITH TIER-BASED FEATURES
const StatsCards = ({ leads, user, stats }) => {
    const [animateNumbers, setAnimateNumbers] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setAnimateNumbers(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const progressPercentage = Math.min((user.currentMonthLeads / user.monthlyLeadLimit) * 100, 100);

    const statItems = [
        {
            number: stats?.totalLeads || 0,
            label: 'Total Leads',
            icon: 'fa-users',
            color: 'var(--primary)'
        },
        {
            number: stats?.warmLeads || 0,
            label: 'Warm Leads',
            icon: 'fa-fire',
            color: 'var(--success)'
        },
        {
            number: stats?.coldLeads || 0,
            label: 'Cold Leads',
            icon: 'fa-snowflake',
            color: 'var(--info)'
        },
        {
            number: user.isAdmin ? '∞' : Math.round(progressPercentage),
            label: user.isAdmin ? 'Admin Power' : 'Monthly Goal',
            icon: user.isAdmin ? 'fa-crown' : 'fa-target',
            color: user.isAdmin ? 'var(--accent)' : 'var(--warning)',
            suffix: user.isAdmin ? '' : '%'
        }
    ];

    return (
        <div className="grid grid-4">
            {statItems.map((stat, index) => (
                <div 
                    key={index}
                    className={`card stat-card scale-in ${user.isAdmin ? 'admin-glow' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <div style={{ marginBottom: '8px' }}>
                        <i className={`fas ${stat.icon}`} style={{ color: stat.color, fontSize: '1.5rem' }} />
                    </div>
                    <span 
                        className={`stat-number ${animateNumbers ? 'count-up' : ''}`}
                        style={{ color: stat.color }}
                    >
                        {stat.number}{stat.suffix}
                    </span>
                    <span className="stat-label">{stat.label}</span>
                </div>
            ))}
        </div>
    );
};

// 🚀 QUICK ACTIONS WITH TIER GATING
const QuickActions = ({ user, onAction }) => {
    const actions = [
        {
            id: 'add_lead',
            icon: 'fa-plus',
            label: 'Add Lead',
            variant: 'primary',
            minTier: 'free'
        },
        {
            id: 'import_csv',
            icon: 'fa-upload',
            label: 'Import CSV',
            variant: 'secondary',
            minTier: 'professional'
        },
        {
            id: 'export_data',
            icon: 'fa-download',
            label: 'Export Data',
            variant: 'secondary',
            minTier: 'professional'
        },
        {
            id: 'ai_insights',
            icon: 'fa-magic',
            label: 'AI Insights',
            variant: 'secondary',
            minTier: 'business'
        }
    ];

    const tierOrder = ['free', 'professional_trial', 'professional', 'business', 'enterprise', 'admin'];
    const userTierIndex = tierOrder.indexOf(user.userType);

    return (
        <div className="card fade-in">
            <h3 className="card-title">Quick Actions</h3>
            <div className="quick-actions">
                {actions.map(action => {
                    const requiredTierIndex = tierOrder.indexOf(action.minTier);
                    const hasAccess = userTierIndex >= requiredTierIndex || user.isAdmin;
                    
                    return (
                        <button
                            key={action.id}
                            className={`btn btn-${action.variant} ${!hasAccess ? 'opacity-50' : ''}`}
                            onClick={() => hasAccess && onAction?.(action.id)}
                            disabled={!hasAccess}
                            style={{ 
                                position: 'relative',
                                opacity: hasAccess ? 1 : 0.5
                            }}
                        >
                            <i className={`fas ${action.icon}`} />
                            {action.label}
                            {!hasAccess && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    background: 'var(--warning)',
                                    color: 'white',
                                    borderRadius: '12px',
                                    padding: '2px 6px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600'
                                }}>
                                    PRO+
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// 📋 RECENT LEADS TABLE
const RecentLeads = ({ leads, onLeadClick }) => {
    const recentLeads = leads.slice(0, 5);
    
    return (
        <div className="card fade-in">
            <div className="card-header">
                <h3 className="card-title">Recent Leads</h3>
                <span className="text-secondary">{leads.length} total</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Name</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Company</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Type</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Score</th>
                            <th style={{ padding: '12px 8px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentLeads.map(lead => (
                            <tr 
                                key={lead.id} 
                                style={{ 
                                    borderBottom: '1px solid var(--border-light)',
                                    transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: '12px 8px' }}>
                                    <div style={{ fontWeight: '500' }}>{lead.name}</div>
                                </td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                                    {lead.company || 'No company'}
                                </td>
                                <td style={{ padding: '12px 8px' }}>
                                    <span className={`type-badge type-${lead.type}`}>
                                        {lead.type}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                            {lead.quality_score}/10
                                        </span>
                                        <span style={{ color: '#fbbf24' }}>
                                            {'★'.repeat(Math.round(lead.quality_score / 2))}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 8px' }}>
                                    <button
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => onLeadClick?.(lead)}
                                        style={{ padding: '4px 8px' }}
                                    >
                                        <i className="fas fa-eye" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {recentLeads.length === 0 && (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '40px 20px', 
                        color: 'var(--text-secondary)' 
                    }}>
                        <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '16px', opacity: 0.5 }} />
                        <p>No leads yet. Time to get started! 🚀</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 🎯 MAIN DASHBOARD COMPONENT - THE ABSOLUTE UNIT
const Dashboard = () => {
    // 🔐 Authentication & User State
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token')); // Fixed to match login
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🎭 UI State
    const [currentView, setCurrentView] = useState('overview');
    const [isDark, setIsDark] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [adminChaosLevel, setAdminChaosLevel] = useState(5);

    // 📊 Data State
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({});
    const [dataLoading, setDataLoading] = useState(false);

    // 🎨 Get tier configuration
    const tierConfig = useMemo(() => {
        return TIER_CONFIGS[user?.userType] || TIER_CONFIGS.free;
    }, [user?.userType]);

    // 🔐 Authentication Check
    useEffect(() => {
        const checkAuth = async () => {
            if (!token) {
                setLoading(false);
                window.location.href = '/login';
                return;
            }

            try {
                const response = await fetch('/api/user/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Authentication failed');
                }

                const userData = await response.json();
                setUser(userData);
                
                // Load initial data
                await loadDashboardData();
                
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token'); // Fixed to match login
                window.location.href = '/login';
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [token]);

    // 📊 Load Dashboard Data
    const loadDashboardData = useCallback(async () => {
        if (!token) return;

        setDataLoading(true);
        try {
            const [leadsResponse, statsResponse] = await Promise.all([
                fetch('/api/leads', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/statistics', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (leadsResponse.ok) {
                const leadsData = await leadsResponse.json();
                setLeads(leadsData.all || []);
            }

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            setError('Failed to load data');
        } finally {
            setDataLoading(false);
        }
    }, [token]);

    // 🎨 Set Theme Based on Tier
    useEffect(() => {
        if (user) {
            document.documentElement.setAttribute('data-tier', user.userType);
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
            
            // Admin gets special treatment
            if (user.isAdmin) {
                document.body.classList.add('admin-mode');
                console.log('👑 ADMIN MODE ACTIVATED - SUPREME OVERLORD DETECTED');
            }
        }
    }, [user?.userType, isDark]);

    // 🎛️ Theme Toggle
    const toggleTheme = useCallback(() => {
        setIsDark(prev => !prev);
    }, []);

    // 🎯 Navigation Handler
    const handleNavigation = useCallback((viewId) => {
        setCurrentView(viewId);
        
        // Add some admin sass
        if (user?.isAdmin && viewId === 'settings') {
            console.log('🔧 Admin accessing settings - probably breaking something...');
        }
    }, [user?.isAdmin]);

    // 🎪 Quick Action Handler
    const handleQuickAction = useCallback((actionId) => {
        switch (actionId) {
            case 'add_lead':
                // TODO: Open add lead modal
                console.log('🚀 Opening add lead modal...');
                break;
            case 'import_csv':
                console.log('📤 Import CSV functionality...');
                break;
            case 'export_data':
                console.log('📥 Export data functionality...');
                break;
            case 'ai_insights':
                console.log('🤖 AI insights coming soon...');
                break;
            default:
                console.log(`Unknown action: ${actionId}`);
        }
    }, []);

    // 👑 Header Component
    const Header = () => (
        <header className="header">
            <div className="header-left">
                <button
                    className="btn btn-ghost"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    style={{ padding: '8px' }}
                >
                    <i className="fas fa-bars" />
                </button>
                <a href="/" className="logo">SteadyManager</a>
                {user && <span className="tier-badge">{tierConfig.badge}</span>}
            </div>
            <div className="header-right">
                <AdminLeadCounter 
                    user={user} 
                    onChaosLevelChange={setAdminChaosLevel}
                />
                <button className="theme-toggle" onClick={toggleTheme}>
                    <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} />
                </button>
                <div 
                    className={`user-avatar ${user?.isAdmin ? 'admin' : ''}`}
                    title={user?.email}
                >
                    {user?.email?.charAt(0).toUpperCase()}
                </div>
            </div>
        </header>
    );

    // 📱 Sidebar Component
    const Sidebar = () => {
        const tierOrder = ['free', 'professional_trial', 'professional', 'business', 'enterprise', 'admin'];
        const userTierIndex = tierOrder.indexOf(user?.userType);

        return (
            <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                {NAV_ITEMS.map(item => {
                    const requiredTierIndex = tierOrder.indexOf(item.minTier);
                    const hasAccess = userTierIndex >= requiredTierIndex || user?.isAdmin;
                    
                    return (
                        <div
                            key={item.id}
                            className={`nav-item ${currentView === item.id ? 'active' : ''} ${!hasAccess ? 'disabled' : ''}`}
                            onClick={() => hasAccess && handleNavigation(item.id)}
                            title={sidebarCollapsed ? item.label : item.description}
                            style={{ 
                                opacity: hasAccess ? 1 : 0.5,
                                cursor: hasAccess ? 'pointer' : 'not-allowed',
                                position: 'relative'
                            }}
                        >
                            <i className={`fas ${item.icon}`} />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                            {!hasAccess && !sidebarCollapsed && (
                                <span style={{
                                    marginLeft: 'auto',
                                    fontSize: '0.7rem',
                                    background: 'var(--warning)',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '8px'
                                }}>
                                    PRO+
                                </span>
                            )}
                        </div>
                    );
                })}
            </nav>
        );
    };

    // 🏠 Overview View
    const OverviewView = () => (
        <div className="fade-in">
            <WelcomeHeader user={user} tierConfig={tierConfig} />
            <StatsCards leads={leads} user={user} stats={stats} />
            <div className="grid grid-2" style={{ marginTop: 'var(--space-lg)' }}>
                <QuickActions user={user} onAction={handleQuickAction} />
                <div className="card fade-in">
                    <h3 className="card-title">Monthly Progress</h3>
                    <div className="progress-container">
                        <div className="progress-label">
                            <span>Leads Added</span>
                            <span>{user.currentMonthLeads} / {user.isAdmin ? '∞' : user.monthlyLeadLimit}</span>
                        </div>
                        <div className="progress-bar">
                            <div 
                                className="progress-fill progress-fill-animate" 
                                style={{ 
                                    width: user.isAdmin ? '100%' : `${Math.min((user.currentMonthLeads / user.monthlyLeadLimit) * 100, 100)}%`
                                }}
                            />
                        </div>
                        {user.isAdmin && (
                            <p style={{ 
                                textAlign: 'center', 
                                marginTop: '12px', 
                                color: 'var(--accent)',
                                fontWeight: '600'
                            }}>
                                👑 UNLIMITED POWER ENGAGED 👑
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <div style={{ marginTop: 'var(--space-lg)' }}>
                <RecentLeads leads={leads} onLeadClick={(lead) => console.log('Lead clicked:', lead)} />
            </div>
        </div>
    );

    // 🔄 Placeholder Views (will be replaced with actual components)
    const PlaceholderView = ({ title, description, comingSoon = true }) => (
        <div className="fade-in">
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{title}</h2>
                    {comingSoon && (
                        <span style={{
                            background: 'var(--warning)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                        }}>
                            COMING SOON
                        </span>
                    )}
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                    {description}
                </p>
                <div style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: 'var(--space-lg)', 
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                }}>
                    <i className="fas fa-construction" style={{ 
                        fontSize: '3rem', 
                        color: 'var(--warning)', 
                        marginBottom: 'var(--space-md)' 
                    }} />
                    <p style={{ color: 'var(--text-secondary)' }}>
                        This feature is being crafted with love and will be available soon! 🚀
                    </p>
                </div>
            </div>
        </div>
    );

    // 🎭 View Renderer
    const renderCurrentView = () => {
        if (dataLoading && currentView !== 'overview') {
            return (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '400px' 
                }}>
                    <div className="loading-spinner" />
                </div>
            );
        }

        switch (currentView) {
            case 'overview':
                return <OverviewView />;
            case 'leads':
                return <PlaceholderView 
                    title="Lead Management" 
                    description="Full CRUD interface for managing your sales pipeline. Features inline editing, bulk actions, and advanced filtering."
                />;
            case 'analytics':
                return <PlaceholderView 
                    title="Analytics & Insights" 
                    description="Deep dive into your lead performance with advanced analytics, conversion tracking, and AI-powered insights."
                />;
            case 'pipeline':
                return <PlaceholderView 
                    title="Visual Pipeline" 
                    description="Drag-and-drop pipeline management with customizable stages and automated workflows."
                />;
            case 'schedule':
                return <PlaceholderView 
                    title="Schedule Management" 
                    description="Smart follow-up scheduling with calendar integration and automated reminders."
                />;
            case 'activity':
                return <PlaceholderView 
                    title="Activity Timeline" 
                    description="Complete history of all interactions, changes, and activities across your leads."
                />;
            case 'insights':
                return <PlaceholderView 
                    title="AI Insights" 
                    description="Machine learning powered recommendations, lead scoring, and predictive analytics."
                />;
            case 'settings':
                return <PlaceholderView 
                    title="Settings & Profile" 
                    description="Customize your experience, manage your subscription, and configure integrations."
                />;
            default:
                return <OverviewView />;
        }
    };

    // 🔄 Loading State
    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
            </div>
        );
    }

    // ❌ Error State
    if (error) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <i className="fas fa-exclamation-triangle" style={{ 
                    fontSize: '3rem', 
                    color: 'var(--error)' 
                }} />
                <h2>Oops! Something went wrong</h2>
                <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button 
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                >
                    Try Again
                </button>
            </div>
        );
    }

    // 🎯 Main Dashboard Render
    return (
        <>
            {/* Admin Chaos Effects */}
            <AdminChaosEffects 
                isActive={user?.isAdmin} 
                chaosLevel={adminChaosLevel} 
            />
            
            {/* Main Dashboard Layout */}
            <div className={`dashboard-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Header />
                <Sidebar />
                <main className="main-content">
                    {renderCurrentView()}
                </main>
            </div>
        </>
    );
};

// 🚀 INITIALIZE THE CHAOS
ReactDOM.render(<Dashboard />, document.getElementById('dashboard-root'));