const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Transcript {
  static async create(data) {
    const id = uuidv4();
    const { videoId, text, language } = data;

    const query = `
      INSERT INTO transcripts (id, video_id, text, language, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      videoId,
      text,
      language || 'en'
    ]);

    return result.rows[0];
  }

  static async findByVideoId(videoId) {
    const query = `
      SELECT * FROM transcripts
      WHERE video_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await db.query(query, [videoId]);
    return result.rows[0] || null;
  }

  static async findByFunnel(funnel) {
    const query = `
      SELECT t.*, v.title, v.funnel
      FROM transcripts t
      JOIN videos v ON t.video_id = v.id
      WHERE v.funnel = $1
      ORDER BY t.created_at DESC
    `;

    const result = await db.query(query, [funnel]);
    return result.rows;
  }

  static async update(id, text) {
    const query = `
      UPDATE transcripts
      SET text = $1, created_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [text, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM transcripts WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async getByVideoIdAndLanguage(videoId, language = 'en') {
    const query = `
      SELECT * FROM transcripts
      WHERE video_id = $1 AND language = $2
      LIMIT 1
    `;

    const result = await db.query(query, [videoId, language]);
    return result.rows[0] || null;
  }
}

module.exports = Transcript;
