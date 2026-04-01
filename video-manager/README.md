# Video Manager - ENNIE Marketing Platform

A comprehensive video management, transcription, and content approval system for the ENNIE marketing platform.

## Features

### 🎥 Video Management
- Upload and manage marketing videos
- Automatic video metadata extraction (duration, size)
- Organization by marketing funnel (healer, untrained, patient, referral, owned)
- Video status tracking (uploading → transcribing → ready)

### 📝 Transcription
- Automatic speech-to-text transcription using Whisper
- Full-text search in transcripts
- Support for multiple languages
- Timestamp-based transcript editing

### ✂️ Clip Management
- Extract clips from videos by time range
- Purpose-based organization
- Efficient storage and retrieval

### ✅ Content Approval System
- Approval workflow for all content
- Charlie (CEO) dashboard for reviewing pending content
- Approval/rejection with detailed notes
- Integration with agent dashboards showing approval status
- Automatic approval requests on upload

### 📊 Interactive Dashboards
- Agent dashboard showing video status and approval status
- Charlie's approval dashboard with PIN protection
- Real-time status updates
- Filter and search capabilities

## Project Structure

```
video-manager/
├── backend/                      # Express.js API server
│   ├── server.js                # Main application entry
│   ├── package.json             # Dependencies
│   ├── config/
│   │   └── database.js          # PostgreSQL connection
│   ├── routes/
│   │   ├── upload.js            # Video upload endpoint
│   │   ├── videos.js            # Video CRUD operations
│   │   ├── transcripts.js       # Transcript endpoints
│   │   ├── clips.js             # Clip endpoints
│   │   └── approvals.js         # NEW: Approval workflow
│   ├── models/
│   │   ├── Video.js
│   │   ├── Transcript.js
│   │   └── Clip.js
│   ├── utils/
│   │   ├── ffmpeg.js            # Video processing
│   │   └── whisper.js           # Audio transcription
│   ├── migrations/
│   │   └── sql/
│   │       ├── 001_init.sql     # Initial schema
│   │       └── 002_approvals.sql # NEW: Approval tables
│   └── tests/
│       └── approvals.test.js    # NEW: Approval tests
├── frontend/                     # React application
│   ├── src/
│   │   ├── App.js               # Main app component
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── UploadVideo.js
│   │   │   ├── VideoDetails.js
│   │   │   ├── TranscriptViewer.js
│   │   │   ├── ClipManager.js
│   │   │   └── ApprovalDashboard.js # NEW: Charlie's dashboard
│   │   ├── components/
│   │   │   ├── Header.js
│   │   │   ├── VideoCard.js     # Updated: Shows approval status
│   │   │   └── ...
│   │   └── styles/
│   │       ├── ApprovalDashboard.css # NEW: Dashboard styling
│   │       └── ...
│   └── package.json
├── Dockerfile                    # Multi-stage Docker build
├── railway.json                  # Railway deployment config
├── DEPLOYMENT.md                 # Deployment guide
├── APPROVAL_SYSTEM.md            # Approval system documentation
└── README.md                     # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Docker (for containerized deployment)

### Local Development

1. **Clone and install:**
   ```bash
   cd video-manager
   
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Setup environment:**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   
   # Frontend (optional)
   cd ../frontend
   cp .env.example .env
   ```

3. **Initialize database:**
   ```bash
   cd backend
   npm run migrate
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm start
   ```

5. **Access the application:**
   - Agent Dashboard: http://localhost:3000
   - API: http://localhost:5000
   - Approval Dashboard: http://localhost:3000/approval (PIN: 1234 by default)

### Docker Deployment

1. **Build image:**
   ```bash
   docker build -t video-manager:latest .
   ```

2. **Run container:**
   ```bash
   docker run -p 5000:5000 \
     -e DATABASE_URL="postgres://user:pass@db:5432/video_manager" \
     -e CHARLIE_PIN="your-secure-pin" \
     -e FRONTEND_URL="https://your-domain.com" \
     video-manager:latest
   ```

3. **Health check:**
   ```bash
   curl http://localhost:5000/health
   ```

## Railway Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive Railway deployment instructions.

### Quick Deploy
```bash
railway init
railway link  # Link to existing project
git push origin main  # Auto-deploys
```

## API Endpoints

### Videos
- `POST /api/upload` - Upload video
- `GET /api/videos` - List videos
- `GET /api/videos/:id` - Get video details
- `DELETE /api/videos/:id` - Delete video

### Transcripts
- `GET /api/transcripts/:videoId` - Get transcript
- `PUT /api/transcripts/:id` - Update transcript

### Clips
- `POST /api/clips` - Create clip
- `GET /api/clips?videoId=:id` - List clips
- `DELETE /api/clips/:id` - Delete clip

### Approvals ✅ NEW
- `GET /api/approvals` - List approvals (requires PIN)
- `POST /api/approvals` - Create approval request
- `GET /api/approvals/:id` - Get approval details (requires PIN)
- `POST /api/approvals/:id/approve` - Approve content (requires PIN)
- `POST /api/approvals/:id/reject` - Reject content (requires PIN)
- `PUT /api/approvals/:id/notes` - Add notes (requires PIN)
- `GET /api/approvals/status/content/:id` - Check approval status (public)

### Health
- `GET /health` - Server health check

## Approval System

### Overview
Content approval workflow ensuring quality before deployment:

1. **Submit** - Video uploaded → Approval request created automatically
2. **Review** - Charlie reviews in approval dashboard
3. **Approve/Reject** - Charlie approves with notes or rejects with feedback
4. **Deploy** - Approved content shows "✅" badge and can be used in dashboards

### Charlie's Dashboard
- Access at `/approval`
- PIN-protected interface
- View pending/approved/rejected content
- Filter by content type and funnel
- Approve with optional notes
- Reject with required detailed feedback

### Integration
Agent dashboards automatically show approval status:
- 🕐 **Pending Approval** - Can't use in production
- ✅ **Approved** - Ready to deploy
- ❌ **Rejected** - Needs revision

For detailed information, see [APPROVAL_SYSTEM.md](./APPROVAL_SYSTEM.md)

## Database Schema

### Videos
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  filename VARCHAR(255) UNIQUE,
  funnel VARCHAR(100),
  status VARCHAR(50),
  duration INTEGER,
  approval_status VARCHAR(50) DEFAULT 'pending',
  approval_id UUID REFERENCES approvals(id),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ...
);
```

### Approvals ✅ NEW
```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY,
  content_id UUID,
  content_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  submitted_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  review_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ...
);
```

## Testing

### Run Tests
```bash
cd backend
npm test
```

### Test Coverage
- Video upload flow
- Transcription processing
- Clip creation and management
- Approval CRUD operations
- PIN authentication
- Approval status checking
- Content status endpoints

## Environment Variables

### Backend
- `NODE_ENV` - development/production
- `PORT` - Server port (default: 5000)
- `DATABASE_URL` - PostgreSQL connection (Railway)
- `FRONTEND_URL` - Frontend URL for CORS
- `CHARLIE_PIN` - PIN for approval dashboard access
- `USE_WHISPER_CLI` - Use local Whisper CLI

### Frontend
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_ENABLE_APPROVAL_DASHBOARD` - Enable approval feature

## Security

### Authentication
- Approval actions require `CHARLIE_PIN` header
- PIN validation on every request
- Session-based PIN storage (not localStorage)

### Data
- All database connections use SSL
- Sensitive data encrypted at rest
- Rate limiting on API endpoints
- CORS configured for frontend only

## Performance

### Database Indexes
- `approvals.status` - Fast filtering
- `approvals.content_id` - Content lookup
- `approvals.content_type` - Type filtering
- `approvals.created_at` - Chronological sorting
- `videos.approval_status` - Status filtering

### Caching
- Frontend polls for updates every 30 seconds
- Health check caching on server

### Optimization
- Multi-stage Docker build (smaller images)
- Pagination on approval listings
- Lazy-loading of comments

## Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL format
postgres://user:password@host:port/database

# Verify migrations ran
SELECT * FROM videos;
```

### Upload Failures
- Check `uploads/` directory permissions
- Verify disk space available
- Review server logs

### Approval Dashboard Not Loading
- Confirm CHARLIE_PIN is set
- Check PIN header is sent correctly
- Review browser console for errors

### Transcription Errors
- Verify Whisper is installed
- Check audio file quality
- Review backend logs

## Deployment Checklist

- [ ] Set strong `CHARLIE_PIN`
- [ ] Configure `DATABASE_URL` for production
- [ ] Enable SSL/HTTPS
- [ ] Set `NODE_ENV=production`
- [ ] Test all approval flows
- [ ] Configure database backups
- [ ] Set up monitoring
- [ ] Document PIN with Charlie
- [ ] Test health endpoints
- [ ] Verify migrations completed

## Support & Contact

- **Jake** (Head of Product) - Product decisions, roadmap
- **Jess** (Head of Marketing) - Campaign strategy
- **Charlie** (CEO) - Approval authority, voice/brand

## Technical Stack

### Backend
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Auth**: PIN-based (simple)
- **Transcription**: Whisper CLI
- **Video Processing**: FFmpeg
- **Logging**: Pino

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: CSS + Apple Design Language
- **State**: Local state + API polling
- **UI**: Toast notifications

### DevOps
- **Container**: Docker (multi-stage)
- **Platform**: Railway
- **CI/CD**: GitHub (auto-deploy on push)

## License

© 2025 ENNIE Marketing. All rights reserved.

---

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: April 1, 2025
