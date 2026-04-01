# Quick Start Guide - Video Manager with Approval System

**For Jake**: Get Video Manager deployed to Railway in 5 minutes  
**For Charlie**: Access your approval dashboard  
**For Agents**: See approval status on videos

---

## 🚀 DEPLOYMENT (Jake)

### 1. Set Environment Variables in Railway
```
DATABASE_URL=postgres://...  (from PostgreSQL addon)
CHARLIE_PIN=<secure-pin>     (e.g., 7829)
FRONTEND_URL=https://your-domain.railway.app
NODE_ENV=production
```

### 2. Push to GitHub
```bash
cd /Users/robotclaw/.openclaw/workspace-ennie-marketing
git add video-manager/
git commit -m "Add content approval system"
git push origin main
```

### 3. Railway Auto-Deploys
- Detects push automatically
- Builds Docker image
- Runs migrations (002_approvals.sql)
- Deploys new version

### 4. Verify
```bash
curl https://your-domain.railway.app/health
# Should return: {"status":"ok","database":"connected"}
```

---

## 🔐 CHARLIE'S DASHBOARD

### Login
```
Navigate to: https://your-domain.railway.app/approval
Enter PIN: (the one set in CHARLIE_PIN)
```

### Dashboard Features
- **Pending Tab** - Videos waiting for approval
- **Approved Tab** - Videos you've approved
- **Rejected Tab** - Videos you sent back
- **Filters** - By funnel (healer, patient, etc.) or content type

### Quick Actions
- **Click any video** → See details
- **✅ Approve** → Confirm (optional notes)
- **❌ Reject** → Requires detailed feedback (why it needs revision)

---

## 📊 AGENT VIEW

### What Changed
Videos now show **TWO** badges:
1. **Status**: uploading / transcribing / ready / error
2. **Approval**: ⏳ Pending / ✅ Approved / ❌ Rejected

### Using Approved Content
- Only use videos with ✅ **Approved** badge
- Pending videos (⏳) will be ready soon
- Rejected videos (❌) need to be re-recorded

---

## 📝 UPLOAD WORKFLOW

### Step 1: Upload Video
```
Agent clicks "Upload" → Selects video → Enters title → Submits
```

### Step 2: Auto-Approval Created
```
System automatically creates approval request
Status: ⏳ Pending
```

### Step 3: Charlie Reviews
```
Charlie sees in dashboard → Watches video → Approves or Rejects
```

### Step 4: Agent Can Use
```
Status changes to ✅ Approved
Agent sees new badge
Can now use in funnels
```

---

## 🔌 API ENDPOINTS

### For Agents (No Auth Required)
```bash
# Check if a video is approved
curl https://your-domain.railway.app/api/approvals/status/content/{video_id}
```

### For Charlie (Requires PIN)
```bash
# List pending approvals
curl https://your-domain.railway.app/api/approvals?status=pending \
  -H "X-Charlie-PIN: your-pin"

# Approve video
curl -X POST https://your-domain.railway.app/api/approvals/{id}/approve \
  -H "X-Charlie-PIN: your-pin" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Great quality!"}'

# Reject video (notes required)
curl -X POST https://your-domain.railway.app/api/approvals/{id}/reject \
  -H "X-Charlie-PIN: your-pin" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Audio too quiet, please re-record"}'
```

---

## 🗄️ DATABASE

### What Changed
```sql
-- New tables
CREATE TABLE approvals (...)
CREATE TABLE approval_comments (...)

-- Modified table
ALTER TABLE videos ADD approval_status VARCHAR(50)
ALTER TABLE videos ADD approval_id UUID
```

### Migrations
- Automatically run on startup
- Migration file: `migrations/sql/002_approvals.sql`
- Manual run: `npm run migrate`

---

## 🧪 TESTING

### Test the Flow
1. **Upload a test video**
   - Use dashboard or API `/api/upload`
   
2. **See approval request created**
   - Check database: `SELECT * FROM approvals WHERE status='pending'`
   
3. **Approve in dashboard**
   - Navigate to `/approval`
   - Login with PIN
   - Click "✅ Approve"
   
4. **Verify badge updates**
   - Back in agent dashboard
   - Video shows "✅ Approved" badge

### Run Test Suite
```bash
cd backend
npm test
```

---

## 🔐 SECURITY

### PIN Protection
- Only Charlie needs PIN
- PIN stored in environment (Railway)
- Never commit PIN to GitHub
- Change default before production

### What Requires PIN
- List approvals
- View approval details
- Approve content
- Reject content
- Add notes

### What's Public
- Upload video (creates approval auto-magically)
- Check if video is approved (for agents)

---

## ⚡ TROUBLESHOOTING

### Dashboard Won't Load
```
✓ Verify PIN is correct
✓ Check browser console (F12)
✓ Verify FRONTEND_URL is set
✓ Test API: curl /api/approvals -H "X-Charlie-PIN: ..."
```

### Video Not Showing Approval Status
```
✓ Check migrations ran: SELECT * FROM approvals;
✓ Verify video has approval_id
✓ Check if approval_status is set
```

### Can't Upload Videos
```
✓ Check /api/health is passing
✓ Verify database connected
✓ Check uploads/ directory permissions
✓ Review server logs: railway logs
```

### PIN Doesn't Work
```
✓ Verify CHARLIE_PIN is set in Railway
✓ Confirm PIN in header: -H "X-Charlie-PIN: your-pin"
✓ Check for typos/spaces
```

---

## 📚 FULL DOCUMENTATION

See detailed docs in the repo:
- `README.md` - Full project overview
- `DEPLOYMENT.md` - Detailed Railway setup
- `APPROVAL_SYSTEM.md` - Complete feature docs
- `IMPLEMENTATION_CHECKLIST.md` - What was built
- `BUILD_SUMMARY.md` - Technical summary

---

## 📞 QUICK CONTACTS

Need help?
- **Jake B** (Product) - Features, architecture
- **Jess** (Marketing) - Campaign strategy
- **Charlie** (CEO) - Approval decisions

---

## ✅ CHECKLIST FOR LAUNCH

- [ ] Set `CHARLIE_PIN` in Railway (secure, not default)
- [ ] Set `DATABASE_URL` from PostgreSQL addon
- [ ] Set `FRONTEND_URL` to your domain
- [ ] Push to GitHub (`git push origin main`)
- [ ] Wait for Railway to auto-deploy
- [ ] Test health endpoint (`/health`)
- [ ] Login to dashboard (`/approval`)
- [ ] Upload a test video
- [ ] Approve it in dashboard
- [ ] Verify badge updates
- [ ] Communicate to team

---

## 🎯 YOU'RE ALL SET!

**Video Manager is ready to deploy.** 

All code is written, tested, and documented. Just push to GitHub and Railway will handle the rest!

Questions? See the full docs in README.md and APPROVAL_SYSTEM.md.

---

**Last Updated**: April 1, 2025  
**Status**: Production Ready  
**Ready to Deploy**: YES ✅
