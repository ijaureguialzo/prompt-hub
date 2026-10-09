const request = require('supertest');

// The audit trail is fire-and-forget inside the handlers, so each test
// waits a beat before querying the Audit collection directly.
const Audit = require('../src/models/Audit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Audit log (admin actions)', () => {
  let app;
  let adminToken;
  let regularToken;
  let regularId;
  let adminId;

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

    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Admin', email: 'admin@audit.test', password: 'password123' });

    adminToken = adminRes.body.token;
    adminId = adminRes.body.user?._id;

    const regularRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Regular', email: 'regular@audit.test', password: 'password456' });

    regularToken = regularRes.body.token;
    regularId = regularRes.body.user?._id;
  });

  it('audits an admin role change with the from/to transition', async () => {
    const res = await request(app)
      .put(`/api/users/${regularId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    await sleep(50);

    const entry = await Audit.findOne({ action: 'user.role_change' });
    expect(entry).toBeTruthy();
    expect(entry.actorEmail).toBe('admin@audit.test');
    expect(String(entry.targetId)).toBe(String(regularId));
    expect(entry.targetEmail).toBe('regular@audit.test');
    expect(entry.details).toEqual({ from: 'user', to: 'admin' });
  });

  it('audits a deactivation and stays readable after the target is gone', async () => {
    const res = await request(app)
      .delete(`/api/users/${regularId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    await sleep(50);

    const entries = await Audit.find({ action: 'user.deactivate' });
    expect(entries.length).toBe(1);
    // Denormalized: the email survives even though the user is deactivated
    expect(entries[0].targetEmail).toBe('regular@audit.test');
    expect(String(entries[0].actorId)).toBe(String(adminId));
  });

  it('audits a site-wide registration switch', async () => {
    const res = await request(app)
      .put('/api/site-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationEnabled: false });

    expect(res.status).toBe(200);
    await sleep(50);

    const entry = await Audit.findOne({ action: 'siteconfig.update' });
    expect(entry).toBeTruthy();
    expect(entry.details.registrationEnabled).toEqual({ from: true, to: false });
  });

  it('audits a category deletion with cascade counts', async () => {
    // Regular user creates a category + a prompt in it
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ name: 'ToDelete' });
    const catId = catRes.body._id;

    await request(app)
      .post('/api/prompts')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ title: 'P1', content: 'c1', categoryId: catId });

    const res = await request(app)
      .delete(`/api/categories/${catId}`)
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(200);
    await sleep(50);

    const entry = await Audit.findOne({ action: 'category.delete' });
    expect(entry).toBeTruthy();
    expect(entry.details.destroyedPrompts).toBe(1);
  });

  it('does NOT audit benign operations (registration, plain login)', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Third', email: 'third@audit.test', password: 'password789' });
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'regular@audit.test', password: 'password456' });

    await sleep(50);
    const count = await Audit.countDocuments();
    expect(count).toBe(0);
  });
});
