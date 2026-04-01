# Quick Start Guide

Get the Video Manager system running in 5 minutes.

## 🚀 Option 1: Docker (Recommended)

```bash
# 1. Clone and enter directory
cd video-manager

# 2. Set up environment
cp .env.example .env

# 3. Start with Docker Compose
docker-compose up --build

# 4. Run migrations (in another terminal)
docker-compose exec app npm run migrate

# 5. Access the application
# Frontend: http://localhost:5000
# API: http://localhost:5000/api
```

## 💻 Option 2: Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- FFmpeg

### Setup

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Set up environment
cp ../.env.example ../.env
# Edit .env with your PostgreSQL credentials

# 3. Run migrations
cd ../backend
npm run migrate

# 4. Start backend (Terminal 1)
npm run dev

# 5. Start frontend (Terminal 2)
cd ../frontend
npm start
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- API: http://localhost:5000/api

## 🧪 Quick Tests

### Health Check
```bash
curl http://localhost:5000/health
```

### Upload Test
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "video=@sample.mp4" \
  -F "title=Test Video" \
  -F "funnel=general"
```

### List Videos
```bash
curl http://localhost:5000/api/videos
```

## 📁 First Steps

1. **Upload a Video**
   - Click "Upload Video" in the dashboard
   - Drag and drop or select a video file
   - Add title and select funnel
   - Wait for transcription to complete

2. **View Transcript**
   - Click on video in dashboard
   - Click "Transcript" tab
   - Edit, copy, or download transcript

3. **Create Clips**
   - From video details, click "Clips"
   - Enter start/end times
   - Add description
   - Download the clip

## 🔧 Environment Variables

Essential variables in `.env`:

```env
NODE_ENV=development
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_NAME=video_manager
```

## 📚 More Documentation

- Full setup: See [README.md](./README.md)
- API docs: See API routes in README.md
- Deployment: See Railway section in README.md
- Troubleshooting: See section in README.md

## ⚡ Common Commands

```bash
# Backend
npm run dev          # Development with hot reload
npm run start        # Production start
npm run migrate      # Run database migrations
npm run seed         # Seed sample data
npm test            # Run tests

# Frontend
npm start           # Start dev server
npm run build       # Build for production
npm test            # Run tests

# Docker
docker-compose up --build
docker-compose down
docker-compose logs -f
```

## 💡 Tips

- Use mock transcription in dev (no Whisper needed)
- Videos stored in `backend/uploads/` (local dev)
- Database data persists in Docker volume
- Check logs: `docker-compose logs -f app`

## ❓ Issues?

1. Database won't connect → Check DB credentials in .env
2. Port already in use → Change PORT in .env
3. FFmpeg errors → Install FFmpeg: `brew install ffmpeg`
4. Transcription errors → Mock transcription used by default

---

**You're all set!** 🎉 Start uploading videos and creating content.
