const request = require('supertest');
const app = require('../server');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

describe('Agent Orchestration API', () => {
  const testAgentKey = 'test_agent_key_abc123';
  const testUserId = 'test_user_' + uuidv4();
  const testHealerId = uuidv4();

  beforeAll(async () => {
    // Initialize test agent key
    try {
      await db.query(
        `INSERT INTO agent_keys (id, agent_name, api_key, status)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), 'test-agent', testAgentKey, 'active']
      );
    } catch (e) {
      // Key may already exist
    }
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM agent_logs WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM user_states WHERE user_id = $1', [testUserId]);
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  describe('Authentication', () => {
    test('should reject requests without API key', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .query({ funnel: 'patient', stage: 'awareness' });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Missing API key');
    });

    test('should reject requests with invalid API key', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', 'invalid_key_12345')
        .query({ funnel: 'patient', stage: 'awareness' });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Invalid');
    });

    test('should accept valid API key', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.agentName).toBe('test-agent');
      expect(res.body.requestId).toBeDefined();
    });
  });

  // ============================================
  // CONTENT ACCESS TESTS
  // ============================================

  describe('Content Access - GET /api/agents/content', () => {
    beforeAll(async () => {
      // Create test content
      const assetId = uuidv4();
      await db.query(
        `INSERT INTO marketing_assets (id, asset_type, funnel, stage, name, content_text, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [assetId, 'copy', 'patient', 'awareness', 'Test Email', 'Welcome to ENNIE', 'approved']
      );
    });

    test('should return approved content for funnel/stage', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness', type: 'copy' });

      expect(res.status).toBe(200);
      expect(res.body.data.assets).toBeDefined();
      expect(res.body.data.count).toBeDefined();
    });

    test('should require funnel and stage parameters', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    test('should only return approved content', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness' });

      expect(res.status).toBe(200);
      const assets = res.body.data.assets;
      assets.forEach(asset => {
        expect(asset.approval_status || 'approved').toBe('approved');
      });
    });
  });

  describe('Content Access - GET /api/agents/transcripts', () => {
    test('should return approved transcripts', async () => {
      const res = await request(app)
        .get('/api/agents/transcripts')
        .set('x-agent-key', testAgentKey)
        .query({ approved: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data.transcripts).toBeDefined();
      expect(res.body.data.count).toBeDefined();
    });

    test('should filter by funnel', async () => {
      const res = await request(app)
        .get('/api/agents/transcripts')
        .set('x-agent-key', testAgentKey)
        .query({ approved: 'true', funnel: 'patient' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.transcripts)).toBe(true);
    });
  });

  describe('Content Access - GET /api/agents/email-templates', () => {
    beforeAll(async () => {
      // Create test template
      await db.query(
        `INSERT INTO templates (id, template_type, name, content, funnel, stage, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), 'email', 'Test Email', 'Hello {{first_name}}', 'patient', 'awareness', 'approved']
      );
    });

    test('should list approved email templates', async () => {
      const res = await request(app)
        .get('/api/agents/email-templates')
        .set('x-agent-key', testAgentKey);

      expect(res.status).toBe(200);
      expect(res.body.data.templates).toBeDefined();
      expect(Array.isArray(res.body.data.templates)).toBe(true);
    });

    test('should filter by funnel and stage', async () => {
      const res = await request(app)
        .get('/api/agents/email-templates')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness' });

      expect(res.status).toBe(200);
      expect(res.body.data.templates).toBeDefined();
    });
  });

  // ============================================
  // FUNNEL STATE MANAGEMENT TESTS
  // ============================================

  describe('Funnel State - GET /api/agents/user/:userId/state', () => {
    test('should return user states', async () => {
      const res = await request(app)
        .get(`/api/agents/user/${testUserId}/state`)
        .set('x-agent-key', testAgentKey);

      expect(res.status).toBe(200);
      expect(res.body.data.userStates).toBeDefined();
      expect(Array.isArray(res.body.data.userStates)).toBe(true);
    });
  });

  describe('Funnel State - PUT /api/agents/user/:userId/state', () => {
    test('should create new user state', async () => {
      const res = await request(app)
        .put(`/api/agents/user/${testUserId}/state`)
        .set('x-agent-key', testAgentKey)
        .send({
          funnel: 'patient',
          stage: 'awareness',
          status: 'active'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user_id).toBe(testUserId);
      expect(res.body.data.funnel).toBe('patient');
      expect(res.body.data.current_stage).toBe('awareness');
    });

    test('should update existing user state', async () => {
      const res = await request(app)
        .put(`/api/agents/user/${testUserId}/state`)
        .set('x-agent-key', testAgentKey)
        .send({
          funnel: 'patient',
          stage: 'interest',
          status: 'active'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.current_stage).toBe('interest');
    });

    test('should require funnel and stage', async () => {
      const res = await request(app)
        .put(`/api/agents/user/${testUserId}/state`)
        .set('x-agent-key', testAgentKey)
        .send({ funnel: 'patient' });

      expect(res.status).toBe(400);
    });
  });

  describe('Funnel State - POST /api/agents/user/:userId/log', () => {
    test('should log agent action', async () => {
      const res = await request(app)
        .post(`/api/agents/user/${testUserId}/log`)
        .set('x-agent-key', testAgentKey)
        .send({
          action: 'sent_email',
          action_type: 'email',
          result: 'success',
          details: { template_id: 'tpl_123' }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.action).toBe('sent_email');
      expect(res.body.data.action_type).toBe('email');
    });

    test('should require action and action_type', async () => {
      const res = await request(app)
        .post(`/api/agents/user/${testUserId}/log`)
        .set('x-agent-key', testAgentKey)
        .send({ action: 'sent_email' });

      expect(res.status).toBe(400);
    });
  });

  describe('Funnel State - GET /api/agents/funnel/:funnel/stats', () => {
    test('should return funnel statistics', async () => {
      const res = await request(app)
        .get('/api/agents/funnel/patient/stats')
        .set('x-agent-key', testAgentKey);

      expect(res.status).toBe(200);
      expect(res.body.data.funnel).toBe('patient');
      expect(res.body.data.stages).toBeDefined();
      expect(res.body.data.daily_conversions).toBeDefined();
    });
  });

  // ============================================
  // EMAIL/SMS SENDING TESTS
  // ============================================

  describe('Email/SMS - POST /api/agents/send-email', () => {
    let templateId;

    beforeAll(async () => {
      // Create approved template
      templateId = uuidv4();
      await db.query(
        `INSERT INTO templates (id, template_type, name, content, subject, funnel, stage, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [templateId, 'email', 'Welcome', 'Hello {{name}}', 'Welcome to ENNIE', 'patient', 'awareness', 'approved']
      );
    });

    test('should send email from approved template', async () => {
      const res = await request(app)
        .post('/api/agents/send-email')
        .set('x-agent-key', testAgentKey)
        .send({
          user_id: testUserId,
          email_address: 'test@example.com',
          template_id: templateId,
          variables: { name: 'John' }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('sent');
      expect(res.body.data.email_address).toBe('test@example.com');
    });

    test('should require user_id, email_address, template_id', async () => {
      const res = await request(app)
        .post('/api/agents/send-email')
        .set('x-agent-key', testAgentKey)
        .send({
          user_id: testUserId,
          email_address: 'test@example.com'
        });

      expect(res.status).toBe(400);
    });

    test('should reject unapproved template', async () => {
      const unapprovedId = uuidv4();
      await db.query(
        `INSERT INTO templates (id, template_type, name, content, approval_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [unapprovedId, 'email', 'Unapproved', 'Test', 'pending']
      );

      const res = await request(app)
        .post('/api/agents/send-email')
        .set('x-agent-key', testAgentKey)
        .send({
          user_id: testUserId,
          email_address: 'test@example.com',
          template_id: unapprovedId
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not approved');
    });
  });

  describe('Email/SMS - POST /api/agents/send-sms', () => {
    let smsTemplateId;

    beforeAll(async () => {
      smsTemplateId = uuidv4();
      await db.query(
        `INSERT INTO templates (id, template_type, name, content, approval_status)
         VALUES ($1, $2, $3, $4, $5)`,
        [smsTemplateId, 'sms', 'SMS Welcome', 'Hello {{name}}', 'approved']
      );
    });

    test('should send SMS from approved template', async () => {
      const res = await request(app)
        .post('/api/agents/send-sms')
        .set('x-agent-key', testAgentKey)
        .send({
          user_id: testUserId,
          phone_number: '+1-555-0123',
          template_id: smsTemplateId,
          variables: { name: 'John' }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('sent');
    });
  });

  // ============================================
  // MATCHING TESTS
  // ============================================

  describe('Matching - POST /api/agents/match', () => {
    beforeAll(async () => {
      // Create test healer
      await db.query(
        `INSERT INTO healers (id, user_id, name, experience_level, specialties, availability_status, rating)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [testHealerId, 'healer_user_123', 'Sarah Chen', 'expert', JSON.stringify(['reiki']), 'available', 4.8]
      );
    });

    test('should match patient with healer', async () => {
      const res = await request(app)
        .post('/api/agents/match')
        .set('x-agent-key', testAgentKey)
        .send({
          patient_id: testUserId,
          healer_filters: { experience: 'expert' }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.match).toBeDefined();
      expect(res.body.data.healer).toBeDefined();
      expect(res.body.data.match.status).toBe('pending');
    });

    test('should require patient_id', async () => {
      const res = await request(app)
        .post('/api/agents/match')
        .set('x-agent-key', testAgentKey)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Matching - GET /api/agents/healers', () => {
    test('should query healers', async () => {
      const res = await request(app)
        .get('/api/agents/healers')
        .set('x-agent-key', testAgentKey)
        .query({ experience: 'expert', availability: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.data.healers).toBeDefined();
      expect(Array.isArray(res.body.data.healers)).toBe(true);
    });

    test('should filter by specialties', async () => {
      const res = await request(app)
        .get('/api/agents/healers')
        .set('x-agent-key', testAgentKey)
        .query({ specialties: 'reiki' });

      expect(res.status).toBe(200);
      expect(res.body.data.healers).toBeDefined();
    });
  });

  describe('Matching - GET /api/agents/healers/:id/availability', () => {
    test('should check healer availability', async () => {
      const res = await request(app)
        .get(`/api/agents/healers/${testHealerId}/availability`)
        .set('x-agent-key', testAgentKey);

      expect(res.status).toBe(200);
      expect(res.body.data.healer_id).toBe(testHealerId.toString());
      expect(res.body.data.status).toBeDefined();
    });
  });

  describe('Matching - PUT /api/agents/healers/:id/availability', () => {
    test('should update healer availability', async () => {
      const res = await request(app)
        .put(`/api/agents/healers/${testHealerId}/availability`)
        .set('x-agent-key', testAgentKey)
        .send({ status: 'busy' });

      expect(res.status).toBe(200);
      expect(res.body.data.availability_status).toBe('busy');
    });
  });

  // ============================================
  // METRICS TESTS
  // ============================================

  describe('Metrics - GET /api/agents/metrics', () => {
    test('should return agent metrics', async () => {
      const res = await request(app)
        .get('/api/agents/metrics')
        .set('x-agent-key', testAgentKey)
        .query({ days: 7 });

      expect(res.status).toBe(200);
      expect(res.body.data.metrics).toBeDefined();
      expect(Array.isArray(res.body.data.metrics)).toBe(true);
    });
  });

  describe('Metrics - GET /api/agents/conversion-rate', () => {
    test('should return conversion rates', async () => {
      const res = await request(app)
        .get('/api/agents/conversion-rate')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient' });

      expect(res.status).toBe(200);
      expect(res.body.data.conversion_rates).toBeDefined();
    });
  });

  // ============================================
  // RESPONSE FORMAT TESTS
  // ============================================

  describe('Response Format', () => {
    test('should include required fields in success response', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness' });

      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('requestId');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('agentName');
      expect(res.body).toHaveProperty('action');
    });

    test('should include error message on failure', async () => {
      const res = await request(app)
        .get('/api/agents/content')
        .query({ funnel: 'patient' });

      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('error');
      expect(res.body).toHaveProperty('error');
    });

    test('should generate unique requestId for each request', async () => {
      const res1 = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness' });

      const res2 = await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness' });

      expect(res1.body.requestId).not.toBe(res2.body.requestId);
    });
  });

  // ============================================
  // AUDIT LOGGING TESTS
  // ============================================

  describe('Audit Logging', () => {
    test('should log all agent actions', async () => {
      await request(app)
        .get('/api/agents/content')
        .set('x-agent-key', testAgentKey)
        .query({ funnel: 'patient', stage: 'awareness' });

      const result = await db.query(
        `SELECT * FROM agent_logs WHERE action = 'get_content' ORDER BY created_at DESC LIMIT 1`
      );

      expect(result.rows.length).toBeGreaterThan(0);
      const log = result.rows[0];
      expect(log.agent_name).toBe('test-agent');
      expect(log.action).toBe('get_content');
      expect(log.result).toBe('success');
    });

    test('should include request context in logs', async () => {
      const requestId = 'test_req_' + uuidv4();

      await request(app)
        .post(`/api/agents/user/${testUserId}/log`)
        .set('x-agent-key', testAgentKey)
        .send({
          action: 'test_action',
          action_type: 'other',
          result: 'success'
        });

      const result = await db.query(
        `SELECT * FROM agent_logs WHERE action = 'test_action' ORDER BY created_at DESC LIMIT 1`
      );

      expect(result.rows[0].request_id).toBeDefined();
      expect(result.rows[0].user_id).toBe(testUserId);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integrated Workflows', () => {
    const workflowUserId = 'workflow_user_' + uuidv4();

    test('should complete awareness → interest workflow', async () => {
      // 1. Create user in awareness
      let res = await request(app)
        .put(`/api/agents/user/${workflowUserId}/state`)
        .set('x-agent-key', testAgentKey)
        .send({
          funnel: 'patient',
          stage: 'awareness',
          status: 'active'
        });
      expect(res.status).toBe(200);

      // 2. Update to interest
      res = await request(app)
        .put(`/api/agents/user/${workflowUserId}/state`)
        .set('x-agent-key', testAgentKey)
        .send({
          funnel: 'patient',
          stage: 'interest',
          status: 'active'
        });
      expect(res.status).toBe(200);
      expect(res.body.data.current_stage).toBe('interest');

      // 3. Verify state persisted
      res = await request(app)
        .get(`/api/agents/user/${workflowUserId}/state`)
        .set('x-agent-key', testAgentKey);

      const state = res.body.data.userStates.find(s => s.funnel === 'patient');
      expect(state.current_stage).toBe('interest');
    });
  });
});
