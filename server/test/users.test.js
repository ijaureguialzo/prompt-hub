const request = require('supertest');

describe('Users (Admin CRUD)', () => {
  let app;
  let adminToken;
  let adminUserId;
  let regularToken;
  let regularUserId;

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
  });

  // --- GET /api/users (list all) ---

  describe('GET /api/users', () => {
    it('admin sees all users without passwords', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);

      // No user should have a password field
      for (const user of res.body) {
        expect(user).not.toHaveProperty('password');
      }
    });

    it('non-admin user receives 403', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/users');

      expect(res.status).toBe(401);
    });
  });

  // --- GET /api/users/:id (single user) ---

  describe('GET /api/users/:id', () => {
    it('admin sees a single user without password', async () => {
      const res = await request(app)
        .get('/api/users/' + adminUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(adminUserId);
      expect(res.body.email).toBe('admin@test.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('non-admin user receives 403', async () => {
      const res = await request(app)
        .get('/api/users/' + adminUserId)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 404 for invalid ObjectId', async () => {
      const res = await request(app)
        .get('/api/users/invalidid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/users/' + adminUserId);

      expect(res.status).toBe(401);
    });
  });

  // --- PUT /api/users/:id (update user) ---

  describe('PUT /api/users/:id', () => {
    it('admin can change a user role from user to admin', async () => {
      const res = await request(app)
        .put('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('admin');

      // Verify the change persisted by fetching the user again
      const verifyRes = await request(app)
        .get('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.body.role).toBe('admin');
    });

    it('admin can demote another admin (two admins remain safe)', async () => {
      // Promote the regular user first, so demoting them still leaves
      // the requesting admin in place (at least one admin always survives)
      await request(app)
        .put('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      const res = await request(app)
        .put('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('user');
    });

    it('rejects an admin demoting or deactivating themselves (lockout guard)', async () => {
      const demoteRes = await request(app)
        .put('/api/users/' + adminUserId)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(demoteRes.status).toBe(400);
      expect(demoteRes.body.message).toContain('your own');
      expect(demoteRes.body.code).toBe('SELF_MODIFICATION');

      const deactivateRes = await request(app)
        .put('/api/users/' + adminUserId)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(deactivateRes.status).toBe(400);

      const deleteRes = await request(app)
        .delete('/api/users/' + adminUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(400);

      // Nothing changed: still admin and active
      const verifyRes = await request(app)
        .get('/api/users/' + adminUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.body.role).toBe('admin');
      expect(verifyRes.body.isActive).toBe(true);
    });

    it('admin can update partial fields (name, email)', async () => {
      const res = await request(app)
        .put('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
    });

    it('non-admin user receives 403', async () => {
      const res = await request(app)
        .put('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'Hacker' });

      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .put('/api/users/' + regularUserId)
        .send({ name: 'Hacker' });

      expect(res.status).toBe(401);
    });
  });

  // --- Quota overrides (per-user limits, admin-editable) ---

  describe('PUT /api/users/:id — quota overrides', () => {
    async function createPrompt(token) {
      return request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `Prompt ${Date.now()}-${Math.random()}`, content: 'c' });
    }

    it('sets promptQuota, enforces it on create, and null restores the global default', async () => {
      const set = await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promptQuota: 2 });
      expect(set.status).toBe(200);
      expect(set.body.promptQuota).toBe(2);

      // Two prompts fit the cap, the third hits it.
      expect((await createPrompt(regularToken)).status).toBe(201);
      expect((await createPrompt(regularToken)).status).toBe(201);
      const blocked = await createPrompt(regularToken);
      expect(blocked.status).toBe(409);
      expect(blocked.body).toMatchObject({ code: 'LIMIT_REACHED', limit: 2 });

      // null = back to the global default (200) — creating works again.
      const reset = await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promptQuota: null });
      expect(reset.status).toBe(200);
      expect(reset.body.promptQuota).toBeNull();
      expect((await createPrompt(regularToken)).status).toBe(201);
    });

    it('categoryQuota 0 blocks category creation with the effective limit in the error', async () => {
      await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ categoryQuota: 0 });

      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ name: 'No way' });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ code: 'LIMIT_REACHED', limit: 0 });
    });

    it('rejects invalid quota values', async () => {
      for (const bad of [-1, 100001, 'abc']) {
        const res = await request(app)
          .put(`/api/users/${regularUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ promptQuota: bad });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      }
    });

    it('refuses quota edits from non-admins', async () => {
      const res = await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ promptQuota: 1 });
      expect(res.status).toBe(403);
    });

    it('audits quota changes but not no-ops', async () => {
      const mongoose = require('mongoose');
      await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promptQuota: 7, categoryQuota: 3 });
      // give the fire-and-forget audit write a beat
      await new Promise((r) => setTimeout(r, 50));
      expect(
        await mongoose.model('Audit').countDocuments({
          actorId: adminUserId,
          action: 'user.quota_change'
        })
      ).toBe(1);

      // Setting the same values again is a no-op: no new audit entry.
      await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promptQuota: 7, categoryQuota: 3 });
      await new Promise((r) => setTimeout(r, 50));
      expect(
        await mongoose.model('Audit').countDocuments({
          actorId: adminUserId,
          action: 'user.quota_change'
        })
      ).toBe(1);
    });

    it('the categories endpoint reports the caller effective limits', async () => {
      await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promptQuota: 12, categoryQuota: 4 });

      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${regularToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        promptQuota: { limit: 12 },
        categoryQuota: { limit: 4 }
      });
    });

    it('imports are capped by the per-user prompt quota', async () => {
      await request(app)
        .put(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ promptQuota: 1 });

      const dry = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          dryRun: true,
          prompts: [
            { title: 'A', content: 'c' },
            { title: 'B', content: 'c' }
          ]
        });
      expect(dry.status).toBe(200);
      expect(dry.body.quota).toMatchObject({ limit: 1, exceeded: true });

      const apply = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [{ title: 'A', content: 'c' }, { title: 'B', content: 'c' }]
        });
      expect(apply.status).toBe(409);
      expect(apply.body).toMatchObject({ code: 'LIMIT_REACHED', limit: 1 });
    });
  });

  // --- DELETE /api/users/:id (soft delete) ---

  describe('DELETE /api/users/:id', () => {
    it('admin can soft-delete a user (sets isActive: false)', async () => {
      const res = await request(app)
        .delete('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // The response should contain the deactivated user summary
      expect(res.body).toHaveProperty('message');
      expect(res.body.code).toBeUndefined(); // success responses carry no code

      // Verify the user is now inactive in the database
      const verifyRes = await request(app)
        .get('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyRes.body.isActive).toBe(false);
    });

    it('soft-deleted user cannot login', async () => {
      // Soft delete the regular user
      await request(app)
        .delete('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to login — should be blocked
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'regular@test.com', password: 'password456' });

      expect(res.status).toBe(403);
    });

    it('soft-deleted user cannot access /api/auth/me', async () => {
      // Soft delete the regular user
      await request(app)
        .delete('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      // Try to access /me with the old token
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(401);
    });

    it('non-admin user receives 403', async () => {
      const res = await request(app)
        .delete('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).delete('/api/users/' + regularUserId);

      expect(res.status).toBe(401);
    });

    it('returns 404 for invalid ObjectId', async () => {
      const res = await request(app)
        .delete('/api/users/invalidid')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
