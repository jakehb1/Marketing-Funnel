const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Template {
  static async create(data) {
    const {
      template_type,
      name,
      content,
      funnel,
      stage,
      subject,
      variables
    } = data;

    const id = uuidv4();
    const query = `
      INSERT INTO templates 
      (id, template_type, name, content, funnel, stage, subject, variables, approval_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      template_type,
      name,
      content,
      funnel || null,
      stage || null,
      subject || null,
      JSON.stringify(variables || {}),
      'pending'
    ]);

    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM templates WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByFunnelAndStage(funnel, stage, templateType = null) {
    let query = `
      SELECT * FROM templates
      WHERE approval_status = 'approved'
      AND funnel = $1
      AND stage = $2
    `;
    const params = [funnel, stage];

    if (templateType) {
      query += ` AND template_type = $3`;
      params.push(templateType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  static async findByType(templateType) {
    const query = `
      SELECT * FROM templates
      WHERE approval_status = 'approved'
      AND template_type = $1
      ORDER BY funnel, stage, created_at DESC
    `;
    const result = await db.query(query, [templateType]);
    return result.rows;
  }

  static async findAll(filters = {}) {
    let query = 'SELECT * FROM templates WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.template_type) {
      query += ` AND template_type = $${paramIndex}`;
      params.push(filters.template_type);
      paramIndex++;
    }

    if (filters.approval_status) {
      query += ` AND approval_status = $${paramIndex}`;
      params.push(filters.approval_status);
      paramIndex++;
    }

    if (filters.funnel) {
      query += ` AND funnel = $${paramIndex}`;
      params.push(filters.funnel);
      paramIndex++;
    }

    if (filters.stage) {
      query += ` AND stage = $${paramIndex}`;
      params.push(filters.stage);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT ${filters.limit || 100}`;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async updateApprovalStatus(id, status, approvedBy, notes = null) {
    const query = `
      UPDATE templates
      SET 
        approval_status = $1,
        approved_by = $2,
        approved_at = NOW(),
        rejection_notes = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [status, approvedBy, notes, id]);
    return result.rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM templates WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  static async replaceVariables(template, variables) {
    let content = template.content;
    let subject = template.subject || '';

    if (variables && typeof variables === 'object') {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(placeholder, value);
        subject = subject.replace(placeholder, value);
      });
    }

    return {
      ...template,
      content,
      subject
    };
  }
}

module.exports = Template;
