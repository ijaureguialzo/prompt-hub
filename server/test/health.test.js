const request = require('supertest');
const mongoose = require('mongoose');

describe('Health Check', () => {
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

  it('returns 200 with OK status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('returns ISO timestamp format', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('responds without authentication', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
  });

  it('reports the database state (readiness)', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body.db).toBe('connected');
  });

  it('answers 503 DEGRADED while the database is disconnected', async () => {
    await mongoose.disconnect();
    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ status: 'DEGRADED', db: 'disconnected' });
    } finally {
      // Restore the connection for any later test in this file
      await require('./utils').connectDB();
    }
  });
});
