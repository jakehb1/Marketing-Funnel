const express = require('express');
const pino = require('pino');
const Transcript = require('../models/Transcript');
const Video = require('../models/Video');

const router = express.Router();
const logger = pino(
  process.env.NODE_ENV === 'production'
    ? {}
    : { transport: { target: 'pino-pretty' } }
);

/**
 * GET /api/transcripts?funnel=patient
 * Get transcripts filtered by funnel
 */
router.get('/', async (req, res) => {
  try {
    const { funnel, videoId } = req.query;

    if (videoId) {
      const transcript = await Transcript.findByVideoId(videoId);
      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }
      return res.json(transcript);
    }

    if (funnel) {
      const transcripts = await Transcript.findByFunnel(funnel);
      return res.json({
        funnel,
        count: transcripts.length,
        transcripts
      });
    }

    res.status(400).json({ error: 'Provide funnel or videoId parameter' });
  } catch (error) {
    logger.error('Error fetching transcripts:', error);
    res.status(500).json({ error: 'Failed to fetch transcripts' });
  }
});

/**
 * GET /api/transcripts/:videoId
 * Get transcript for specific video
 */
router.get('/:videoId', async (req, res) => {
  try {
    const transcript = await Transcript.findByVideoId(req.params.videoId);

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(transcript);
  } catch (error) {
    logger.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

/**
 * PUT /api/transcripts/:videoId
 * Update transcript text
 */
router.put('/:videoId', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const transcript = await Transcript.findByVideoId(req.params.videoId);

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const updated = await Transcript.update(transcript.id, text);
    logger.info(`Transcript updated for video: ${req.params.videoId}`);
    
    res.json(updated);
  } catch (error) {
    logger.error('Error updating transcript:', error);
    res.status(500).json({ error: 'Failed to update transcript' });
  }
});

/**
 * DELETE /api/transcripts/:videoId
 * Delete transcript
 */
router.delete('/:videoId', async (req, res) => {
  try {
    const transcript = await Transcript.findByVideoId(req.params.videoId);

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    await Transcript.delete(transcript.id);
    logger.info(`Transcript deleted for video: ${req.params.videoId}`);
    
    res.json({ message: 'Transcript deleted successfully' });
  } catch (error) {
    logger.error('Error deleting transcript:', error);
    res.status(500).json({ error: 'Failed to delete transcript' });
  }
});

module.exports = router;
