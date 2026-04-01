const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const pino = require('pino');

const logger = pino();
const router = express.Router();

// Middleware to verify Charlie's PIN
const verifyCharlie = (req, res, next) => {
  const pin = req.headers['x-charlie-pin'] || req.body.pin;
  const expectedPin = process.env.CHARLIE_PIN || '1234';
  
  if (pin !== expectedPin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// GET /api/approvals - List all pending/approved/rejected approvals
router.get('/', verifyCharlie, async (req, res) => {
  try {
    const { status, content_type, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM approvals WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (content_type) {
      query += ` AND content_type = $${paramIndex}`;
      params.push(content_type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Enrich with content details
    const enriched = await Promise.all(result.rows.map(async (approval) => {
      let contentData = {};
      
      if (approval.content_type === 'video') {
        const videoResult = await db.query('SELECT id, title, original_name, funnel, duration FROM videos WHERE id = $1', [approval.content_id]);
        if (videoResult.rows.length > 0) {
          contentData = videoResult.rows[0];
        }
      } else if (approval.content_type === 'transcript') {
        const transcriptResult = await db.query('SELECT t.id, t.text, v.title FROM transcripts t JOIN videos v ON t.video_id = v.id WHERE t.id = $1', [approval.content_id]);
        if (transcriptResult.rows.length > 0) {
          contentData = transcriptResult.rows[0];
        }
      }
      
      return { ...approval, content: contentData };
    }));

    res.json({ approvals: enriched });
  } catch (error) {
    logger.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// POST /api/approvals - Create a new approval request
router.post('/', async (req, res) => {
  try {
    const { content_id, content_type, submitted_by } = req.body;

    if (!content_id || !content_type) {
      return res.status(400).json({ error: 'content_id and content_type are required' });
    }

    if (!['video', 'transcript', 'asset', 'clip'].includes(content_type)) {
      return res.status(400).json({ error: 'Invalid content_type' });
    }

    const id = uuidv4();
    const result = await db.query(
      'INSERT INTO approvals (id, content_id, content_type, submitted_by, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, content_id, content_type, submitted_by || 'system', 'pending']
    );

    // Update video approval_status if it's a video
    if (content_type === 'video') {
      await db.query('UPDATE videos SET approval_id = $1, approval_status = $2 WHERE id = $3', [id, 'pending', content_id]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating approval:', error);
    res.status(500).json({ error: 'Failed to create approval' });
  }
});

// POST /api/approvals/:id/approve - Charlie approves content
router.post('/:id/approve', verifyCharlie, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await db.query(
      'UPDATE approvals SET status = $1, reviewed_by = $2, review_date = $3, notes = $4, updated_at = $5 WHERE id = $6 RETURNING *',
      ['approved', 'charlie', new Date(), notes || null, new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approval = result.rows[0];

    // Update video approval_status if it's a video
    if (approval.content_type === 'video') {
      await db.query('UPDATE videos SET approval_status = $1 WHERE id = $2', ['approved', approval.content_id]);
    }

    res.json(approval);
  } catch (error) {
    logger.error('Error approving content:', error);
    res.status(500).json({ error: 'Failed to approve content' });
  }
});

// POST /api/approvals/:id/reject - Charlie rejects content
router.post('/:id/reject', verifyCharlie, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes || notes.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection notes are required' });
    }

    const result = await db.query(
      'UPDATE approvals SET status = $1, reviewed_by = $2, review_date = $3, notes = $4, updated_at = $5 WHERE id = $6 RETURNING *',
      ['rejected', 'charlie', new Date(), notes, new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approval = result.rows[0];

    // Update video approval_status if it's a video
    if (approval.content_type === 'video') {
      await db.query('UPDATE videos SET approval_status = $1 WHERE id = $2', ['rejected', approval.content_id]);
    }

    res.json(approval);
  } catch (error) {
    logger.error('Error rejecting content:', error);
    res.status(500).json({ error: 'Failed to reject content' });
  }
});

// GET /api/approvals/:id - Get a single approval with comments
router.get('/:id', verifyCharlie, async (req, res) => {
  try {
    const { id } = req.params;

    const approvalResult = await db.query('SELECT * FROM approvals WHERE id = $1', [id]);
    if (approvalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const approval = approvalResult.rows[0];

    const commentsResult = await db.query('SELECT * FROM approval_comments WHERE approval_id = $1 ORDER BY created_at ASC', [id]);
    approval.comments = commentsResult.rows;

    // Enrich with content details
    let contentData = {};
    if (approval.content_type === 'video') {
      const videoResult = await db.query(
        'SELECT id, title, original_name, funnel, duration, filename FROM videos WHERE id = $1',
        [approval.content_id]
      );
      if (videoResult.rows.length > 0) {
        contentData = videoResult.rows[0];
      }
    }

    approval.content = contentData;
    res.json(approval);
  } catch (error) {
    logger.error('Error fetching approval:', error);
    res.status(500).json({ error: 'Failed to fetch approval' });
  }
});

// PUT /api/approvals/:id/notes - Add review notes
router.put('/:id/notes', verifyCharlie, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment_text } = req.body;

    if (!comment_text || comment_text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const commentId = uuidv4();
    await db.query(
      'INSERT INTO approval_comments (id, approval_id, comment_text, created_by, created_at) VALUES ($1, $2, $3, $4, $5)',
      [commentId, id, comment_text, 'charlie', new Date()]
    );

    // Also update the approval notes field
    const result = await db.query(
      'UPDATE approvals SET notes = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [comment_text, new Date(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding approval comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/content/status/:id - Check if content is approved (no auth required)
router.get('/status/content/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check videos approval status
    const videoResult = await db.query('SELECT approval_status FROM videos WHERE id = $1', [id]);
    
    if (videoResult.rows.length > 0) {
      return res.json({
        id,
        type: 'video',
        approval_status: videoResult.rows[0].approval_status,
        is_approved: videoResult.rows[0].approval_status === 'approved'
      });
    }

    res.status(404).json({ error: 'Content not found' });
  } catch (error) {
    logger.error('Error checking content status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
