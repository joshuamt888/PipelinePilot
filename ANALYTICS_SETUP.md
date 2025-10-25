# Analytics Setup (Optional)

PostHog analytics is disabled by default. To enable it:

## Step 1: Add Environment Variable to Railway

In your Railway project dashboard:

```bash
POSTHOG_API_KEY=phc_your_actual_key_here
```

## Step 2: Create Backend Endpoint

Add this to your Railway Node.js backend (e.g., `server.js` or `index.js`):

```javascript
// GET /api/config/analytics
app.get('/api/config/analytics', (req, res) => {
  const posthogKey = process.env.POSTHOG_API_KEY;

  if (!posthogKey) {
    return res.status(404).json({ error: 'Analytics not configured' });
  }

  res.json({
    posthogKey: posthogKey
  });
});
```

## Step 3: Enable Analytics in Frontend

Uncomment the code in `/public/dashboard/shared/js/analytics.js`

## Step 4: Import in Your Pages

Add to registration page (`/public/auth/register.html`):

```html
<script type="module">
  import { initAnalytics } from '/dashboard/shared/js/analytics.js';
  initAnalytics();
</script>
```

## Why This Approach?

- ✅ No hardcoded keys in public files
- ✅ Key stored securely in Railway env vars
- ✅ Backend serves key only when configured
- ✅ Easy to enable/disable analytics
- ✅ Follows security best practices

## PostHog Public Key Notes

PostHog's public API key (`phc_*`) is designed for client-side use and is safe to expose (it only allows sending events, not reading data). However, using env vars is still better practice for:
- Easier key rotation
- Centralized config management
- Avoiding accidental key commits to Git

## Legal Disclosure

The Terms of Service and Privacy Policy already include PostHog disclosure (Section 6 in both files), so you're covered legally when you enable it.
