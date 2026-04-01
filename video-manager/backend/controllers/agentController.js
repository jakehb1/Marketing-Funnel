const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const pino = require('pino');

const logger = pino();

class AgentController {
  // Initialize user in funnel
  static async startFunnel(userId, funnelName, initialStage = 'awareness') {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO user_states (id, user_id, funnel, current_stage, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, funnel) DO UPDATE SET status = 'active', updated_at = NOW()
        RETURNING *
      `;

      const result = await db.query(query, [
        id,
        userId,
        funnelName,
        initialStage,
        'active',
        JSON.stringify({ started_at: new Date().toISOString() })
      ]);

      logger.info(`Started ${funnelName} funnel for user ${userId}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error starting funnel:', error);
      throw error;
    }
  }

  // Move user through funnel stages
  static async progressFunnel(userId, funnel, newStage) {
    try {
      const query = `
        UPDATE user_states
        SET current_stage = $1, last_action_at = NOW(), updated_at = NOW()
        WHERE user_id = $2 AND funnel = $3
        RETURNING *
      `;

      const result = await db.query(query, [newStage, userId, funnel]);

      if (result.rows.length === 0) {
        throw new Error(`User state not found for ${userId} in ${funnel}`);
      }

      logger.info(`Progressed user ${userId} to ${newStage} in ${funnel}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error progressing funnel:', error);
      throw error;
    }
  }

  // Execute email sequence (Day 1, 7, 14, 30)
  static async sendEmailSequence(userId, funnel, stage, emailVariables = {}) {
    try {
      // Get sequence templates for this funnel/stage
      const query = `
        SELECT id, name, content, subject
        FROM templates
        WHERE approval_status = 'approved'
        AND template_type = 'email'
        AND funnel = $1
        AND stage = $2
        ORDER BY created_at ASC
      `;

      const result = await db.query(query, [funnel, stage]);

      if (result.rows.length === 0) {
        throw new Error(`No approved email templates for ${funnel}/${stage}`);
      }

      const sentEmails = [];

      for (const template of result.rows) {
        let content = template.content;
        let subject = template.subject || '';

        // Replace variables
        Object.entries(emailVariables).forEach(([key, value]) => {
          const placeholder = new RegExp(`{{${key}}}`, 'g');
          content = content.replace(placeholder, value);
          subject = subject.replace(placeholder, value);
        });

        // Log email
        const emailLogId = uuidv4();
        await db.query(
          `INSERT INTO email_logs (id, user_id, template_id, subject, status, sent_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [emailLogId, userId, template.id, subject, 'sent']
        );

        sentEmails.push({
          id: emailLogId,
          template_name: template.name,
          subject
        });
      }

      logger.info(`Sent ${sentEmails.length} emails for user ${userId} in ${funnel}/${stage}`);
      return sentEmails;
    } catch (error) {
      logger.error('Error sending email sequence:', error);
      throw error;
    }
  }

  // Match patient with healer
  static async matchHealer(patientId, filters = {}) {
    try {
      // Query available healers matching criteria
      let query = 'SELECT * FROM healers WHERE availability_status = $1';
      const params = ['available'];
      let paramIndex = 2;

      if (filters.experience) {
        query += ` AND experience_level = $${paramIndex}`;
        params.push(filters.experience);
        paramIndex++;
      }

      if (filters.specialties && Array.isArray(filters.specialties) && filters.specialties.length > 0) {
        query += ` AND specialties @> $${paramIndex}::jsonb`;
        params.push(JSON.stringify(filters.specialties));
        paramIndex++;
      }

      if (filters.minRating) {
        query += ` AND rating >= $${paramIndex}`;
        params.push(filters.minRating);
        paramIndex++;
      }

      query += ' ORDER BY rating DESC, review_count DESC LIMIT 1';

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        throw new Error('No compatible healers available');
      }

      const healer = result.rows[0];

      // Create match
      const matchId = uuidv4();
      const matchQuery = `
        INSERT INTO matches (id, patient_id, healer_id, compatibility_score, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const matchResult = await db.query(matchQuery, [
        matchId,
        patientId,
        healer.id,
        filters.minRating || 4.0,
        'pending'
      ]);

      logger.info(`Matched patient ${patientId} with healer ${healer.id}`);
      return {
        match: matchResult.rows[0],
        healer
      };
    } catch (error) {
      logger.error('Error matching healer:', error);
      throw error;
    }
  }

  // Check for churn risk and send intervention
  static async retentionCheck(funnel, daysSinceLastAction = 14) {
    try {
      // Find users at risk (inactive for N days)
      const query = `
        SELECT id, user_id, funnel, current_stage
        FROM user_states
        WHERE funnel = $1
        AND status = 'active'
        AND (last_action_at IS NULL OR last_action_at < NOW() - interval '${daysSinceLastAction} days')
        LIMIT 100
      `;

      const result = await db.query(query, [funnel]);

      const atRiskUsers = result.rows;

      // Mark as at-risk
      for (const user of atRiskUsers) {
        await db.query(
          `UPDATE user_states SET status = 'at_risk', updated_at = NOW() WHERE id = $1`,
          [user.id]
        );
      }

      logger.info(`Identified ${atRiskUsers.length} at-risk users in ${funnel}`);
      return atRiskUsers;
    } catch (error) {
      logger.error('Error checking retention:', error);
      throw error;
    }
  }

  // Log action to audit trail
  static async logAction(agentName, userId, action, actionType, result = 'success', details = {}, errorMessage = null, requestId = null) {
    try {
      const id = uuidv4();
      await db.query(
        `INSERT INTO agent_logs (id, agent_name, user_id, action, action_type, result, request_id, details, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, agentName, userId || null, action, actionType, result, requestId, JSON.stringify(details), errorMessage]
      );

      return id;
    } catch (error) {
      logger.error('Error logging action:', error);
      throw error;
    }
  }

  // Track conversion
  static async trackConversion(userId, funnel, stage, conversionType, amount = 0, triggerAgent = null) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO conversions (id, user_id, funnel, stage, conversion_type, amount, trigger_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await db.query(query, [id, userId, funnel, stage, conversionType, amount, triggerAgent]);

      logger.info(`Tracked ${conversionType} conversion for user ${userId}: $${amount}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Error tracking conversion:', error);
      throw error;
    }
  }

  // Get funnel health metrics
  static async getFunnelHealth(funnel) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
          COUNT(CASE WHEN status = 'churned' THEN 1 END) as churned_users,
          COUNT(CASE WHEN status = 'at_risk' THEN 1 END) as at_risk_users,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_users,
          AVG(EXTRACT(DAY FROM (NOW() - entered_at))) as avg_days_in_funnel
        FROM user_states
        WHERE funnel = $1
      `;

      const result = await db.query(query, [funnel]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting funnel health:', error);
      throw error;
    }
  }

  // Get agent performance summary
  static async getAgentPerformance(agentName, days = 7) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_actions,
          COUNT(CASE WHEN result = 'success' THEN 1 END) as successful_actions,
          COUNT(CASE WHEN action_type = 'email' THEN 1 END) as email_count,
          COUNT(CASE WHEN action_type = 'sms' THEN 1 END) as sms_count,
          COUNT(CASE WHEN action_type = 'match' THEN 1 END) as match_count,
          COUNT(DISTINCT user_id) as unique_users_touched,
          ROUND(100.0 * COUNT(CASE WHEN result = 'success' THEN 1 END) / COUNT(*), 2) as success_rate
        FROM agent_logs
        WHERE agent_name = $1
        AND created_at >= NOW() - interval '${Math.min(days, 90)} days'
      `;

      const result = await db.query(query, [agentName]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting agent performance:', error);
      throw error;
    }
  }

  // Bulk transition users (for campaigns)
  static async bulkTransitionUsers(funnel, fromStage, toStage, limit = 100) {
    try {
      const query = `
        UPDATE user_states
        SET current_stage = $1, last_action_at = NOW(), updated_at = NOW()
        WHERE funnel = $2
        AND current_stage = $3
        AND status = 'active'
        LIMIT $4
        RETURNING *
      `;

      const result = await db.query(query, [toStage, funnel, fromStage, limit]);

      logger.info(`Transitioned ${result.rows.length} users from ${fromStage} to ${toStage} in ${funnel}`);
      return result.rows;
    } catch (error) {
      logger.error('Error bulk transitioning users:', error);
      throw error;
    }
  }
}

module.exports = AgentController;
