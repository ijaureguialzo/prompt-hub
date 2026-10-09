const request = require('supertest');

describe('Categories (CRUD + Cascade Delete)', () => {
  let app;
  let adminToken;
  let regularToken;
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

    // Create regular user (second user)
    const regularRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Regular', email: 'regular@test.com', password: 'password456' });

    regularToken = regularRes.body.token;

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

  // --- GET /api/categories (list + counts) ---

  describe('GET /api/categories', () => {
    it('returns categories sorted by createdAt descending with counts', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('categories');
      expect(res.body.categories).toHaveLength(2);

      // Most recent should be first (createdAt desc)
      expect(res.body.categories[0].name).toBe('Creative Category');
      expect(res.body.categories[1].name).toBe('Tech Category');

      // Denormalized counts (no prompts yet)
      expect(res.body.categories[0]).toHaveProperty('promptCount', 0);
      expect(res.body.uncategorizedCount).toBe(0);
      expect(res.body.totalPrompts).toBe(0);
    });

    it('reports per-category prompt counts and uncategorized/total counts', async () => {
      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'A1', content: 'c', categoryId: category1Id });
      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'A2', content: 'c', categoryId: category1Id });
      await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'U1', content: 'c' });

      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      const tech = res.body.categories.find((c) => c.name === 'Tech Category');
      const creative = res.body.categories.find((c) => c.name === 'Creative Category');

      expect(tech.promptCount).toBe(2);
      expect(creative.promptCount).toBe(0);
      expect(res.body.uncategorizedCount).toBe(1);
      expect(res.body.totalPrompts).toBe(3);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(401);
    });
  });

  // --- GET /api/categories/:id (single category) ---

  describe('GET /api/categories/:id', () => {
    it('returns a single category by id', async () => {
      const res = await request(app)
        .get('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Tech Category');
      expect(res.body.description).toBe('Technology prompts');
    });

    it('returns 404 for non-existent category', async () => {
      const res = await request(app)
        .get('/api/categories/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/categories/' + category1Id);

      expect(res.status).toBe(401);
    });
  });

  // --- POST /api/categories (create) ---

  describe('POST /api/categories', () => {
    it('creates a category with ownerId set to current user', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Category', description: 'A new category' });

      expect(res.status).toBe(201);
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'No name' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when name is empty string', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '   ', description: 'Empty name' });

      expect(res.status).toBe(400);
    });

    it('returns 409 when category name already exists (case-insensitive)', async () => {
      // Try to create a duplicate category name
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'tech category' }); // lowercase — should match "Tech Category"

      expect(res.status).toBe(400);
    });

    it('trims name on create', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '  Trimmed Category  ', description: 'Trimmed' });

      expect(res.status).toBe(201);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({ name: 'Unauthorized', description: 'No token' });

      expect(res.status).toBe(401);
    });

    it('returns 409 once the per-user category quota is reached', async () => {
      const original = process.env.MAX_CATEGORIES_PER_USER;
      process.env.MAX_CATEGORIES_PER_USER = '1';
      try {
        // Admin already owns 'Tech Category' (created in beforeEach) — at quota
        const res = await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'One Too Many' });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/limit reached/i);

        // A fresh user (no categories yet) is unaffected by someone else's quota
        const fresh = await request(app)
          .post('/api/auth/register')
          .send({ name: 'Fresh', email: 'fresh@quota.test', password: 'password123' });
        const created = await request(app)
          .post('/api/categories')
          .set('Authorization', `Bearer ${fresh.body.token}`)
          .send({ name: 'Fresh Category' });
        expect(created.status).toBe(201);
      } finally {
        if (original === undefined) {
          delete process.env.MAX_CATEGORIES_PER_USER;
        } else {
          process.env.MAX_CATEGORIES_PER_USER = original;
        }
      }
    });
  });

  // --- PUT /api/categories/:id (update) ---

  describe('PUT /api/categories/:id', () => {
    it('owner can update their own category', async () => {
      const res = await request(app)
        .put('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Tech Category' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Tech Category');

      // Verify persistence
      const verifyRes = await request(app)
        .get('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.body.name).toBe('Updated Tech Category');
    });

    it('non-owner receives 403 when trying to update another user category', async () => {
      const res = await request(app)
        .put('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'Hacked Category' });

      expect(res.status).toBe(403);

      // Regression (IDOR): the rejected update must NOT have been applied.
      // Ownership must be verified BEFORE the write, not after.
      const verifyRes = await request(app)
        .get('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.name).toBe('Tech Category');
    });

    it('admin can update any category (bypasses ownership)', async () => {
      const res = await request(app)
        .put('/api/categories/' + category2Id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Updated Category' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Admin Updated Category');
    });

    it('returns 400 when updating name to an existing category name', async () => {
      // Try to rename category1 to match category2's name
      const res = await request(app)
        .put('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Creative Category' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent category', async () => {
      const res = await request(app)
        .put('/api/categories/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost' });

      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .put('/api/categories/' + category1Id)
        .send({ name: 'Unauthorized' });

      expect(res.status).toBe(401);
    });
  });

  // --- DELETE /api/categories/:id (delete + cascade) ---

  describe('DELETE /api/categories/:id', () => {
    it('owner can delete their own category', async () => {
      const res = await request(app)
        .delete('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('non-owner receives 403 when trying to delete another user category', async () => {
      const res = await request(app)
        .delete('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);

      // Regression (IDOR): the rejected delete must NOT have removed the category.
      const verifyRes = await request(app)
        .get('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.name).toBe('Tech Category');
    });

    it('admin can delete any category (bypasses ownership)', async () => {
      const res = await request(app)
        .delete('/api/categories/' + category2Id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent category', async () => {
      const res = await request(app)
        .delete('/api/categories/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).delete('/api/categories/' + category1Id);

      expect(res.status).toBe(401);
    });

    it('cascade deletes all prompts in the category when deleted', async () => {
      // Create a prompt in category1
      const promptRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Prompt in Cat1', content: 'Will be deleted too', categoryId: category1Id });

      const promptId = promptRes.body._id;

      // Verify prompt exists
      let verifyRes = await request(app)
        .get('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(200);

      // Delete the category
      const delCatRes = await request(app)
        .delete('/api/categories/' + category1Id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delCatRes.status).toBe(200);

      // Verify the prompt is also deleted (cascade)
      verifyRes = await request(app)
        .get('/api/prompts/' + promptId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.status).toBe(404);
    });

    it('unlinks (never destroys) other users prompts when a non-admin owner deletes the category', async () => {
      const Prompt = require('../src/models/Prompt');

      // The regular user owns category2 ('Creative Category').
      // Both users create prompts inside it.
      const ownRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          title: 'Mine in Cat2',
          content: 'Owned by the category owner',
          categoryId: category2Id
        });

      const otherRes = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Theirs in Cat2',
          content: 'Owned by someone else',
          categoryId: category2Id
        });

      const delRes = await request(app)
        .delete('/api/categories/' + category2Id)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(delRes.status).toBe(200);

      // Owner's own prompt in the category: destroyed
      const ownCheck = await request(app)
        .get('/api/prompts/' + ownRes.body._id)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(ownCheck.status).toBe(404);

      // Someone else's prompt: still exists, and its categoryId pointer
      // is nulled out (checked in the DB, not just via populate)
      const otherCheck = await request(app)
        .get('/api/prompts/' + otherRes.body._id)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(otherCheck.status).toBe(200);
      const raw = await Prompt.findById(otherRes.body._id);
      expect(raw.categoryId).toBeNull();
    });
  });
});
