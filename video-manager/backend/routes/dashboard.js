const express = require('express');
const db = require('../config/database');
const pino = require('pino');

const logger = pino();
const router = express.Router();

// Middleware: Charlie PIN verification for dashboard access
const verifyCharlie = (req, res, next) => {
  const pin = req.headers['x-charlie-pin'] || req.body.pin;
  const expectedPin = process.env.CHARLIE_PIN || '1234';

  if (pin !== expectedPin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

router.use(verifyCharlie);

// GET /api/dashboard/agents - Show all active agents + current tasks
router.get('/agents', async (req, res) => {
  try {
    // Get agent keys and their last activity
    const query = `
      SELECT 
        ak.agent_name,
        ak.last_used,
        COUNT(al.id) as total_actions,
        COUNT(CASE WHEN al.created_at >= NOW() - interval '1 hour' THEN 1 END) as actions_last_hour,
        COUNT(CASE WHEN al.result = 'success' THEN 1 END) as successful_actions,
        COUNT(CASE WHEN al.result = 'failed' THEN 1 END) as failed_actions,
        MAX(al.created_at) as last_action
      FROM agent_keys ak
      LEFT JOIN agent_logs al ON ak.agent_name = al.agent_name
      WHERE ak.status = 'active'
      GROUP BY ak.agent_name, ak.last_used
      ORDER BY ak.last_used DESC NULLS LAST
    `;

    const result = await db.query(query);

    res.json({
      agents: result.rows,
      timestamp: new Date().toISOString(),
      total_agents: result.rows.length,
      active_agents: result.rows.filter(a => a.last_action && new Date(a.last_action) > new Date(Date.now() - 3600000)).length
    });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/dashboard/funnel/:funnel - Live funnel metrics
router.get('/funnel/:funnel', async (req, res) => {
  try {
    const { funnel } = req.params;

    // Stage distribution
    const stageQuery = `
      SELECT 
        current_stage as stage,
        COUNT(*) as user_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'churned' THEN 1 END) as churned_users,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_users,
        COUNT(CASE WHEN status = 'at_risk' THEN 1 END) as at_risk_users
      FROM user_states
      WHERE funnel = $1
      GROUP BY current_stage
      ORDER BY current_stage
    `;

    const stageResult = await db.query(stageQuery, [funnel]);

    // Conversion rates
    const conversionQuery = `
      SELECT 
        us.current_stage,
        COUNT(DISTINCT us.user_id) as users_in_stage,
        COUNT(DISTINCT c.user_id) as converted_users,
        ROUND(100.0 * COUNT(DISTINCT c.user_id) / NULLIF(COUNT(DISTINCT us.user_id), 0), 2) as conversion_rate
      FROM user_states us
      LEFT JOIN conversions c ON us.user_id = c.user_id AND us.funnel = c.funnel
      WHERE us.funnel = $1
      GROUP BY us.current_stage
    `;

    const conversionResult = await db.query(conversionQuery, [funnel]);

    // Daily metrics for last 7 days
    const metricsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as new_users,
        COUNT(*) as total_actions
      FROM user_states
      WHERE funnel = $1
      AND created_at >= NOW() - interval '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const metricsResult = await db.query(metricsQuery, [funnel]);

    // Funnel totals
    const totalsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN status = 'churned' THEN 1 END) as churned_users,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_users
      FROM user_states
      WHERE funnel = $1
    `;

    const totalsResult = await db.query(totalsQuery, [funnel]);

    res.json({
      funnel,
      totals: totalsResult.rows[0],
      by_stage: stageResult.rows,
      conversion_rates: conversionResult.rows,
      daily_metrics: metricsResult.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching funnel metrics:', error);
    res.status(500).json({ error: 'Failed to fetch funnel metrics' });
  }
});

// GET /api/dashboard/approvals - Recent approvals/rejections
router.get('/approvals', async (req, res) => {
  try {
    const { limit = 50, status } = req.query;

    let query = `
      SELECT 
        a.id,
        a.status,
        a.content_type,
        a.content_id,
        a.reviewed_by,
        a.review_date,
        a.notes,
        a.created_at,
        v.title as video_title
      FROM approvals a
      LEFT JOIN videos v ON a.content_id = v.id AND a.content_type = 'video'
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT ${Math.min(limit, 100)}`;

    const result = await db.query(query, params);

    res.json({
      approvals: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// GET /api/dashboard/templates - All templates status
router.get('/templates', async (req, res) => {
  try {
    const query = `
      SELECT 
        template_type,
        approval_status,
        COUNT(*) as count
      FROM templates
      GROUP BY template_type, approval_status
      ORDER BY template_type, approval_status
    `;

    const result = await db.query(query);

    res.json({
      templates_by_status: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /api/dashboard/conversions - Real-time conversion summary
router.get('/conversions', async (req, res) => {
  try {
    const { days = 7 } = req.query;

    // By funnel
    const byFunnelQuery = `
      SELECT 
        funnel,
        COUNT(*) as conversions,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(amount) as total_revenue,
        ROUND(SUM(amount) / COUNT(*), 2) as avg_order_value
      FROM conversions
      WHERE created_at >= NOW() - interval '${Math.min(days, 90)} days'
      GROUP BY funnel
      ORDER BY total_revenue DESC NULLS LAST
    `;

    const byFunnelResult = await db.query(byFunnelQuery);

    // By conversion type
    const byTypeQuery = `
      SELECT 
        conversion_type,
        COUNT(*) as conversions,
        COUNT(DISTINCT user_id) as unique_users,
        SUM(amount) as total_revenue
      FROM conversions
      WHERE created_at >= NOW() - interval '${Math.min(days, 90)} days'
      GROUP BY conversion_type
      ORDER BY conversions DESC
    `;

    const byTypeResult = await db.query(byTypeQuery);

    res.json({
      by_funnel: byFunnelResult.rows,
      by_type: byTypeResult.rows,
      period_days: days,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching conversions:', error);
    res.status(500).json({ error: 'Failed to fetch conversions' });
  }
});

// GET /api/dashboard/email-sms - Email/SMS performance
router.get('/email-sms', async (req, res) => {
  try {
    // Email stats
    const emailQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM email_logs
      WHERE sent_at >= NOW() - interval '7 days'
      GROUP BY status
    `;

    const emailResult = await db.query(emailQuery);

    // SMS stats
    const smsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM sms_logs
      WHERE sent_at >= NOW() - interval '7 days'
      GROUP BY status
    `;

    const smsResult = await db.query(smsQuery);

    res.json({
      email_stats: emailResult.rows,
      sms_stats: smsResult.rows,
      period: '7_days',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching email/sms stats:', error);
    res.status(500).json({ error: 'Failed to fetch email/sms stats' });
  }
});

// GET /api/dashboard/healers - Healer platform metrics
router.get('/healers', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_healers,
        COUNT(CASE WHEN availability_status = 'available' THEN 1 END) as available_healers,
        COUNT(CASE WHEN availability_status = 'busy' THEN 1 END) as busy_healers,
        COUNT(CASE WHEN availability_status = 'unavailable' THEN 1 END) as unavailable_healers,
        ROUND(AVG(rating), 2) as avg_rating,
        ROUND(AVG(review_count), 0) as avg_reviews
      FROM healers
    `;

    const totalsResult = await db.query(query);

    // By experience level
    const experienceQuery = `
      SELECT 
        experience_level,
        COUNT(*) as count,
        ROUND(AVG(rating), 2) as avg_rating
      FROM healers
      GROUP BY experience_level
      ORDER BY experience_level
    `;

    const experienceResult = await db.query(experienceQuery);

    // Match stats
    const matchQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM matches
      GROUP BY status
    `;

    const matchResult = await db.query(matchQuery);

    res.json({
      totals: totalsResult.rows[0],
      by_experience: experienceResult.rows,
      match_stats: matchResult.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching healer metrics:', error);
    res.status(500).json({ error: 'Failed to fetch healer metrics' });
  }
});

module.exports = router;
