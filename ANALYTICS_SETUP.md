# Analytics Setup (Optional)

PostHog analytics is ready to use - just add your key!

## Quick Setup (3 Steps)

### Step 1: Sign Up for PostHog
- Go to [posthog.com](https://posthog.com) and create a free account
- Free tier includes: 1M events/month, unlimited seats, session replays

### Step 2: Get Your API Key
- In PostHog dashboard, go to Project Settings
- Copy your "Project API Key" (starts with `phc_`)

### Step 3: Add Key to Code
Open `/public/dashboard/shared/js/analytics.js` and replace this line:
```javascript
const POSTHOG_KEY = 'YOUR_POSTHOG_KEY_HERE';
```

With your actual key:
```javascript
const POSTHOG_KEY = 'phc_your_actual_key_here_from_posthog';
```

That's it! Deploy and analytics will work.

## How It Works

**Local Development:**
- Analytics auto-disabled when running on `localhost` or `127.0.0.1`
- No events sent to PostHog during local testing

**Production:**
- Analytics enabled automatically when deployed
- Respects "Do Not Track" browser settings
- Tracks pageviews, button clicks, user flows

## Why PostHog Keys Are Safe to Hardcode

PostHog's public API keys (`phc_*`) are **write-only**:
- ✅ Can ONLY send events to PostHog
- ✅ CANNOT read your analytics data
- ✅ CANNOT modify your PostHog settings
- ✅ Designed to be in frontend code

This is different from secret keys (API keys, database passwords, etc.) which should NEVER be hardcoded.

## Legal Compliance

Your Terms of Service and Privacy Policy already disclose PostHog usage:
- ✅ Terms Section 6: Analytics disclosure
- ✅ Privacy Section 3.1: PostHog listed as service provider
- ✅ Privacy Section 6: Analytics cookies explained

You're legally covered when you enable analytics!

## Features You Can Use

Once enabled, PostHog provides:
- **Event Tracking**: See what features users click
- **Session Replays**: Watch how users navigate your app (privacy-friendly)
- **Funnels**: Track conversion rates (signup → trial → paid)
- **Feature Flags**: A/B test new features
- **User Cohorts**: Segment users by behavior

All included in the free tier!

## Privacy Settings

The analytics.js file is configured with privacy-first defaults:
```javascript
respect_dnt: true,              // Respects "Do Not Track" browser setting
disable_session_recording: false // Session replays enabled (can disable if needed)
```

To disable session recording, change to:
```javascript
disable_session_recording: true
```

## Questions?

PostHog docs: https://posthog.com/docs
