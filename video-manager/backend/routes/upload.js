const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');
const Video = require('../models/Video');
const Transcript = require('../models/Transcript');
const { getVideoDuration } = require('../utils/ffmpeg');
const { transcribeAudio } = require('../utils/whisper');
const db = require('../config/database');

const router = express.Router();
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/x-m4v'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024 // 5GB
  }
});

/**
 * POST /api/upload
 * Upload video and trigger async transcription
 */
router.post('/', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, funnel } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get file stats
    const fileStats = fs.statSync(req.file.path);
    const size = fileStats.size;

    // Create video record
    const video = await Video.create({
      title,
      filename: req.file.filename,
      originalName: req.file.originalname,
      funnel,
      size
    });

    logger.info(`Video uploaded: ${video.id}`);

    // Create approval request for video
    try {
      const approvalId = uuidv4();
      await db.query(
        'INSERT INTO approvals (id, content_id, content_type, submitted_by, status) VALUES ($1, $2, $3, $4, $5)',
        [approvalId, video.id, 'video', 'system', 'pending']
      );
      logger.info(`Approval request created for video ${video.id}`);
    } catch (error) {
      logger.error(`Failed to create approval request for ${video.id}:`, error);
    }

    // Get duration asynchronously
    setImmediate(async () => {
      try {
        const duration = await getVideoDuration(req.file.path);
        await Video.updateMetadata(video.id, { duration });
        logger.info(`Duration calculated for ${video.id}: ${duration}s`);
      } catch (error) {
        logger.error(`Failed to get duration for ${video.id}:`, error);
      }
    });

    // Trigger transcription asynchronously
    setImmediate(async () => {
      try {
        await Video.updateStatus(video.id, 'transcribing');
        const transcript = await transcribeAudio(req.file.path);
        
        await Transcript.create({
          videoId: video.id,
          text: transcript,
          language: 'en'
        });

        await Video.updateStatus(video.id, 'ready');
        logger.info(`Transcription complete for ${video.id}`);
      } catch (error) {
        logger.error(`Transcription failed for ${video.id}:`, error);
        await Video.updateStatus(video.id, 'error');
      }
    });

    res.status(201).json({
      id: video.id,
      title: video.title,
      filename: video.filename,
      status: 'uploading',
      uploadedAt: video.uploaded_at,
      message: 'Video uploaded. Transcription in progress...'
    });
  } catch (error) {
    logger.error('Upload error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: error.message || 'Upload failed'
    });
  }
});

module.exports = router;
