const express = require('express');
const db = require('../config/database');
const pino = require('pino');
const { v4: uuidv4 } = require('uuid');
const {
  authenticateAgent,
  logAgentAction,
  formatAgentResponse
} = require('../middleware/agentAuth');

const router = express.Router();
const logger = pino();

// Apply agent authentication to all routes
router.use(authenticateAgent);

// ============================================
// CONTENT ACCESS ENDPOINTS
// ============================================

// GET /api/agents/content - Get approved content by funnel/stage/type
router.get('/content', async (req, res) => {
  try {
    const { funnel, stage, type } = req.query;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    if (!funnel || !stage) {
      return res.status(400).json(
        formatAgentResponse('error', null, requestId, agentName, 'get_content', 'funnel and stage parameters required')
      );
    }

    const query = `
      SELECT id, asset_type, name, content_url, content_text, metadata, approved_at
      FROM marketing_assets
      WHERE approval_status = 'approved'
      AND funnel = $1
      AND stage = $2
      ${type ? 'AND asset_type = $3' : ''}
      ORDER BY approved_at DESC
    `;

    const params = [funnel, stage];
    if (type) params.push(type);

    const result = await db.query(query, params);

    await logAgentAction(agentName, null, 'get_content', 'query', 'success', {
      funnel,
      stage,
      type,
      count: result.rows.length
    }, null, requestId);

    res.json(formatAgentResponse('success', { assets: result.rows, count: result.rows.length }, requestId, agentName, 'get_content'));
  } catch (error) {
    logger.error('Error fetching content:', error);
    await logAgentAction(req.agent.name, null, 'get_content', 'query', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_content', error.message));
  }
});

// GET /api/agents/transcripts - Get approved video transcripts
router.get('/transcripts', async (req, res) => {
  try {
    const { approved, funnel } = req.query;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    let query = `
      SELECT v.id, v.title, v.funnel, t.text, t.language, v.approval_status
      FROM videos v
      LEFT JOIN transcripts t ON v.id = t.video_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (approved === 'true') {
      query += ` AND v.approval_status = $${paramIndex}`;
      params.push('approved');
      paramIndex++;
    }

    if (funnel) {
      query += ` AND v.funnel = $${paramIndex}`;
      params.push(funnel);
      paramIndex++;
    }

    query += ' ORDER BY v.uploaded_at DESC LIMIT 100';

    const result = await db.query(query, params);

    await logAgentAction(agentName, null, 'get_transcripts', 'query', 'success', {
      approved,
      funnel,
      count: result.rows.length
    }, null, requestId);

    res.json(formatAgentResponse('success', { transcripts: result.rows, count: result.rows.length }, requestId, agentName, 'get_transcripts'));
  } catch (error) {
    logger.error('Error fetching transcripts:', error);
    await logAgentAction(req.agent.name, null, 'get_transcripts', 'query', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_transcripts', error.message));
  }
});

// GET /api/agents/assets/:id - Get single asset with approval status
router.get('/assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    // Check both marketing_assets and videos tables
    let asset = null;
    let query = 'SELECT * FROM marketing_assets WHERE id = $1';
    let result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      // Try videos table
      query = `
        SELECT id, title as name, filename as content_url, approval_status, uploaded_at as created_at
        FROM videos WHERE id = $1
      `;
      result = await db.query(query, [id]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json(
        formatAgentResponse('error', null, requestId, agentName, 'get_asset', 'Asset not found')
      );
    }

    asset = result.rows[0];

    // Only return approved assets
    if (asset.approval_status !== 'approved') {
      return res.status(403).json(
        formatAgentResponse('error', null, requestId, agentName, 'get_asset', 'Content not approved for agent access')
      );
    }

    await logAgentAction(agentName, null, 'get_asset', 'query', 'success', { asset_id: id }, null, requestId);

    res.json(formatAgentResponse('success', asset, requestId, agentName, 'get_asset'));
  } catch (error) {
    logger.error('Error fetching asset:', error);
    await logAgentAction(req.agent.name, null, 'get_asset', 'query', 'failed', { asset_id: req.params.id }, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_asset', error.message));
  }
});

// GET /api/agents/email-templates - List all approved email templates
router.get('/email-templates', async (req, res) => {
  try {
    const { funnel, stage } = req.query;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    let query = `
      SELECT id, name, funnel, stage, subject, variables, created_at
      FROM templates
      WHERE approval_status = 'approved'
      AND template_type = 'email'
    `;

    const params = [];
    let paramIndex = 1;

    if (funnel) {
      query += ` AND funnel = $${paramIndex}`;
      params.push(funnel);
      paramIndex++;
    }

    if (stage) {
      query += ` AND stage = $${paramIndex}`;
      params.push(stage);
      paramIndex++;
    }

    query += ' ORDER BY funnel, stage, created_at DESC';

    const result = await db.query(query, params);

    await logAgentAction(agentName, null, 'list_email_templates', 'query', 'success', {
      count: result.rows.length,
      funnel,
      stage
    }, null, requestId);

    res.json(formatAgentResponse('success', { templates: result.rows, count: result.rows.length }, requestId, agentName, 'list_email_templates'));
  } catch (error) {
    logger.error('Error fetching email templates:', error);
    await logAgentAction(req.agent.name, null, 'list_email_templates', 'query', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'list_email_templates', error.message));
  }
});

// ============================================
// FUNNEL STATE MANAGEMENT
// ============================================

// GET /api/agents/user/:userId/state - Get user's progress
router.get('/user/:userId/state', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    const query = 'SELECT * FROM user_states WHERE user_id = $1';
    const result = await db.query(query, [userId]);

    const states = result.rows.length > 0 ? result.rows : [];

    await logAgentAction(agentName, userId, 'get_user_state', 'query', 'success', { funnel_count: states.length }, null, requestId);

    res.json(formatAgentResponse('success', { userStates: states }, requestId, agentName, 'get_user_state'));
  } catch (error) {
    logger.error('Error fetching user state:', error);
    await logAgentAction(req.agent.name, req.params.userId, 'get_user_state', 'query', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_user_state', error.message));
  }
});

// PUT /api/agents/user/:userId/state - Update user progress
router.put('/user/:userId/state', async (req, res) => {
  try {
    const { userId } = req.params;
    const { funnel, stage, status } = req.body;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    if (!funnel || !stage) {
      return res.status(400).json(
        formatAgentResponse('error', null, requestId, agentName, 'update_user_state', 'funnel and stage required')
      );
    }

    // Get or create state
    let query = 'SELECT * FROM user_states WHERE user_id = $1 AND funnel = $2';
    let result = await db.query(query, [userId, funnel]);

    let updatedState;
    if (result.rows.length === 0) {
      // Create new state
      const id = uuidv4();
      const insertQuery = `
        INSERT INTO user_states (id, user_id, funnel, current_stage, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const insertResult = await db.query(insertQuery, [id, userId, funnel, stage, status || 'active']);
      updatedState = insertResult.rows[0];
    } else {
      // Update existing
      const updateQuery = `
        UPDATE user_states
        SET current_stage = $1, status = COALESCE($2, status), last_action_at = NOW(), updated_at = NOW()
        WHERE user_id = $3 AND funnel = $4
        RETURNING *
      `;
      const updateResult = await db.query(updateQuery, [stage, status, userId, funnel]);
      updatedState = updateResult.rows[0];
    }

    await logAgentAction(agentName, userId, 'update_user_state', 'state_update', 'success', {
      funnel,
      stage,
      status
    }, null, requestId);

    res.json(formatAgentResponse('success', updatedState, requestId, agentName, 'update_user_state'));
  } catch (error) {
    logger.error('Error updating user state:', error);
    await logAgentAction(req.agent.name, req.params.userId, 'update_user_state', 'state_update', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'update_user_state', error.message));
  }
});

// POST /api/agents/user/:userId/log - Log an action
router.post('/user/:userId/log', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, action_type, result, details } = req.body;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    if (!action || !action_type) {
      return res.status(400).json(
        formatAgentResponse('error', null, requestId, agentName, 'log_action', 'action and action_type required')
      );
    }

    const id = uuidv4();
    const query = `
      INSERT INTO agent_logs (id, agent_name, user_id, action, action_type, result, request_id, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const dbResult = await db.query(query, [
      id,
      agentName,
      userId,
      action,
      action_type,
      result || 'success',
      requestId,
      JSON.stringify(details || {})
    ]);

    res.status(201).json(formatAgentResponse('success', dbResult.rows[0], requestId, agentName, 'log_action'));
  } catch (error) {
    logger.error('Error logging action:', error);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'log_action', error.message));
  }
});

// GET /api/agents/funnel/:funnel/stats - Real-time funnel metrics
router.get('/funnel/:funnel/stats', async (req, res) => {
  try {
    const { funnel } = req.params;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    // Get stage distribution
    const stageQuery = `
      SELECT 
        current_stage as stage,
        COUNT(*) as user_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'churned' THEN 1 END) as churned_users
      FROM user_states
      WHERE funnel = $1
      GROUP BY current_stage
      ORDER BY current_stage
    `;

    const stageResult = await db.query(stageQuery, [funnel]);

    // Get conversion metrics
    const conversionQuery = `
      SELECT 
        COUNT(*) as total_conversions,
        COUNT(CASE WHEN conversion_type = 'match' THEN 1 END) as match_conversions,
        COUNT(CASE WHEN conversion_type = 'booking' THEN 1 END) as booking_conversions,
        COUNT(CASE WHEN conversion_type = 'payment' THEN 1 END) as payment_conversions,
        COALESCE(SUM(amount), 0) as total_revenue
      FROM conversions
      WHERE funnel = $1 AND DATE(created_at) = CURRENT_DATE
    `;

    const conversionResult = await db.query(conversionQuery, [funnel]);

    const stats = {
      funnel,
      stages: stageResult.rows,
      daily_conversions: conversionResult.rows[0],
      timestamp: new Date().toISOString()
    };

    await logAgentAction(agentName, null, 'get_funnel_stats', 'query', 'success', { funnel }, null, requestId);

    res.json(formatAgentResponse('success', stats, requestId, agentName, 'get_funnel_stats'));
  } catch (error) {
    logger.error('Error fetching funnel stats:', error);
    await logAgentAction(req.agent.name, null, 'get_funnel_stats', 'query', 'failed', { funnel: req.params.funnel }, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_funnel_stats', error.message));
  }
});

// ============================================
// EMAIL/SMS SENDING
// ============================================

// POST /api/agents/send-email - Send personalized email
router.post('/send-email', async (req, res) => {
  try {
    const { user_id, email_address, template_id, variables } = req.body;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    if (!user_id || !email_address || !template_id) {
      return res.status(400).json(
        formatAgentResponse('error', null, requestId, agentName, 'send_email', 'user_id, email_address, and template_id required')
      );
    }

    // Get template
    const templateQuery = 'SELECT * FROM templates WHERE id = $1 AND approval_status = $2';
    const templateResult = await db.query(templateQuery, [template_id, 'approved']);

    if (templateResult.rows.length === 0) {
      return res.status(403).json(
        formatAgentResponse('error', null, requestId, agentName, 'send_email', 'Template not approved for use')
      );
    }

    const template = templateResult.rows[0];

    // Replace variables in template
    let content = template.content;
    let subject = template.subject || '';
    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(placeholder, value);
        subject = subject.replace(placeholder, value);
      });
    }

    // Log email send
    const logId = uuidv4();
    const logQuery = `
      INSERT INTO email_logs (id, user_id, email_address, template_id, subject, status, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const logResult = await db.query(logQuery, [logId, user_id, email_address, template_id, subject, 'sent']);

    await logAgentAction(agentName, user_id, 'send_email', 'email', 'success', {
      email_address,
      template_id,
      log_id: logId
    }, null, requestId);

    res.status(201).json(formatAgentResponse('success', logResult.rows[0], requestId, agentName, 'send_email'));
  } catch (error) {
    logger.error('Error sending email:', error);
    await logAgentAction(req.agent.name, req.body.user_id, 'send_email', 'email', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'send_email', error.message));
  }
});

// POST /api/agents/send-sms - Send SMS
router.post('/send-sms', async (req, res) => {
  try {
    const { user_id, phone_number, template_id, variables } = req.body;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    if (!user_id || !phone_number || !template_id) {
      return res.status(400).json(
        formatAgentResponse('error', null, requestId, agentName, 'send_sms', 'user_id, phone_number, and template_id required')
      );
    }

    // Get template
    const templateQuery = 'SELECT * FROM templates WHERE id = $1 AND approval_status = $2 AND template_type = $3';
    const templateResult = await db.query(templateQuery, [template_id, 'approved', 'sms']);

    if (templateResult.rows.length === 0) {
      return res.status(403).json(
        formatAgentResponse('error', null, requestId, agentName, 'send_sms', 'SMS template not approved for use')
      );
    }

    const template = templateResult.rows[0];

    // Replace variables
    let message = template.content;
    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(placeholder, value);
      });
    }

    // Log SMS send
    const logId = uuidv4();
    const logQuery = `
      INSERT INTO sms_logs (id, user_id, phone_number, template_id, message_text, status, sent_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const logResult = await db.query(logQuery, [logId, user_id, phone_number, template_id, message, 'sent']);

    await logAgentAction(agentName, user_id, 'send_sms', 'sms', 'success', {
      phone_number,
      template_id,
      log_id: logId
    }, null, requestId);

    res.status(201).json(formatAgentResponse('success', logResult.rows[0], requestId, agentName, 'send_sms'));
  } catch (error) {
    logger.error('Error sending SMS:', error);
    await logAgentAction(req.agent.name, req.body.user_id, 'send_sms', 'sms', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'send_sms', error.message));
  }
});

// ============================================
// MATCHING (Patient ↔ Healer)
// ============================================

// POST /api/agents/match - Match patient with healer
router.post('/match', async (req, res) => {
  try {
    const { patient_id, healer_filters, compatibility_threshold = 0.7 } = req.body;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    if (!patient_id) {
      return res.status(400).json(
        formatAgentResponse('error', null, requestId, agentName, 'match_patient_healer', 'patient_id required')
      );
    }

    // Find available healers matching criteria
    let query = 'SELECT * FROM healers WHERE availability_status = $1';
    const params = ['available'];
    let paramIndex = 2;

    if (healer_filters?.experience) {
      query += ` AND experience_level = $${paramIndex}`;
      params.push(healer_filters.experience);
      paramIndex++;
    }

    if (healer_filters?.specialties && healer_filters.specialties.length > 0) {
      query += ` AND specialties @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify(healer_filters.specialties));
      paramIndex++;
    }

    query += ' ORDER BY rating DESC, review_count DESC LIMIT 10';

    const healerResult = await db.query(query, params);

    if (healerResult.rows.length === 0) {
      return res.status(404).json(
        formatAgentResponse('error', null, requestId, agentName, 'match_patient_healer', 'No compatible healers available')
      );
    }

    // Use first (best) match
    const selectedHealer = healerResult.rows[0];

    // Create match record
    const matchId = uuidv4();
    const matchQuery = `
      INSERT INTO matches (id, patient_id, healer_id, compatibility_score, match_reason, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const matchResult = await db.query(matchQuery, [
      matchId,
      patient_id,
      selectedHealer.id,
      compatibility_threshold,
      'Matched by agent algorithm',
      'pending'
    ]);

    await logAgentAction(agentName, patient_id, 'match_patient_healer', 'match', 'success', {
      healer_id: selectedHealer.id,
      match_id: matchId,
      compatibility_score: compatibility_threshold
    }, null, requestId);

    res.status(201).json(formatAgentResponse('success', {
      match: matchResult.rows[0],
      healer: selectedHealer
    }, requestId, agentName, 'match_patient_healer'));
  } catch (error) {
    logger.error('Error matching patient:', error);
    await logAgentAction(req.agent.name, req.body.patient_id, 'match_patient_healer', 'match', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'match_patient_healer', error.message));
  }
});

// GET /api/agents/healers - Query healers
router.get('/healers', async (req, res) => {
  try {
    const { experience, availability, specialties, limit = 50 } = req.query;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    let query = 'SELECT id, name, experience_level, specialties, rating, review_count, availability_status FROM healers WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (availability === 'true') {
      query += ` AND availability_status = $${paramIndex}`;
      params.push('available');
      paramIndex++;
    }

    if (experience) {
      query += ` AND experience_level = $${paramIndex}`;
      params.push(experience);
      paramIndex++;
    }

    if (specialties) {
      const spec = Array.isArray(specialties) ? specialties : specialties.split(',');
      query += ` AND specialties @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify(spec));
      paramIndex++;
    }

    query += ` ORDER BY rating DESC, review_count DESC LIMIT ${Math.min(limit, 500)}`;

    const result = await db.query(query, params);

    await logAgentAction(agentName, null, 'query_healers', 'query', 'success', {
      filters: { experience, availability, specialties },
      count: result.rows.length
    }, null, requestId);

    res.json(formatAgentResponse('success', { healers: result.rows, count: result.rows.length }, requestId, agentName, 'query_healers'));
  } catch (error) {
    logger.error('Error querying healers:', error);
    await logAgentAction(req.agent.name, null, 'query_healers', 'query', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'query_healers', error.message));
  }
});

// GET /api/agents/healers/:id/availability - Check healer calendar
router.get('/healers/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    const query = 'SELECT id, name, availability_status, calendar_url, price_range FROM healers WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json(
        formatAgentResponse('error', null, requestId, agentName, 'check_healer_availability', 'Healer not found')
      );
    }

    const healer = result.rows[0];

    await logAgentAction(agentName, null, 'check_healer_availability', 'query', 'success', { healer_id: id }, null, requestId);

    res.json(formatAgentResponse('success', {
      healer_id: id,
      status: healer.availability_status,
      calendar_url: healer.calendar_url,
      price_range: healer.price_range
    }, requestId, agentName, 'check_healer_availability'));
  } catch (error) {
    logger.error('Error checking healer availability:', error);
    await logAgentAction(req.agent.name, null, 'check_healer_availability', 'query', 'failed', { healer_id: req.params.id }, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'check_healer_availability', error.message));
  }
});

// PUT /api/agents/healers/:id/availability - Update healer availability
router.put('/healers/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    if (!['available', 'busy', 'unavailable'].includes(status)) {
      return res.status(400).json(
        formatAgentResponse('error', null, requestId, agentName, 'update_healer_availability', 'Invalid status')
      );
    }

    const query = `
      UPDATE healers
      SET availability_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json(
        formatAgentResponse('error', null, requestId, agentName, 'update_healer_availability', 'Healer not found')
      );
    }

    await logAgentAction(agentName, null, 'update_healer_availability', 'state_update', 'success', {
      healer_id: id,
      new_status: status
    }, null, requestId);

    res.json(formatAgentResponse('success', result.rows[0], requestId, agentName, 'update_healer_availability'));
  } catch (error) {
    logger.error('Error updating healer availability:', error);
    await logAgentAction(req.agent.name, null, 'update_healer_availability', 'state_update', 'failed', { healer_id: req.params.id }, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'update_healer_availability', error.message));
  }
});

// ============================================
// METRICS & ANALYTICS
// ============================================

// GET /api/agents/metrics - 7-day funnel metrics
router.get('/metrics', async (req, res) => {
  try {
    const { funnel, days = 7 } = req.query;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action_type = 'email' THEN 1 END) as email_actions,
        COUNT(CASE WHEN action_type = 'sms' THEN 1 END) as sms_actions,
        COUNT(CASE WHEN action_type = 'match' THEN 1 END) as match_actions,
        COUNT(CASE WHEN result = 'success' THEN 1 END) as successful_actions
      FROM agent_logs
      WHERE agent_name = $1 AND created_at >= NOW() - interval '${Math.min(days, 90)} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const result = await db.query(query, [funnel || 'all']);

    await logAgentAction(agentName, null, 'get_metrics', 'query', 'success', { days, funnel }, null, requestId);

    res.json(formatAgentResponse('success', { metrics: result.rows }, requestId, agentName, 'get_metrics'));
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    await logAgentAction(req.agent.name, null, 'get_metrics', 'query', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_metrics', error.message));
  }
});

// GET /api/agents/cohort/:cohortId/performance - Track cohort conversion
router.get('/cohort/:cohortId/performance', async (req, res) => {
  try {
    const { cohortId } = req.params;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    const query = `
      SELECT 
        funnel,
        COUNT(DISTINCT user_id) as users,
        COUNT(*) as conversions,
        SUM(amount) as total_revenue,
        COUNT(CASE WHEN conversion_type = 'match' THEN 1 END) as match_conversions
      FROM conversions
      WHERE user_id IN (
        SELECT user_id FROM user_states WHERE metadata->>'cohort_id' = $1
      )
      GROUP BY funnel
    `;

    const result = await db.query(query, [cohortId]);

    await logAgentAction(agentName, null, 'get_cohort_performance', 'query', 'success', { cohort_id: cohortId }, null, requestId);

    res.json(formatAgentResponse('success', { cohort_performance: result.rows }, requestId, agentName, 'get_cohort_performance'));
  } catch (error) {
    logger.error('Error fetching cohort performance:', error);
    await logAgentAction(req.agent.name, null, 'get_cohort_performance', 'query', 'failed', { cohort_id: req.params.cohortId }, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_cohort_performance', error.message));
  }
});

// GET /api/agents/conversion-rate - Conversion by stage
router.get('/conversion-rate', async (req, res) => {
  try {
    const { funnel, stage } = req.query;
    const requestId = req.requestId;
    const agentName = req.agent.name;

    let query = `
      SELECT 
        us.current_stage,
        COUNT(DISTINCT us.user_id) as users_in_stage,
        COUNT(DISTINCT c.user_id) as converted_users,
        ROUND(100.0 * COUNT(DISTINCT c.user_id) / COUNT(DISTINCT us.user_id), 2) as conversion_rate
      FROM user_states us
      LEFT JOIN conversions c ON us.user_id = c.user_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (funnel) {
      query += ` AND us.funnel = $${paramIndex}`;
      params.push(funnel);
      paramIndex++;
    }

    if (stage) {
      query += ` AND us.current_stage = $${paramIndex}`;
      params.push(stage);
      paramIndex++;
    }

    query += ' GROUP BY us.current_stage';

    const result = await db.query(query, params);

    await logAgentAction(agentName, null, 'get_conversion_rate', 'query', 'success', { funnel, stage }, null, requestId);

    res.json(formatAgentResponse('success', { conversion_rates: result.rows }, requestId, agentName, 'get_conversion_rate'));
  } catch (error) {
    logger.error('Error fetching conversion rate:', error);
    await logAgentAction(req.agent.name, null, 'get_conversion_rate', 'query', 'failed', {}, error.message, req.requestId);
    res.status(500).json(formatAgentResponse('error', null, req.requestId, req.agent.name, 'get_conversion_rate', error.message));
  }
});

module.exports = router;
