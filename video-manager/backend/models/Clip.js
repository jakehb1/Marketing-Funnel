const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Clip {
  static async create(data) {
    const id = uuidv4();
    const {
      videoId,
      startTime,
      endTime,
      purpose,
      filename,
      duration
    } = data;

    const query = `
      INSERT INTO clips (id, video_id, start_time, end_time, purpose, filename, duration, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      videoId,
      startTime,
      endTime,
      purpose,
      filename,
      duration
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM clips WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByVideoId(videoId) {
    const query = `
      SELECT * FROM clips
      WHERE video_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [videoId]);
    return result.rows;
  }

  static async findAll(limit = 100) {
    const query = `
      SELECT * FROM clips
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  static async update(id, data) {
    const {
      purpose,
      startTime,
      endTime
    } = data;

    const query = `
      UPDATE clips
      SET 
        purpose = COALESCE($1, purpose),
        start_time = COALESCE($2, start_time),
        end_time = COALESCE($3, end_time)
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [purpose, startTime, endTime, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM clips WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getStatsByVideoId(videoId) {
    const query = `
      SELECT 
        COUNT(*) as total_clips,
        SUM(duration) as total_duration
      FROM clips
      WHERE video_id = $1
    `;

    const result = await db.query(query, [videoId]);
    return result.rows[0];
  }
}

module.exports = Clip;
