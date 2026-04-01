# Video Manager Deployment Guide

## Overview
This guide covers deploying Video Manager with the new Content Approval System to Railway.

## Prerequisites
- Railway account (railway.app)
- GitHub repository: `jakehb1/Marketing-Funnel`
- Docker installed (for local testing)
- PostgreSQL database (Railway PostgreSQL addon)

## Part 1: Railway Setup

### 1. Create Railway Project
```bash
railway init
```

### 2. Add PostgreSQL Database
In Railway dashboard:
1. Click "New"
2. Select "PostgreSQL"
3. Copy the `DATABASE_URL` from the plugin details

### 3. Configure Environment Variables
In Railway dashboard, set these variables:
```
DATABASE_URL=postgres://[user]:[password]@[host]:[port]/[database]
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-deployed-domain.railway.app
CHARLIE_PIN=<secure-pin-for-charlie>
USE_WHISPER_CLI=true
```

### 4. Deploy from GitHub
1. Connect your GitHub repository
2. Set the root directory to `video-manager/`
3. Railway will auto-deploy on push

## Part 2: Database Migrations

### Initial Setup
Migrations run automatically on startup. The `002_approvals.sql` migration:
- Creates `approvals` table
- Creates `approval_comments` table
- Adds `approval_status` to `videos` table
- Adds indexes for performance

### Manual Migration (if needed)
```bash
npm run migrate
```

## Part 3: Testing the Approval System

### Test Approval Endpoints
```bash
# Create approval request
curl -X POST http://localhost:5000/api/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": "video-uuid",
    "content_type": "video",
    "submitted_by": "test-agent"
  }'

# List pending approvals
curl http://localhost:5000/api/approvals?status=pending \
  -H "X-Charlie-PIN: 1234"

# Approve content
curl -X POST http://localhost:5000/api/approvals/{approval_id}/approve \
  -H "Content-Type: application/json" \
  -H "X-Charlie-PIN: 1234" \
  -d '{"notes": "Looks good"}'

# Reject content
curl -X POST http://localhost:5000/api/approvals/{approval_id}/reject \
  -H "Content-Type: application/json" \
  -H "X-Charlie-PIN: 1234" \
  -d '{"notes": "Needs revision"}'

# Check content approval status
curl http://localhost:5000/api/approvals/status/content/{video_id}
```

### Test Approval Dashboard
Navigate to: `http://localhost:3000/approval`
- Enter Charlie's PIN
- Browse pending/approved/rejected content
- Test approve/reject flows

## Part 4: Local Development

### Setup
```bash
cd video-manager

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Copy .env template
cp .env.example .env
```

### Environment Variables (Local)
Create `backend/.env`:
```
NODE_ENV=development
PORT=5000
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=video_manager
FRONTEND_URL=http://localhost:3000
CHARLIE_PIN=1234
USE_WHISPER_CLI=false
```

### Run Development Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

### Run Tests
```bash
cd backend
npm test
```

## Part 5: Docker Testing (Before Deployment)

### Build Image
```bash
docker build -t video-manager:latest .
```

### Run Container
```bash
docker run -p 5000:5000 \
  -e DATABASE_URL="postgres://user:pass@db:5432/video_manager" \
  -e CHARLIE_PIN="1234" \
  -e FRONTEND_URL="http://localhost:5000" \
  video-manager:latest
```

### Health Check
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok","database":"connected"}
```

## Part 6: Production Deployment Checklist

### Before Going Live
- [ ] Set strong `CHARLIE_PIN` (not default '1234')
- [ ] Configure `FRONTEND_URL` for deployed domain
- [ ] Enable HTTPS only
- [ ] Set `NODE_ENV=production`
- [ ] Configure PostgreSQL backups
- [ ] Set up monitoring/alerts
- [ ] Test all approval flows in staging
- [ ] Review security settings

### Post-Deployment
- [ ] Run health check: `curl https://your-domain.railway.app/health`
- [ ] Test approval dashboard login
- [ ] Verify database migrations completed
- [ ] Check logs for errors

## Part 7: Approval System Architecture

### Database Schema
```
videos
├── id (UUID)
├── title
├── funnel
├── approval_status (pending/approved/rejected)
├── approval_id (FK → approvals)
└── ...

approvals
├── id (UUID)
├── content_id (UUID)
├── content_type (video/transcript/asset/clip)
├── status (pending/approved/rejected)
├── submitted_by
├── reviewed_by
├── review_date
├── notes
└── ...

approval_comments
├── id (UUID)
├── approval_id (FK → approvals)
├── comment_text
├── created_by
└── created_at
```

### API Endpoints
- `GET /api/approvals` - List approvals (requires PIN)
- `POST /api/approvals` - Create approval request
- `GET /api/approvals/:id` - Get approval details (requires PIN)
- `POST /api/approvals/:id/approve` - Approve (requires PIN)
- `POST /api/approvals/:id/reject` - Reject (requires PIN)
- `PUT /api/approvals/:id/notes` - Add comment (requires PIN)
- `GET /api/approvals/status/content/:id` - Check approval status (public)

### Frontend Routes
- `/approval` - Charlie's approval dashboard (PIN protected)

### Security
- All approval actions require `CHARLIE_PIN` header
- PIN validated on every request
- Session storage for PIN (not localStorage)
- No PIN logging

## Part 8: Troubleshooting

### Database Connection Error
```
Solution: Verify DATABASE_URL format
postgres://user:password@host:port/dbname
```

### Migrations Not Running
```
Check logs: railway logs
Manually run: npm run migrate
```

### Health Check Failing
```
Check database connection
Verify DATABASE_URL is set
Check if tables exist: SELECT * FROM videos;
```

### Approval Dashboard Not Loading
```
Verify CHARLIE_PIN is set
Check browser console for errors
Test API directly: curl /api/approvals -H "X-Charlie-PIN: YOUR_PIN"
```

## Part 9: Git Deployment Flow

### Deploy Changes
```bash
# Make changes
git add .
git commit -m "Add approval system features"
git push origin main
```

Railway will automatically:
1. Detect new push
2. Build Docker image
3. Run migrations
4. Deploy new version
5. Run health checks

### Rollback
In Railway dashboard, select previous deployment and click "Redeploy"

## Support

For issues or questions:
- Check Railway logs: `railway logs`
- Review test suite: `npm test`
- Contact Jake (Head of Product): @Jakehb_b on Telegram
- Contact Charlie (CEO) for PIN/credential issues

---

**Last Updated:** April 1, 2025
**Status:** Production Ready
