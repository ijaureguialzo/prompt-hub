const request = require('supertest');

describe('PATCH /api/auth/me (self-service profile updates)', () => {
  let app;
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

    // The first registration becomes the admin (the tests below need an
    // active admin to exist); only the regular user's token is used.
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

    const regularRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Regular', email: 'regular@test.com', password: 'password123' });

    regularToken = regularRes.body.token;
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'X' });

    expect(res.status).toBe(401);
  });

  it('updates own name and persists it', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ name: '  New Name  ' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('New Name');
    expect(res.body.user).not.toHaveProperty('password');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(me.body.user.name).toBe('New Name');
  });

  it('rejects an empty name', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  it('updates own email (normalized) and rejects duplicates', async () => {
    const ok = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ email: '  NEW@EXAMPLE.COM ' });

    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe('new@example.com');

    const clash = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ email: 'admin@test.com' });

    expect(clash.status).toBe(409);
    expect(clash.body.message).toContain('Email already registered');
    expect(clash.body.code).toBe('EMAIL_TAKEN');
  });

  it('changes own password (old password stops working)', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ currentPassword: 'password123', newPassword: 'new-password-456' });

    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('password');

    // Old password no longer logs in
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@test.com', password: 'password123' });
    expect(oldLogin.status).toBe(401);

    // New password logs in
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@test.com', password: 'new-password-456' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a password change with a wrong current password', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ currentPassword: 'wrong-current', newPassword: 'new-password-456' });

    expect(res.status).toBe(401);
  });

  it('rejects a new password shorter than 8 chars', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ currentPassword: 'password123', newPassword: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects a partial password change (missing current password)', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ newPassword: 'new-password-456' });

    expect(res.status).toBe(400);
  });
});
