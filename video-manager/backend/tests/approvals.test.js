const request = require('supertest');
const app = require('../server');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

describe('Approval API Tests', () => {
  let testVideoId;
  let testApprovalId;
  const charliePIN = process.env.CHARLIE_PIN || '1234';

  beforeAll(async () => {
    // Initialize database
    await db.initialize();
  });

  afterAll(async () => {
    // Clean up
    try {
      if (testApprovalId) {
        await db.query('DELETE FROM approvals WHERE id = $1', [testApprovalId]);
      }
      if (testVideoId) {
        await db.query('DELETE FROM videos WHERE id = $1', [testVideoId]);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/approvals', () => {
    it('should create an approval request', async () => {
      // First create a test video
      testVideoId = uuidv4();
      await db.query(
        'INSERT INTO videos (id, title, filename, original_name, status) VALUES ($1, $2, $3, $4, $5)',
        [testVideoId, 'Test Video', 'test.mp4', 'test.mp4', 'ready']
      );

      const response = await request(app)
        .post('/api/approvals')
        .send({
          content_id: testVideoId,
          content_type: 'video',
          submitted_by: 'test-agent'
        })
        .expect(201);

      testApprovalId = response.body.id;
      expect(response.body.status).toBe('pending');
      expect(response.body.content_type).toBe('video');
      expect(response.body.submitted_by).toBe('test-agent');
    });

    it('should reject missing content_id', async () => {
      const response = await request(app)
        .post('/api/approvals')
        .send({
          content_type: 'video',
          submitted_by: 'test'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid content_type', async () => {
      const response = await request(app)
        .post('/api/approvals')
        .send({
          content_id: uuidv4(),
          content_type: 'invalid',
          submitted_by: 'test'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/approvals', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should list approvals with valid PIN', async () => {
      const response = await request(app)
        .get('/api/approvals')
        .set('X-Charlie-PIN', charliePIN)
        .expect(200);

      expect(Array.isArray(response.body.approvals)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/approvals?status=pending')
        .set('X-Charlie-PIN', charliePIN)
        .expect(200);

      expect(Array.isArray(response.body.approvals)).toBe(true);
      response.body.approvals.forEach(approval => {
        expect(approval.status).toBe('pending');
      });
    });

    it('should filter by content_type', async () => {
      const response = await request(app)
        .get('/api/approvals?content_type=video')
        .set('X-Charlie-PIN', charliePIN)
        .expect(200);

      expect(Array.isArray(response.body.approvals)).toBe(true);
    });
  });

  describe('POST /api/approvals/:id/approve', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/approvals/${testApprovalId}/approve`)
        .send({ notes: 'Looks good' })
        .expect(401);
    });

    it('should approve content with valid PIN', async () => {
      const response = await request(app)
        .post(`/api/approvals/${testApprovalId}/approve`)
        .set('X-Charlie-PIN', charliePIN)
        .send({ notes: 'Approved by Charlie' })
        .expect(200);

      expect(response.body.status).toBe('approved');
      expect(response.body.reviewed_by).toBe('charlie');
      expect(response.body.review_date).toBeDefined();
    });

    it('should update video approval_status', async () => {
      const videoResult = await db.query('SELECT approval_status FROM videos WHERE id = $1', [testVideoId]);
      expect(videoResult.rows[0].approval_status).toBe('approved');
    });
  });

  describe('POST /api/approvals/:id/reject', () => {
    let rejectTestApprovalId;
    let rejectTestVideoId;

    beforeEach(async () => {
      // Create test data
      rejectTestVideoId = uuidv4();
      rejectTestApprovalId = uuidv4();

      await db.query(
        'INSERT INTO videos (id, title, filename, original_name, status) VALUES ($1, $2, $3, $4, $5)',
        [rejectTestVideoId, 'Reject Test Video', 'reject_test.mp4', 'reject_test.mp4', 'ready']
      );

      await db.query(
        'INSERT INTO approvals (id, content_id, content_type, submitted_by, status) VALUES ($1, $2, $3, $4, $5)',
        [rejectTestApprovalId, rejectTestVideoId, 'video', 'test-agent', 'pending']
      );
    });

    afterEach(async () => {
      // Cleanup
      try {
        await db.query('DELETE FROM approvals WHERE id = $1', [rejectTestApprovalId]);
        await db.query('DELETE FROM videos WHERE id = $1', [rejectTestVideoId]);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/approvals/${rejectTestApprovalId}/reject`)
        .send({ notes: 'Rejected' })
        .expect(401);
    });

    it('should require rejection notes', async () => {
      const response = await request(app)
        .post(`/api/approvals/${rejectTestApprovalId}/reject`)
        .set('X-Charlie-PIN', charliePIN)
        .send({ notes: '' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject content with notes', async () => {
      const response = await request(app)
        .post(`/api/approvals/${rejectTestApprovalId}/reject`)
        .set('X-Charlie-PIN', charliePIN)
        .send({ notes: 'Poor quality - needs re-editing' })
        .expect(200);

      expect(response.body.status).toBe('rejected');
      expect(response.body.reviewed_by).toBe('charlie');
      expect(response.body.notes).toBe('Poor quality - needs re-editing');
    });
  });

  describe('PUT /api/approvals/:id/notes', () => {
    let noteTestApprovalId;

    beforeEach(async () => {
      noteTestApprovalId = uuidv4();
      const videoId = uuidv4();

      await db.query(
        'INSERT INTO videos (id, title, filename, original_name, status) VALUES ($1, $2, $3, $4, $5)',
        [videoId, 'Notes Test Video', 'notes_test.mp4', 'notes_test.mp4', 'ready']
      );

      await db.query(
        'INSERT INTO approvals (id, content_id, content_type, submitted_by, status) VALUES ($1, $2, $3, $4, $5)',
        [noteTestApprovalId, videoId, 'video', 'test-agent', 'pending']
      );
    });

    afterEach(async () => {
      try {
        await db.query('DELETE FROM approval_comments WHERE approval_id = $1', [noteTestApprovalId]);
        await db.query('DELETE FROM approvals WHERE id = $1', [noteTestApprovalId]);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/approvals/${noteTestApprovalId}/notes`)
        .send({ comment_text: 'Add comment' })
        .expect(401);
    });

    it('should add comment to approval', async () => {
      const response = await request(app)
        .put(`/api/approvals/${noteTestApprovalId}/notes`)
        .set('X-Charlie-PIN', charliePIN)
        .send({ comment_text: 'This is a test comment' })
        .expect(200);

      expect(response.body.notes).toBe('This is a test comment');
    });
  });

  describe('GET /api/approvals/status/content/:id', () => {
    it('should check approval status without authentication', async () => {
      const response = await request(app)
        .get(`/api/approvals/status/content/${testVideoId}`)
        .expect(200);

      expect(response.body.id).toBe(testVideoId);
      expect(response.body.type).toBe('video');
      expect(response.body.approval_status).toBeDefined();
      expect(response.body.is_approved).toBeDefined();
    });

    it('should return 404 for non-existent content', async () => {
      const fakeId = uuidv4();
      const response = await request(app)
        .get(`/api/approvals/status/content/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('connected');
    });
  });
});
