const express = require('express');
const pino = require('pino');
const Clip = require('../models/Clip');
const Video = require('../models/Video');
const { spliceVideo } = require('../utils/ffmpeg');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

/**
 * POST /api/clips
 * Create a video clip (splice/extract segment)
 */
router.post('/', async (req, res) => {
  try {
    const {
      videoId,
      startTime,
      endTime,
      purpose
    } = req.body;

    if (!videoId || startTime === undefined || endTime === undefined) {
      return res.status(400).json({
        error: 'videoId, startTime, and endTime are required'
      });
    }

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Calculate duration
    const duration = endTime - startTime;

    // Generate output filename
    const outputFilename = `clip_${videoId}_${Date.now()}.mp4`;
    const videoPath = path.join(__dirname, '../uploads', video.filename);
    const outputPath = path.join(__dirname, '../uploads', outputFilename);

    logger.info(`Creating clip: ${startTime}s - ${endTime}s from ${videoId}`);

    // Splice video
    await spliceVideo(videoPath, outputPath, startTime, endTime);

    // Create clip record
    const clip = await Clip.create({
      videoId,
      startTime,
      endTime,
      purpose,
      filename: outputFilename,
      duration
    });

    logger.info(`Clip created: ${clip.id}`);

    res.status(201).json({
      ...clip,
      downloadUrl: `/uploads/${outputFilename}`
    });
  } catch (error) {
    logger.error('Error creating clip:', error);
    res.status(500).json({ error: error.message || 'Failed to create clip' });
  }
});

/**
 * GET /api/clips/:videoId
 * Get all clips for a video
 */
router.get('/:videoId', async (req, res) => {
  try {
    const clips = await Clip.findByVideoId(req.params.videoId);

    res.json({
      videoId: req.params.videoId,
      count: clips.length,
      clips: clips.map(clip => ({
        ...clip,
        downloadUrl: `/uploads/${clip.filename}`
      }))
    });
  } catch (error) {
    logger.error('Error fetching clips:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

/**
 * PUT /api/clips/:clipId
 * Update clip metadata
 */
router.put('/:clipId', async (req, res) => {
  try {
    const { purpose } = req.body;

    const clip = await Clip.update(req.params.clipId, {
      purpose
    });

    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    logger.info(`Clip updated: ${req.params.clipId}`);
    res.json({
      ...clip,
      downloadUrl: `/uploads/${clip.filename}`
    });
  } catch (error) {
    logger.error('Error updating clip:', error);
    res.status(500).json({ error: 'Failed to update clip' });
  }
});

/**
 * DELETE /api/clips/:clipId
 * Delete a clip
 */
router.delete('/:clipId', async (req, res) => {
  try {
    const clip = await Clip.findById(req.params.clipId);

    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Delete file
    const clipPath = path.join(__dirname, '../uploads', clip.filename);
    if (fs.existsSync(clipPath)) {
      fs.unlinkSync(clipPath);
    }

    await Clip.delete(req.params.clipId);
    logger.info(`Clip deleted: ${req.params.clipId}`);

    res.json({ message: 'Clip deleted successfully' });
  } catch (error) {
    logger.error('Error deleting clip:', error);
    res.status(500).json({ error: 'Failed to delete clip' });
  }
});

/**
 * GET /api/clips
 * Get all clips with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const clips = await Clip.findAll(parseInt(limit));

    res.json({
      count: clips.length,
      clips: clips.map(clip => ({
        ...clip,
        downloadUrl: `/uploads/${clip.filename}`
      }))
    });
  } catch (error) {
    logger.error('Error fetching clips:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

module.exports = router;
