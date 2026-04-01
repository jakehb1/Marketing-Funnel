const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class UserState {
  static async getState(userId, funnel) {
    const query = `
      SELECT * FROM user_states 
      WHERE user_id = $1 AND funnel = $2
    `;
    const result = await db.query(query, [userId, funnel]);
    return result.rows[0] || null;
  }

  static async createState(userId, funnel, initialStage = 'awareness') {
    const id = uuidv4();
    const query = `
      INSERT INTO user_states (id, user_id, funnel, current_stage, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, funnel) DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    const result = await db.query(query, [id, userId, funnel, initialStage, 'active']);
    return result.rows[0];
  }

  static async updateStage(userId, funnel, newStage) {
    const query = `
      UPDATE user_states
      SET current_stage = $1, last_action_at = NOW(), updated_at = NOW()
      WHERE user_id = $2 AND funnel = $3
      RETURNING *
    `;
    const result = await db.query(query, [newStage, userId, funnel]);
    return result.rows[0] || null;
  }

  static async updateStatus(userId, funnel, status) {
    const query = `
      UPDATE user_states
      SET status = $1, updated_at = NOW()
      WHERE user_id = $2 AND funnel = $3
      RETURNING *
    `;
    const result = await db.query(query, [status, userId, funnel]);
    return result.rows[0] || null;
  }

  static async getStatsByFunnel(funnel) {
    const query = `
      SELECT 
        current_stage,
        COUNT(*) as user_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users
      FROM user_states
      WHERE funnel = $1
      GROUP BY current_stage
      ORDER BY current_stage
    `;
    const result = await db.query(query, [funnel]);
    return result.rows;
  }

  static async getAllByStatus(funnel, status, limit = 1000) {
    const query = `
      SELECT * FROM user_states
      WHERE funnel = $1 AND status = $2
      ORDER BY last_action_at DESC
      LIMIT $3
    `;
    const result = await db.query(query, [funnel, status, limit]);
    return result.rows;
  }

  static async updateMetadata(userId, funnel, metadata) {
    const query = `
      UPDATE user_states
      SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb, updated_at = NOW()
      WHERE user_id = $2 AND funnel = $3
      RETURNING *
    `;
    const result = await db.query(query, [JSON.stringify(metadata), userId, funnel]);
    return result.rows[0] || null;
  }
}

module.exports = UserState;
