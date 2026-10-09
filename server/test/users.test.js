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

  // --- DELETE /api/users/:id (soft delete) ---

  describe('DELETE /api/users/:id', () => {
    it('admin can soft-delete a user (sets isActive: false)', async () => {
      const res = await request(app)
        .delete('/api/users/' + regularUserId)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // The response should contain the deactivated user summary
      expect(res.body).toHaveProperty('message');

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
