const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Healer {
  static async create(data) {
    const {
      user_id,
      name,
      email,
      phone,
      experience_level,
      specialties,
      bio,
      service_area,
      price_range,
      calendar_url
    } = data;

    const id = uuidv4();
    const query = `
      INSERT INTO healers 
      (id, user_id, name, email, phone, experience_level, specialties, bio, service_area, price_range, calendar_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      user_id,
      name,
      email || null,
      phone || null,
      experience_level || 'beginner',
      JSON.stringify(specialties || []),
      bio || null,
      JSON.stringify(service_area || {}),
      JSON.stringify(price_range || {}),
      calendar_url || null
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM healers WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM healers WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async findAvailable(filters = {}) {
    let query = `
      SELECT * FROM healers
      WHERE availability_status = 'available'
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.experience) {
      query += ` AND experience_level = $${paramIndex}`;
      params.push(filters.experience);
      paramIndex++;
    }

    if (filters.specialties && filters.specialties.length > 0) {
      query += ` AND specialties @> $${paramIndex}::jsonb`;
      params.push(JSON.stringify(filters.specialties));
      paramIndex++;
    }

    if (filters.minRating) {
      query += ` AND rating >= $${paramIndex}`;
      params.push(filters.minRating);
      paramIndex++;
    }

    query += ` ORDER BY rating DESC, review_count DESC LIMIT ${filters.limit || 50}`;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async updateAvailability(id, status) {
    const query = `
      UPDATE healers
      SET availability_status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await db.query(query, [status, id]);
    return result.rows[0] || null;
  }

  static async updateRating(id, newRating, reviewCount) {
    const query = `
      UPDATE healers
      SET rating = $1, review_count = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await db.query(query, [newRating, reviewCount, id]);
    return result.rows[0] || null;
  }

  static async updateProfile(id, updates) {
    const {
      name,
      email,
      phone,
      bio,
      specialties,
      service_area,
      price_range
    } = updates;

    const query = `
      UPDATE healers
      SET 
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        bio = COALESCE($4, bio),
        specialties = COALESCE($5::jsonb, specialties),
        service_area = COALESCE($6::jsonb, service_area),
        price_range = COALESCE($7::jsonb, price_range),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `;

    const result = await db.query(query, [
      name,
      email,
      phone,
      bio,
      specialties ? JSON.stringify(specialties) : null,
      service_area ? JSON.stringify(service_area) : null,
      price_range ? JSON.stringify(price_range) : null,
      id
    ]);

    return result.rows[0] || null;
  }

  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_healers,
        COUNT(CASE WHEN availability_status = 'available' THEN 1 END) as available_healers,
        AVG(rating) as avg_rating,
        AVG(review_count) as avg_reviews
      FROM healers
    `;

    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = Healer;
