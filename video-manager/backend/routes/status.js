const express = require('express');
const pino = require('pino');
const Video = require('../models/Video');

const router = express.Router();
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

/**
 * GET /api/status/:videoId
 * Get upload and transcription status for a video
 */
router.get('/:videoId', async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const statusMap = {
      uploading: {
        code: 'UPLOADING',
        message: 'Video is being uploaded',
        progress: 0
      },
      transcribing: {
        code: 'TRANSCRIBING',
        message: 'Video is being transcribed',
        progress: 50
      },
      ready: {
        code: 'READY',
        message: 'Video and transcript are ready',
        progress: 100
      },
      error: {
        code: 'ERROR',
        message: 'An error occurred during processing',
        progress: 0
      }
    };

    const status = statusMap[video.status] || statusMap.uploading;

    res.json({
      videoId: req.params.videoId,
      status: video.status,
      ...status,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        size: video.size,
        uploadedAt: video.uploaded_at,
        updatedAt: video.updated_at
      },
      transcript: {
        available: !!video.transcript_text,
        language: video.transcript_language || 'en',
        length: video.transcript_text ? video.transcript_text.length : 0
      }
    });
  } catch (error) {
    logger.error('Error checking status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
