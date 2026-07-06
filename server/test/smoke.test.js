const request = require('supertest');

describe('Smoke Test - Infrastructure', () => {
  it('health check responds with OK status', async () => {
    const app = require('../src/server');

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('returns 401 when accessing protected route without token', async () => {
    const app = require('../src/server');

    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Authentication required');
  });

  it('returns 401 when accessing prompts without token', async () => {
    const app = require('../src/server');

    const res = await request(app).get('/api/prompts');

    expect(res.status).toBe(401);
  });
});
