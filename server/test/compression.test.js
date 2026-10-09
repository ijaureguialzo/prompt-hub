const request = require('supertest');

describe('Response compression', () => {
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

  it('compresses JSON responses when the client accepts gzip', async () => {
    const res = await request(app).get('/api/health').set('Accept-Encoding', 'gzip');

    expect(res.status).toBe(200);
    // The wire payload is gzip-encoded... (superagent decodes it back for us)
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.body.status).toBe('OK');
  });
});
