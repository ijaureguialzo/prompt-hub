const request = require('supertest');

describe('Integration Smoke - MongoDB + Auth', () => {
  let app;

  beforeAll(async () => {
    const utils = require('./utils');
    await utils.connectDB();
    app = require('../src/server');
  });

  afterAll(async () => {
    const utils = require('./utils');
    await utils.disconnectDB();
  });

  it('registers first user as admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('registers second user as regular user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'User', email: 'user@test.com', password: 'password456' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
  });

  it('rejects duplicate email on register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'admin@test.com', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects login with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('gets current user with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });

    const token = loginRes.body.token;
    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('admin@test.com');
  });

  it('public site config returns registrationEnabled', async () => {
    const res = await request(app).get('/api/site-config/public');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('registrationEnabled', true);
  });
});
