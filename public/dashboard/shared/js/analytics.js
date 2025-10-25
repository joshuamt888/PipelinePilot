/**
 * Analytics Configuration
 *
 * To enable PostHog analytics:
 * 1. Set POSTHOG_API_KEY in your Railway environment variables
 * 2. Create an API endpoint that serves this key: GET /api/config/analytics
 * 3. Uncomment the code below
 *
 * NOTE: PostHog's public API key is safe for client-side use, but we still
 * recommend serving it via Railway env vars for better security practices.
 */

// export async function initAnalytics() {
//     try {
//         // Fetch PostHog key from your backend (served from Railway env var)
//         const response = await fetch('/api/config/analytics');
//         if (!response.ok) {
//             console.log('Analytics not configured - skipping');
//             return;
//         }
//
//         const { posthogKey } = await response.json();
//         if (!posthogKey) {
//             console.log('PostHog key not found - analytics disabled');
//             return;
//         }
//
//         // Load PostHog script
//         !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
//
//         // Initialize PostHog with key from backend
//         posthog.init(posthogKey, {
//             api_host: 'https://app.posthog.com',
//             loaded: function(posthog) {
//                 console.log('PostHog analytics initialized');
//             }
//         });
//
//     } catch (error) {
//         console.error('Failed to initialize analytics:', error);
//     }
// }

// Placeholder - analytics disabled by default
export async function initAnalytics() {
    console.log('Analytics disabled - set POSTHOG_API_KEY in Railway to enable');
}
