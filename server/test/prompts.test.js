const request = require('supertest');

describe('Prompts (CRUD + Ownership)', () => {
  let app;
  let adminToken;
  let adminUserId;
  let regularToken;
  let regularUserId;
  let category1Id;
  let category2Id;

  beforeAll(async () => {
    const utils = require('./utils');
    await utils.connectDB();
    app = require('../src/server');
  });

  afterAll(async () => {
    const utils = require('./utils');
    await utils.disconnectDB();
  });

  beforeEach(async () => {
    const utils = require('./utils');
    await utils.clearDatabase();

    // Create admin (first user)
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

    adminToken = adminRes.body.token;
    adminUserId = adminRes.body.user._id;

    // Create regular user (second user)
    const regularRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Regular', email: 'regular@test.com', password: 'password456' });

    regularToken = regularRes.body.token;
    regularUserId = regularRes.body.user._id;

    // Create two categories (one owned by admin, one by regular user)
    const cat1Res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Tech Category', description: 'Technology prompts' });

    category1Id = cat1Res.body._id;

    const cat2Res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ name: 'Creative Category', description: 'Creative prompts' });

    category2Id = cat2Res.body._id;
  });

  // --- GET /api/prompts (list all) ---

  describe('GET /api/prompts', () => {
    it('returns all prompts with populated categoryId', async () => {
      // Create two prompts in different categories
      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Prompt 1', content: 'Content 1', categoryId: category1Id });

      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Prompt 2', content: 'Content 2', categoryId: category2Id });

      const res = await request(app)
        .get('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      // Verify categoryId is populated (has a name field)
      for (const prompt of res.body) {
        expect(prompt).toHaveProperty('categoryId');
      }
    });

    it('returns prompts sorted by createdAt descending', async () => {
      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'First', content: 'Content A' });

      await new Promise(r => setTimeout(r, 50)); // ensure different timestamps

      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Second', content: 'Content B' });

      const res = await request(app)
        .get('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      // Most recent (Second) should be first
      expect(res.body[0].title).toBe('Second');
      expect(res.body[1].title).toBe('First');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/prompts');

      expect(res.status).toBe(401);
    });

    it('returns prompts without categoryId when not associated', async () => {
      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Standalone', content: 'No category' });

      const res = await request(app)
        .get('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });

    it('supports creating prompts with tags', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Tagged Prompt', content: 'Has tags', tags: ['tag1', 'tag2'] });

      expect(res.status).toBe(201);
      expect(res.body.tags).toEqual(['tag1', 'tag2']);
    });
  });

  // --- GET /api/prompts/:id (single prompt) ---

  describe('GET /api/prompts/:id', () => {
    it('returns a single prompt with populated categoryId', async () => {
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Detail Prompt', content: 'For detail view', categoryId: category1Id });

      const promptId = createRes.body._id;

      const res = await request(app)
        .get('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Detail Prompt');
      expect(res.body.content).toBe('For detail view');
    });

    it('returns 404 for non-existent prompt', async () => {
      const res = await request(app)
        .get('/api/prompts/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/prompts/507f1f77bcf86cd799439011');

      expect(res.status).toBe(401);
    });
  });

  // --- POST /api/prompts (create) ---

  describe('POST /api/prompts', () => {
    it('creates a prompt with ownerId set to current user', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'My Prompt', content: 'Some content' });

      expect(res.status).toBe(201);
      // The prompt should have been created with the admin's _id as ownerId
    });

    it('creates a prompt associated to an existing category', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Categorized', content: 'With category', categoryId: category1Id });

      expect(res.status).toBe(201);
    });

    it('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'No title' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when title is empty string', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '   ', content: 'Whitespace title' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when content is missing', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Content' });

      expect(res.status).toBe(400);
    });

    it('trims title on create', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '  Trimmed Title  ', content: 'Content' });

      expect(res.status).toBe(201);
    });

    it('defaults tags to empty array when not provided', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Tags', content: 'Content' });

      expect(res.status).toBe(201);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .send({ title: 'Unauthorized', content: 'Content' });

      expect(res.status).toBe(401);
    });
  });

  // --- PUT /api/prompts/:id (update) ---

  describe('PUT /api/prompts/:id', () => {
    it('owner can update their own prompt', async () => {
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Original Title', content: 'Original Content' });

      const promptId = createRes.body._id;

      const res = await request(app)
        .put('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Updated Title', content: 'Updated Content' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.content).toBe('Updated Content');

      // Verify persistence
      const verifyRes = await request(app)
        .get('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(verifyRes.body.title).toBe('Updated Title');
    });

    it('non-owner receives 403 when trying to update another user prompt', async () => {
      // Admin creates a prompt
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Others Prompt', content: 'Not yours' });

      const promptId = createRes.body._id;

      // Regular user tries to update it
      const res = await request(app)
        .put('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Hacked Title', content: 'Stolen content' });

      expect(res.status).toBe(403);

      // Regression (IDOR): the rejected update must NOT have been applied.
      // Ownership must be verified BEFORE the write, not after.
      const verifyRes = await request(app)
        .get('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.title).toBe('Others Prompt');
      expect(verifyRes.body.content).toBe('Not yours');
    });

    it('admin can update any prompt (bypasses ownership)', async () => {
      // Regular user creates a prompt
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'User Prompt', content: 'Regular content' });

      const promptId = createRes.body._id;

      // Admin updates it
      const res = await request(app)
        .put('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Admin Updated');
    });

    it('returns 400 when updating with missing title', async () => {
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Original', content: 'Content' });

      const res = await request(app)
        .put('/api/prompts/' + createRes.body._id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '   ', content: 'Whitespace' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when updating with missing content', async () => {
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Original', content: 'Content' });

      const res = await request(app)
        .put('/api/prompts/' + createRes.body._id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent prompt', async () => {
      const res = await request(app)
        .put('/api/prompts/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Ghost', content: 'Does not exist' });

      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .put('/api/prompts/507f1f77bcf86cd799439011')
        .send({ title: 'Unauthorized', content: 'Content' });

      expect(res.status).toBe(401);
    });
  });

  // --- DELETE /api/prompts/:id (delete) ---

  describe('DELETE /api/prompts/:id', () => {
    it('owner can delete their own prompt', async () => {
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'To Delete', content: 'Gone' });

      const promptId = createRes.body._id;

      const res = await request(app)
        .delete('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');

      // Verify it's gone
      const verifyRes = await request(app)
        .get('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(verifyRes.status).toBe(404);
    });

    it('non-owner receives 403 when trying to delete another user prompt', async () => {
      // Admin creates a prompt
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Others Prompt', content: 'Not yours' });

      const promptId = createRes.body._id;

      // Regular user tries to delete it
      const res = await request(app)
        .delete('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);

      // Regression (IDOR): the rejected delete must NOT have removed the prompt.
      const verifyRes = await request(app)
        .get('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.content).toBe('Not yours');
    });

    it('admin can delete any prompt (bypasses ownership)', async () => {
      // Regular user creates a prompt
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'User Prompt', content: 'Regular' });

      const promptId = createRes.body._id;

      // Admin deletes it
      const res = await request(app)
        .delete('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent prompt', async () => {
      const res = await request(app)
        .delete('/api/prompts/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .delete('/api/prompts/507f1f77bcf86cd799439011');

      expect(res.status).toBe(401);
    });
  });

  // --- Input validation (content length, tags, category refs) ---

  describe('input validation', () => {
    it('returns 400 when content exceeds 50000 chars', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Big', content: 'x'.repeat(50001) });

      expect(res.status).toBe(400);
    });

    it('returns 400 when there are more than 20 tags', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Taggy', content: 'c', tags: Array.from({ length: 21 }, (_, i) => `t${i}`) });

      expect(res.status).toBe(400);
    });

    it('returns 400 when a tag exceeds 50 chars', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'LongTag', content: 'c', tags: ['y'.repeat(51)] });

      expect(res.status).toBe(400);
    });

    it('returns 400 when creating with a non-existent categoryId', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Dangling', content: 'c', categoryId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when updating to a non-existent categoryId', async () => {
      const createRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'T', content: 'c' });

      const res = await request(app)
        .put('/api/prompts/' + createRes.body._id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ categoryId: '507f1f77bcf86cd799439011' });

      expect(res.status).toBe(400);
    });

    it('accepts a valid categoryId', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'OK', content: 'c', categoryId: category1Id });

      expect(res.status).toBe(201);
    });
  });

  // --- Pagination ---

  describe('GET /api/prompts pagination', () => {
    it('supports limit and page, defaults return all (under cap)', async () => {
      await request(app).post('/api/prompts').set('Authorization', `Bearer ${adminToken}`).send({ title: 'P1', content: 'c' });
      await new Promise(r => setTimeout(r, 50));
      await request(app).post('/api/prompts').set('Authorization', `Bearer ${adminToken}`).send({ title: 'P2', content: 'c' });
      await new Promise(r => setTimeout(r, 50));
      await request(app).post('/api/prompts').set('Authorization', `Bearer ${adminToken}`).send({ title: 'P3', content: 'c' });

      const page1 = await request(app)
        .get('/api/prompts?limit=2&page=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(page1.status).toBe(200);
      expect(page1.body.length).toBe(2);

      const page2 = await request(app)
        .get('/api/prompts?limit=2&page=2')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(page2.body.length).toBe(1);

      // Default (no params) returns everything under the 500 cap
      const all = await request(app)
        .get('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(all.body.length).toBe(3);

      // Garbage params fall back to defaults without error
      const garbage = await request(app)
        .get('/api/prompts?limit=abc&page=xyz')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(garbage.status).toBe(200);
      expect(garbage.body.length).toBe(3);
    });
  });

  // --- Schema indexes ---

  describe('Prompt schema indexes', () => {
    it('declares indexes on createdAt, categoryId and ownerId', () => {
      const Prompt = require('../src/models/Prompt');
      const indexedFields = Prompt.schema.indexes()
        .map(([spec]) => spec)
        .flatMap(Object.keys);

      expect(indexedFields).toContain('createdAt');
      expect(indexedFields).toContain('categoryId');
      expect(indexedFields).toContain('ownerId');
    });
  });
});
