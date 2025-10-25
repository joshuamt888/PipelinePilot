/**
 * PostHog Analytics Configuration
 *
 * PostHog public keys (phc_*) are SAFE to hardcode - they're write-only
 * and designed to be in your frontend code.
 *
 * To enable analytics:
 * 1. Sign up at posthog.com (free tier: 1M events/month)
 * 2. Get your project API key (starts with phc_)
 * 3. Replace 'YOUR_POSTHOG_KEY_HERE' below with your actual key
 * 4. Deploy - analytics will auto-disable on localhost
 */

export async function initAnalytics() {
    // Check if we're in local development
    const isDev = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';

    if (isDev) {
        console.log('🔧 Analytics disabled in local development');
        return;
    }

    // Replace with your actual PostHog key from posthog.com
    const POSTHOG_KEY = 'YOUR_POSTHOG_KEY_HERE';

    if (POSTHOG_KEY === 'YOUR_POSTHOG_KEY_HERE') {
        console.log('📊 Analytics not configured - add PostHog key to analytics.js');
        return;
    }

    try {
        // Load PostHog snippet
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

        // Initialize PostHog
        posthog.init(POSTHOG_KEY, {
            api_host: 'https://app.posthog.com',
            loaded: function(posthog) {
                console.log('✅ PostHog analytics initialized');
            },
            // Respect user privacy preferences
            respect_dnt: true,
            // Capture pageviews automatically
            capture_pageview: true,
            // Session recording (optional - disable if you don't need it)
            disable_session_recording: false
        });

    } catch (error) {
        console.error('Failed to initialize analytics:', error);
    }
}
