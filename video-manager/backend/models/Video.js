const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Video {
  static async create(data) {
    const id = uuidv4();
    const {
      title,
      filename,
      funnel,
      duration,
      size,
      originalName
    } = data;

    const query = `
      INSERT INTO videos (id, title, filename, original_name, funnel, status, duration, size, uploaded_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      title,
      filename,
      originalName,
      funnel || 'general',
      'uploading',
      duration || null,
      size
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT v.*, 
        COALESCE(t.text, '') as transcript_text,
        COALESCE(t.language, '') as transcript_language
      FROM videos v
      LEFT JOIN transcripts t ON v.id = t.video_id
      WHERE v.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM videos WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.funnel) {
      query += ` AND funnel = $${paramCount}`;
      params.push(filters.funnel);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (title ILIKE $${paramCount} OR original_name ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ' ORDER BY uploaded_at DESC LIMIT 100';

    const result = await db.query(query, params);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query = `
      UPDATE videos
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }

  static async updateMetadata(id, metadata) {
    const {
      title,
      funnel,
      duration,
      size
    } = metadata;

    const query = `
      UPDATE videos
      SET 
        title = COALESCE($1, title),
        funnel = COALESCE($2, funnel),
        duration = COALESCE($3, duration),
        size = COALESCE($4, size),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await db.query(query, [title, funnel, duration, size, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM videos WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_videos,
        COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_videos,
        COUNT(CASE WHEN status = 'transcribing' THEN 1 END) as transcribing_videos,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as error_videos,
        SUM(size) as total_size,
        SUM(duration) as total_duration
      FROM videos
    `;

    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = Video;
