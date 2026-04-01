const express = require('express');
const pino = require('pino');
const Video = require('../models/Video');
const Clip = require('../models/Clip');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

/**
 * GET /api/videos
 * List all videos with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { funnel, status, search } = req.query;

    const videos = await Video.findAll({
      funnel,
      status,
      search
    });

    res.json({
      count: videos.length,
      videos
    });
  } catch (error) {
    logger.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

/**
 * GET /api/videos/:id
 * Get single video details
 */
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Get associated clips
    const clips = await Clip.findByVideoId(req.params.id);

    res.json({
      ...video,
      clips
    });
  } catch (error) {
    logger.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

/**
 * PUT /api/videos/:id
 * Update video metadata
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, funnel } = req.body;

    const video = await Video.updateMetadata(req.params.id, {
      title,
      funnel
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    logger.info(`Video updated: ${req.params.id}`);
    res.json(video);
  } catch (error) {
    logger.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

/**
 * DELETE /api/videos/:id
 * Delete video and associated clips
 */
router.delete('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete video file
    const videoPath = path.join(__dirname, '../uploads', video.filename);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Delete associated clips
    const clips = await Clip.findByVideoId(req.params.id);
    for (const clip of clips) {
      const clipPath = path.join(__dirname, '../uploads', clip.filename);
      if (fs.existsSync(clipPath)) {
        fs.unlinkSync(clipPath);
      }
      await Clip.delete(clip.id);
    }

    // Delete video record
    await Video.delete(req.params.id);

    logger.info(`Video deleted: ${req.params.id}`);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    logger.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

/**
 * GET /api/videos/stats
 * Get video statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await Video.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
