const request = require('supertest');

describe('Site Config (Public + Admin)', () => {
  let app;
  let adminToken;
  let regularToken;

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
  });

  // --- GET /api/site-config/public (public route) ---

  describe('GET /api/site-config/public', () => {
    it('returns registrationEnabled without authentication', async () => {
      const res = await request(app).get('/api/site-config/public');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('registrationEnabled', true);
    });

    it('creates site config on first access (upsert-on-miss)', async () => {
      // Fresh DB — no site config exists yet. The public route should create it.
      const res = await request(app).get('/api/site-config/public');

      expect(res.status).toBe(200);
      // The response should have registrationEnabled: true (default)
    });

    it('returns 401 for authenticated routes without token', async () => {
      const res = await request(app).get('/api/site-config');

      expect(res.status).toBe(401);
    });
  });

  // --- GET /api/site-config (admin only) ---

  describe('GET /api/site-config', () => {
    it('admin can get site config (upsert-on-first-access)', async () => {
      const res = await request(app)
        .get('/api/site-config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('registrationEnabled');
    });

    it('non-admin user receives 403', async () => {
      const res = await request(app)
        .get('/api/site-config')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/site-config');

      expect(res.status).toBe(401);
    });
  });

  // --- PUT /api/site-config (admin only) ---

  describe('PUT /api/site-config', () => {
    it('admin can update registrationEnabled to false', async () => {
      const res = await request(app)
        .put('/api/site-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ registrationEnabled: false });

      expect(res.status).toBe(200);
      expect(res.body.registrationEnabled).toBe(false);

      // Verify the change persists — public route should reflect it
      const publicRes = await request(app).get('/api/site-config/public');

      expect(publicRes.body.registrationEnabled).toBe(false);
    });

    it('admin can update registrationEnabled back to true', async () => {
      // First disable
      await request(app)
        .put('/api/site-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ registrationEnabled: false });

      // Then re-enable
      const res = await request(app)
        .put('/api/site-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ registrationEnabled: true });

      expect(res.status).toBe(200);
      expect(res.body.registrationEnabled).toBe(true);

      // Verify public route reflects the change
      const publicRes = await request(app).get('/api/site-config/public');

      expect(publicRes.body.registrationEnabled).toBe(true);
    });

    it('non-admin user receives 403', async () => {
      const res = await request(app)
        .put('/api/site-config')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ registrationEnabled: false });

      expect(res.status).toBe(403);
    });

    it('returns 401 without token', async () => {
      const res = await request(app)
        .put('/api/site-config')
        .send({ registrationEnabled: false });

      expect(res.status).toBe(401);
    });
  });
});
