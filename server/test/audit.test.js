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

describe('GET /api/audit (admin read endpoint)', () => {
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

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('returns 403 for a non-admin user', async () => {
    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${regularToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('lists entries most-recent-first in the list envelope', async () => {
    // Two audited actions through the API (fire-and-forget writes)
    await request(app)
      .put(`/api/users/${regularId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    await sleep(50);
    await request(app)
      .put('/api/site-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationEnabled: false });
    await sleep(50);

    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
    expect(res.body.hasMore).toBe(false);
    // Both actions present, the later site-config switch first
    expect(res.body.entries.map((e) => e.action)).toEqual([
      'siteconfig.update',
      'user.role_change'
    ]);
    expect(res.body.entries[0].actorEmail).toBe('admin@audit.test');
  });

  it('sorts by createdAt desc with deterministic timestamps', async () => {
    const now = Date.now();
    await Audit.insertMany([
      {
        actorId: adminId,
        actorEmail: 'admin@audit.test',
        action: 'user.role_change',
        createdAt: new Date(now - 3_600_000)
      },
      {
        actorId: adminId,
        actorEmail: 'admin@audit.test',
        action: 'siteconfig.update',
        createdAt: new Date(now - 1_800_000)
      },
      {
        actorId: adminId,
        actorEmail: 'admin@audit.test',
        action: 'user.deactivate',
        createdAt: new Date(now - 7_200_000)
      }
    ]);

    const res = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entries.map((e) => e.action)).toEqual([
      'siteconfig.update',
      'user.role_change',
      'user.deactivate'
    ]);
  });

  it('filters by action', async () => {
    await request(app)
      .put(`/api/users/${regularId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    await sleep(50);
    await request(app)
      .put('/api/site-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationEnabled: false });
    await sleep(50);

    const res = await request(app)
      .get('/api/audit?action=user.role_change')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.entries[0].action).toBe('user.role_change');
  });

  it("filters by actorId (only that actor's entries)", async () => {
    await request(app)
      .put(`/api/users/${regularId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' });
    await sleep(50);

    const byAdmin = await request(app)
      .get(`/api/audit?actorId=${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.total).toBe(1);

    // The regular user never performed a privileged action
    const byRegular = await request(app)
      .get(`/api/audit?actorId=${regularId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byRegular.body.total).toBe(0);
  });

  it('returns 400 for a malformed actorId', async () => {
    const res = await request(app)
      .get('/api/audit?actorId=not-an-objectid')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('paginates with page/limit and hasMore', async () => {
    const now = Date.now();
    await Audit.insertMany(
      Array.from({ length: 5 }, (_, i) => ({
        actorId: adminId,
        actorEmail: 'admin@audit.test',
        action: `test.entry_${i}`,
        createdAt: new Date(now - i * 60_000)
      }))
    );

    const page1 = await request(app)
      .get('/api/audit?limit=2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page1.status).toBe(200);
    expect(page1.body.total).toBe(5);
    expect(page1.body.page).toBe(1);
    expect(page1.body.limit).toBe(2);
    expect(page1.body.entries.map((e) => e.action)).toEqual(['test.entry_0', 'test.entry_1']);
    expect(page1.body.hasMore).toBe(true);

    const page3 = await request(app)
      .get('/api/audit?limit=2&page=3')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page3.body.entries.map((e) => e.action)).toEqual(['test.entry_4']);
    expect(page3.body.hasMore).toBe(false);
  });
});
