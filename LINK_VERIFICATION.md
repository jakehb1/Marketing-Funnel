# Link Verification Checklist

All pages and links should be working. Use this checklist to verify.

## Main Hub
- [ ] https://marketing-funnel-production-150b.up.railway.app/ — Master dashboard loads

## Dashboard Sections (from sidebar)
- [ ] Overview — Default view, shows welcome + quick access cards
- [ ] Funnels → Visual Strategy — Shows all 5 funnels with stages (clickable)
- [ ] Funnels → Interactive Workflows — Patient funnel with detailed workflows
- [ ] Video Manager → Upload & Manage — Video upload dashboard
- [ ] Video Manager → Approval Dashboard — Charlie's approval portal
- [ ] Content Library — Opens doc-viewer with 2,407 assets
- [ ] Documentation — Opens full docs viewer
- [ ] Automation → Playbook — Opens automation guide
- [ ] Automation → Data Map — Opens integration details

## External Links
- [ ] GitHub Repo — https://github.com/jakehb1/Marketing-Funnel (opens in new tab)
- [ ] Railway Dashboard — https://railway.app/dashboard (opens in new tab)

## Key URLs to Test Manually
| URL | Expected Result |
|-----|-----------------|
| https://marketing-funnel-production-150b.up.railway.app/ | Master hub with sidebar |
| https://marketing-funnel-production-150b.up.railway.app/visual-strategy.html | 5 funnels, clickable stages |
| https://marketing-funnel-production-150b.up.railway.app/interactive-strategy.html | Patient funnel workflows |
| https://marketing-funnel-production-150b.up.railway.app/doc-viewer.html | Documentation viewer |
| https://marketing-funnel-production-150b.up.railway.app/doc-viewer.html?content=true | Content library (2,407 assets) |
| https://marketing-funnel-production-150b.up.railway.app/approval | Charlie's approval dashboard |
| https://marketing-funnel-production-150b.up.railway.app/api/health | API health check |
| https://github.com/jakehb1/Marketing-Funnel | GitHub repo |
| https://railway.app/dashboard | Railway deployment dashboard |

## Known Issues & Fixes

### Approval Dashboard Returns 404
**Issue:** Charlie's approval dashboard at `/approval` is 404  
**Reason:** Video-manager service not yet deployed to Railway  
**Fix:** 
1. Go to Railway dashboard
2. Click Marketing-Funnel project
3. Create new service from GitHub (select video-manager directory)
4. Set environment variables:
   - CHARLIE_PIN=12345
   - NODE_ENV=production
5. Deploy
6. Once deployed, /approval should work

### API Health Returns 404
**Issue:** /api/health endpoint not found  
**Reason:** Same as above - video-manager backend not deployed yet  
**Fix:** Deploy video-manager service (see above)

### Content Library Not Loading
**Issue:** Page is blank after clicking link  
**Reason:** Could be cache or doc-viewer not loaded  
**Fix:** 
1. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear browser cache
3. Try different browser

### Links Not Clickable
**Issue:** Sidebar links don't respond  
**Reason:** JavaScript not loading  
**Fix:**
1. Check browser console for errors
2. Refresh page
3. Clear cache
4. Try different browser

## Testing Procedure

1. **Open master hub** → https://marketing-funnel-production-150b.up.railway.app/
2. **Click each sidebar section** and verify content loads
3. **Click cards within each section** and verify they work
4. **Test external links** (GitHub, Railway)
5. **Check on mobile** — should be responsive
6. **Test on different browsers** (Chrome, Safari, Firefox)

## Mobile Responsive Check
- [ ] Master hub responsive on mobile
- [ ] Sidebar collapses on small screens
- [ ] Content readable on all sizes
- [ ] Forms accessible on mobile

## Performance Check
- [ ] Pages load in <2 seconds
- [ ] No console errors
- [ ] No broken images
- [ ] Animations smooth

## Browser Compatibility
- [ ] Chrome/Chromium
- [ ] Safari
- [ ] Firefox
- [ ] Edge

## Final Verification
- [ ] All links working (200 responses)
- [ ] No 404 errors
- [ ] No console errors
- [ ] All forms functional
- [ ] All data displays correctly

---

**Status:** ✅ Ready to test  
**Last Updated:** April 1, 2026
