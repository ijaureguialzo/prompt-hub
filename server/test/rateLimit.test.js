const request = require('supertest');

describe('Rate limiting', () => {
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

  it('returns 429 after exceeding the login limit (production mode)', async () => {
    // Re-enable the limiters (they are skipped when NODE_ENV === 'test')
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      // Default login limit is 10 per 15 min per IP
      let lastStatus;
      let lastBody;
      for (let i = 0; i < 11; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'nobody@test.com', password: 'wrongpassword' });
        lastStatus = res.status;
        lastBody = res.body;
      }

      // The 11th attempt must be rejected by the limiter
      expect(lastStatus).toBe(429);
      expect(lastBody.code).toBe('RATE_LIMITED');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('still serves other endpoints while login is limited', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('returns 429 after exceeding the per-IP write limit on content creation (production mode)', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      // Quota defaults (200 prompts / 50 categories) are above the write
      // limit (20/15min), so the limiter — not the quota — must trip first.
      const register = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Writer', email: 'writer@test.com', password: 'password123' });
      const token = register.body.token;

      let lastStatus;
      for (let i = 0; i < 21; i++) {
        const res = await request(app)
          .post('/api/prompts')
          .set('Authorization', `Bearer ${token}`)
          .send({ title: `Post ${i}`, content: 'c' });
        lastStatus = res.status;
        if (res.status === 429) break;
      }

      // The 21st creation attempt must be rejected by the write limiter
      expect(lastStatus).toBe(429);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
