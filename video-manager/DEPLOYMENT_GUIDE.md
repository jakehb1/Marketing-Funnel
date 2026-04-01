# Railway Deployment Guide

## Pre-Deployment Checklist

- [ ] All code committed to GitHub
- [ ] Environment variables configured
- [ ] PostgreSQL ready
- [ ] FFmpeg available
- [ ] Tests passing (optional but recommended)

## Step 1: Prepare GitHub Repository

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit: Video Manager System"

# Add remote (replace with your repo)
git remote add origin https://github.com/yourusername/video-manager.git
git push -u origin main
```

## Step 2: Set Up Railway Project

### Option A: Via Railway Dashboard

1. **Visit** https://railway.app/login
2. **Create New Project** → Select "Deploy from GitHub"
3. **Authorize** GitHub and select your repository
4. **Choose** the `video-manager` directory
5. **Next** → Select PostgreSQL plugin

### Option B: Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add postgresql

# Deploy
railway up
```

## Step 3: Configure Environment Variables

In Railway Dashboard:
1. Go to your project
2. Click "Variables" tab
3. Add the following:

```
NODE_ENV=production
PORT=5000
DB_USER=postgres
DB_PASSWORD=[Auto-filled by PostgreSQL plugin]
DB_HOST=[Auto-filled by PostgreSQL plugin]
DB_PORT=5432
DB_NAME=video_manager
FRONTEND_URL=https://your-domain.railway.app
USE_WHISPER_CLI=false
```

### Important Notes
- **DB_PASSWORD**, **DB_HOST**, **DB_USER** are automatically set by the PostgreSQL plugin
- Leave **USE_WHISPER_CLI=false** unless you have Whisper installed in the Docker image
- Update **FRONTEND_URL** with your actual Railway domain

## Step 4: PostgreSQL Plugin Setup

1. In Railway Dashboard, click "Create" → "Add"
2. Select "PostgreSQL"
3. The database connection variables are automatically added
4. No additional configuration needed

## Step 5: Build Configuration

Railway automatically detects Node.js projects. However, ensure:

1. **Dockerfile** is present (✓ Already included)
2. **Port** is correctly set (✓ Default 5000)
3. **Health check** endpoint exists (✓ GET /health)

## Step 6: First Deployment

### Automatic Deployment
Once you push to GitHub, Railway auto-deploys:
```bash
git push origin main
```

### Manual Deployment
```bash
railway up
```

### Monitor Deployment
```bash
railway logs
```

Look for:
```
✓ Server running on port 5000
✓ Database connected
✓ Migrations executed
```

## Step 7: Run Migrations

After first deployment, run migrations:

```bash
# Via Railway CLI
railway run npm run migrate

# Via Dashboard
# Settings → Shell → Run command
# Command: npm run migrate
```

Expected output:
```
✓ Executed migration: 001_init.sql
✓ All migrations completed!
```

## Step 8: Seed Sample Data (Optional)

```bash
# Via Railway CLI
railway run npm run seed

# Via Dashboard Shell
# Command: npm run seed
```

## Step 9: Configure Custom Domain

1. **Go to** Railway Dashboard → Your Project → Settings
2. **Networking** → Add Custom Domain
3. **Enter** your domain (e.g., video.yourdomain.com)
4. **Add** DNS records as instructed

DNS Example:
```
Type: CNAME
Name: video
Value: [Railway-provided-domain]
```

## Step 10: Verify Deployment

Test your deployment:

```bash
# Health check
curl https://your-domain.railway.app/health

# Response should be:
{
  "status": "ok",
  "timestamp": "2026-04-01T...",
  "database": "connected"
}

# List videos
curl https://your-domain.railway.app/api/videos

# Upload test (replace with actual video)
curl -X POST https://your-domain.railway.app/api/upload \
  -F "video=@test.mp4" \
  -F "title=Test Video" \
  -F "funnel=general"
```

## Production Environment Variables

Update for production:

```env
# Security
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Database (auto-filled by plugin)
DB_USER=postgres
DB_PASSWORD=[secure-password]
DB_HOST=[railway-host]
DB_NAME=video_manager

# Features
USE_WHISPER_CLI=false  # Use mock transcription
LOG_LEVEL=info
```

## SSL/HTTPS

✅ Automatically handled by Railway
- All traffic is HTTPS
- No additional configuration needed
- Certificates auto-renewed

## File Storage

In production, uploads are stored in:
- Docker volume: `/app/uploads/`
- Persists across deployments
- View with: `railway run ls -la /app/uploads/`

### For Production Scale-Up

For larger deployments, consider:
1. **S3 Storage** - Move uploads to AWS S3
2. **CDN** - CloudFront for video delivery
3. **Object Storage** - Railway's available options

## Monitoring & Logs

### View Logs
```bash
# Real-time logs
railway logs -f

# Last 100 lines
railway logs

# Filter by service
railway logs -s app
railway logs -s postgresql
```

### Health Metrics
Railway Dashboard shows:
- CPU usage
- Memory usage
- Disk usage
- Request rate

### Error Tracking
Check logs for:
- Database connection errors
- FFmpeg errors
- Transcription failures
- File upload issues

## Backup Strategy

### Database Backups
Railway PostgreSQL provides:
- Automatic daily backups
- 7-day retention
- Manual backup option

To backup:
```bash
pg_dump postgresql://user:pass@host/db > backup.sql
```

### Upload Backups
Videos stored in persistent volume:
- Backed up with Railway snapshots
- Enable volume backups in settings

## Performance Optimization

### For Better Performance:

1. **Enable Caching** - Railway handles this
2. **Optimize Images** - Use efficient video formats
3. **Database Indexing** - Already configured
4. **CDN** - Optional CloudFront integration

### Monitoring Performance:

```bash
# Check response times
curl -w "@curl-format.txt" https://yourdomain.com/health

# Load testing (caution!)
ab -n 100 -c 10 https://yourdomain.com/health
```

## Troubleshooting

### Deployment Failed
```bash
# Check logs
railway logs

# Common issues:
# 1. Missing environment variables
# 2. Database not initialized
# 3. Port already in use
# 4. Missing PostgreSQL plugin
```

### Connection Errors
```bash
# Test database
railway run psql -U postgres -h $DB_HOST

# Test health
curl https://yourdomain.railway.app/health
```

### Uploads Not Working
```bash
# Check permissions
railway run ls -la /app/uploads/

# Check disk space
railway run df -h
```

### Transcription Issues
```bash
# Check logs for transcription errors
railway logs | grep -i transcribe

# Enable debug logging
railway env set LOG_LEVEL=debug
railway redeploy
```

## Scale & Security

### Auto-scaling
Railway handles auto-scaling:
- Enable in Railway Dashboard
- Set CPU/memory thresholds
- Automatic replica management

### Security Best Practices

1. **Environment Variables**
   - Never commit .env file
   - Use Railway Variables tab
   - Rotate secrets regularly

2. **Database**
   - Strong password (Railway provides)
   - Limited access from app only
   - No public exposure

3. **API Security**
   - CORS configured
   - Rate limiting enabled
   - Input validation on all endpoints

4. **Monitoring**
   - Monitor logs regularly
   - Set up alerts
   - Review metrics

## Cost Optimization

### Reduce Costs:
- Use smaller Docker image (multi-stage build included)
- Enable railway bandwidth optimizations
- Monitor resource usage
- Cleanup old videos periodically

### Resource Limits:
```bash
# Check current usage
railway env list

# Optimize in Dockerfile if needed
# Current: Uses Alpine (lightweight)
```

## Updating & Maintenance

### Deploy Updates
```bash
# Make changes locally
git add .
git commit -m "Update: description"
git push origin main

# Railway auto-deploys
# Monitor with: railway logs
```

### Database Migrations
If you add new tables:
```bash
# Create migration file in migrations/sql/
# Name: 002_your_changes.sql
# Push changes
# Run: railway run npm run migrate
```

### Dependency Updates
```bash
# Update packages
npm update

# Commit and push
git add package*.json
git commit -m "Update dependencies"
git push origin main
```

## Support & Resources

### Railway Docs
- https://docs.railway.app
- https://railway.app/support

### Project Resources
- README.md - Full documentation
- API endpoints - See README.md
- Environment setup - See .env.example

### Getting Help
1. Check Railway status page
2. Review application logs
3. Check troubleshooting section above
4. Railway support: support@railway.app

## Post-Launch Checklist

After successful deployment:

- [ ] Domain configured and working
- [ ] Health check endpoint responding
- [ ] Video upload functionality tested
- [ ] Transcription working
- [ ] Clips creation tested
- [ ] Database persists data
- [ ] Logs accessible and clean
- [ ] Auto-backups enabled
- [ ] Team has access
- [ ] Documentation updated

## Quick Commands Reference

```bash
# Initialize Railway
railway init

# Add PostgreSQL
railway add postgresql

# Deploy
railway up

# View logs
railway logs -f

# Run migrations
railway run npm run migrate

# SSH into container
railway shell

# Set environment variable
railway env set KEY=value

# View all variables
railway env list

# Redeploy
railway redeploy

# View project info
railway status
```

---

## 🎉 You're Live!

Your Video Manager system is now running on Railway!

**Next Steps:**
1. ✅ Visit your domain
2. ✅ Upload a test video
3. ✅ Verify transcription
4. ✅ Create a clip
5. ✅ Share with team!

For issues, check logs: `railway logs`

---

**Deployment Status**: Ready for Production
**Last Updated**: 2026-04-01
**Version**: 1.0.0
