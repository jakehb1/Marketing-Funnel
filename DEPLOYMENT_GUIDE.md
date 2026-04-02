# Deployment Guide — Google Ads + Meta Integration

Quick reference for deploying the API integrations to production (Railway).

## Pre-Deployment Checklist

- [ ] All endpoints tested locally
- [ ] Google Ads credentials obtained and tested
- [ ] Meta credentials obtained and tested
- [ ] `.env` file configured locally
- [ ] Code committed to GitHub
- [ ] `package.json` updated with new dependencies
- [ ] Documentation reviewed

## Step 1: Prepare for Deployment

### Verify Local Setup

```bash
cd video-manager/backend

# Install dependencies
npm install

# Test with local .env
npm start

# In another terminal
curl http://localhost:5000/api/google-ads/test
curl http://localhost:5000/api/meta/test
curl http://localhost:5000/api/ads/metrics
```

All should return `success: true`.

### Commit Changes

```bash
git add .
git commit -m "feat: Add Google Ads + Meta API integrations

- Create /api/google-ads endpoint for campaign metrics
- Create /api/meta endpoint for insights
- Add /api/ads/metrics unified endpoint with 5min caching
- Update metrics.html dashboard to fetch live data
- Update integrations.html with credential management UI
- Add comprehensive documentation (API_SETUP, CREDENTIALS, INTEGRATIONS_README)
- Includes error handling, validation, and rate limit protection"

git push origin main
```

## Step 2: Configure Railway

### 1. Go to Railway Dashboard

1. Open [railway.app](https://railway.app)
2. Select your ENNIE project
3. Click **Backend** service
4. Go to **Variables** tab

### 2. Add Environment Variables

Add each variable exactly as shown:

| Variable | Value | Notes |
|----------|-------|-------|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | `[from API_SETUP.md]` | From Google Ads settings |
| `GOOGLE_ADS_CUSTOMER_ID` | `[from API_SETUP.md]` | Your customer ID (no dashes) |
| `GOOGLE_ADS_CLIENT_ID` | `[from API_SETUP.md]` | From Google Cloud OAuth |
| `GOOGLE_ADS_CLIENT_SECRET` | `[from API_SETUP.md]` | From Google Cloud OAuth |
| `GOOGLE_ADS_REFRESH_TOKEN` | `[from API_SETUP.md]` | From OAuth flow |
| `META_ACCESS_TOKEN` | `[from API_SETUP.md]` | From Meta Business Manager |
| `META_AD_ACCOUNT_ID` | `[from API_SETUP.md]` | Your ad account ID (with `act_` prefix) |
| `CACHE_TTL` | `300` | 5-minute cache (in seconds) |
| `ADMIN_KEY` | `[secure key, 32+ chars]` | For admin operations |
| `NODE_ENV` | `production` | Environment flag |
| `LOG_LEVEL` | `info` | Logging level |

### 3. Save Variables

Click **Save** after adding each variable. Railway encrypts them automatically. ✅

## Step 3: Deploy

### Automatic Deployment

1. Push to main branch (if not already done):
   ```bash
   git push origin main
   ```

2. Railway automatically detects changes and redeploys

3. Watch deployment progress:
   - Dashboard → Deployments tab
   - Look for green checkmark when complete

### Manual Redeploy

If you need to force a redeploy:

1. Dashboard → Backend service
2. Click **Redeploy** button
3. Wait for green checkmark

## Step 4: Verify Deployment

### Check Service Health

```bash
curl https://your-railway-url/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### Test API Endpoints

```bash
# Test Google Ads
curl https://your-railway-url/api/google-ads/test

# Test Meta
curl https://your-railway-url/api/meta/test

# Get metrics
curl "https://your-railway-url/api/ads/metrics?days=7"
```

All should return `success: true`.

### Check Logs

1. Dashboard → Backend service
2. Click **Logs** tab
3. Look for:
   - `Server running on port 5000`
   - No authentication errors
   - No missing variable errors

## Step 5: Update Frontend Configuration

### Update metrics.html

If your Railway URL is `https://app-xyz.railway.app`, the API calls already use relative paths `/api/...` which work automatically.

If using a different domain, update fetch calls:

```javascript
// Before
const response = await fetch(`/api/ads/metrics?days=${currentDayRange}`);

// After (if needed)
const API_BASE = 'https://your-railway-url';
const response = await fetch(`${API_BASE}/api/ads/metrics?days=${currentDayRange}`);
```

### Update integrations.html

Same applies — already uses relative paths, should work automatically.

## Step 6: Monitor in Production

### Set Up Alerts

1. Dashboard → Settings → Notifications
2. Enable email alerts for:
   - Deployment failures
   - High CPU/memory usage
   - Service crashes

### Monitor Metrics

Check regularly:
- **Dashboard → Metrics tab:**
  - CPU usage (should be <20%)
  - Memory (should be <100MB)
  - Network (should spike when dashboards refresh)

- **Server logs for errors:**
  - Authentication failures
  - API timeouts
  - Rate limit hits

## Troubleshooting

### Deployment Failed

Check logs for:
```
Error: Cannot find module
```

**Fix:** Missing dependency. Run `npm install` locally, commit, and push again.

```
Error: Missing environment variable
```

**Fix:** Check Variables tab — all 11 variables must be set.

### API Returning Errors

#### "Missing credentials"
- [ ] Check Railway Variables tab — all 5 Google Ads + 2 Meta variables set?
- [ ] Click **Redeploy** to apply changes

#### "Invalid credentials"
- [ ] Test credentials locally first
- [ ] Verify token format (no extra spaces)
- [ ] Check for copy/paste errors

#### "API connection failed"
- [ ] Check Google Ads / Meta API status
- [ ] Verify internet connectivity
- [ ] Check Railway logs for network errors

### Dashboard Not Updating

1. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Check browser console for errors: `F12` → Console tab
3. Check network tab: `F12` → Network tab → click `/api/ads/metrics`
   - Should see 200 response with JSON data

## Rollback

If something breaks:

### 1. Identify Broken Commit

```bash
git log --oneline
# Find the commit before breaking changes
```

### 2. Rollback Locally

```bash
git revert <commit-hash>
git push origin main
```

### 3. Railway Auto-Redeploys

Wait for deployment to complete, then verify.

## Performance Optimization

### Cache Configuration

Current: `CACHE_TTL=300` (5 minutes)

**For high traffic:** Increase to `600` (10 minutes)
```
Dashboard → Variables → CACHE_TTL → 600
```

**For development:** Decrease to `60` (1 minute)
```
Dashboard → Variables → CACHE_TTL → 60
```

### Scaling

If you see high CPU usage:

1. Dashboard → Backend service
2. Click **Settings** → **Resource**
3. Increase RAM from default

## Cost Considerations

### Railway Pricing

- Free tier: 500 hours/month (always-on service = 730 hours)
- Pro plan: $5/month base + usage
- Typical usage: $10-20/month

### API Costs

- **Google Ads API:** Free (but rate limited)
- **Meta API:** Free (but rate limited)
- Our caching prevents rate limits

### Optimization

- Caching is already optimized
- No additional costs expected from API integrations

## Maintenance

### Weekly
- Check logs for errors
- Verify metrics dashboard is updating
- Monitor API response times

### Monthly
- Review credential rotation schedule
- Check cost/usage metrics
- Update dependencies if needed

### Quarterly
- Rotate API credentials (security best practice)
- Review and optimize cache TTL
- Performance audit

## Documentation

All documentation files are in:
```
backend/docs/
├── API_SETUP.md           # How to get credentials
├── CREDENTIALS.md         # Credential management
├── INTEGRATIONS_README.md # Full API reference
```

Keep these up-to-date as you make changes.

## Support

### If Something Goes Wrong

1. Check logs: Dashboard → Logs tab
2. Search error message in documentation
3. Try redeploy: Dashboard → Redeploy button
4. Check Railway status: [status.railway.app](https://status.railway.app)
5. Contact support: engineering@example.com

### Emergency Rollback

If production is broken:

```bash
git revert <latest-commit>
git push origin main
# Railway auto-redeploys within 1-2 minutes
```

---

## Deployment Checklist

- [ ] All code committed and pushed
- [ ] All 11 environment variables set in Railway
- [ ] Deployment shows green checkmark
- [ ] Health check passes: `/health`
- [ ] Google Ads test passes: `/api/google-ads/test`
- [ ] Meta test passes: `/api/meta/test`
- [ ] Metrics endpoint returns data: `/api/ads/metrics`
- [ ] Frontend dashboards loading data
- [ ] Logs show no errors
- [ ] Alerts configured

## Next Steps

1. **Monitor in production** — Check logs daily for first week
2. **Test dashboard** — Verify metrics updating every 5 minutes
3. **Collect feedback** — Share with team, address issues
4. **Plan improvements** — Document learnings, plan optimizations

---

**Deployed:** [Date]
**Deployed by:** [Name]
**Deployment URL:** https://your-railway-url
