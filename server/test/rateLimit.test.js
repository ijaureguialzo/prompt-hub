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
      for (let i = 0; i < 11; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'nobody@test.com', password: 'wrongpassword' });
        lastStatus = res.status;
      }

      // The 11th attempt must be rejected by the limiter
      expect(lastStatus).toBe(429);
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
});
