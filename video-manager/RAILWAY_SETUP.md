# Railway Deployment Setup

## ✅ Step 1: Connect GitHub
1. Go to [Railway.app](https://railway.app)
2. Click "Create New Project"
3. Select "GitHub Repo"
4. Choose `jakehb1/Marketing-Funnel`
5. Railway auto-detects `railway.json` and starts building

## ✅ Step 2: Set Environment Variables

In Railway Dashboard:
1. Go to your project
2. Click on the "video-manager" service
3. Go to **Variables** tab
4. Add these variables:

```
CHARLIE_PIN=12345
DATABASE_URL=<auto-filled by Railway PostgreSQL addon>
NODE_ENV=production
FRONTEND_URL=https://your-railway-domain.app
LOG_LEVEL=info
```

### How to get DATABASE_URL:
1. In Railway, click **"Plugins"**
2. Click **"PostgreSQL"** (add if not present)
3. Copy the `DATABASE_URL` value
4. Paste it as the `DATABASE_URL` variable above

## ✅ Step 3: Auto-Deploy

Once variables are set:
1. Railway automatically deploys the latest code from GitHub
2. Runs database migrations (001_init.sql, 002_approvals.sql)
3. Health check passes ✅
4. App is live in ~2-3 minutes

## ✅ Step 4: Verify Deployment

### Check Health:
```bash
curl https://your-railway-domain.app/api/health
# Should return: {"status":"ok","database":"connected"}
```

### Test Charlie's Dashboard:
```
https://your-railway-domain.app/approval
# Enter PIN: 12345
# Should see approval dashboard
```

### Test Upload:
1. Go to `https://your-railway-domain.app/`
2. Click "Upload Video"
3. Upload a test video
4. System auto-transcribes with Whisper
5. Creates approval request
6. Charlie reviews at `/approval`

## 🔧 Environment Variable Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `CHARLIE_PIN` | Charlie's login PIN | `12345` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host/db` |
| `NODE_ENV` | Environment | `production` |
| `FRONTEND_URL` | App domain | `https://ennie-video.railway.app` |
| `LOG_LEVEL` | Logging verbosity | `info`, `debug`, `error` |
| `PORT` | Server port | `5000` (usually set by Railway) |

## 🚨 Troubleshooting

**Migration failed:**
- Check PostgreSQL addon is attached
- Verify DATABASE_URL is correct
- Check logs in Railway dashboard

**Health check failing:**
- Ensure DATABASE_URL is set
- Wait 30 seconds after deployment
- Check backend logs for errors

**Approval dashboard blank:**
- Clear browser cache
- Verify FRONTEND_URL is correct
- Check browser console for CORS errors

**Upload not working:**
- Verify Whisper is installed (included in Docker)
- Check backend logs for transcription errors
- Ensure file is under 500MB

## 📊 Monitoring

Railway Dashboard shows:
- ✅ **Build Status** — Green = deployed
- ✅ **Health Checks** — Passing
- 📊 **Metrics** — CPU, memory, network
- 📝 **Logs** — Real-time app logs

## 🎯 You're Done!

After deployment:
- ✅ Video upload works
- ✅ Transcription auto-runs
- ✅ Charlie can approve via `/approval` (PIN: 12345)
- ✅ Agents see approval status
- ✅ Everything synced to GitHub

Any issues? Check the logs in Railway dashboard.
