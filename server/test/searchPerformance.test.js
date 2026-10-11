/**
 * Search cost measurement (PLAN.md P3/20).
 *
 * The list search is a case-insensitive substring `$regex` over
 * title/content/tags (buildListFilter); a non-anchored regex cannot use a
 * B-tree index, so the honest question is "how bad is the full scan at
 * real scale?" This test seeds ~10^4 prompts (the shared hub grows with ALL
 * users) and measures:
 *   1. the winning plan + execution time of the search filter via explain(),
 *   2. the end-to-end GET /api/prompts?q=... request time.
 *
 * The time assertions use a generous budget: this is a tripwire for order
 * of magnitude, not a latency SLO (CI machines vary).
 */
const request = require('supertest');
const mongoose = require('mongoose');

const SEED_COUNT = 10000;

describe('search full-scan measurement (PLAN.md P3/20)', () => {
  let app, token, prompts;

  beforeAll(async () => {
    const utils = require('./utils');
    await utils.connectDB();
    app = require('../src/server');
    const auth = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Perf', email: 'perf@example.com', password: 'Password123!' });
    token = auth.body.token;

    // Seed directly (bulk, no validation overhead): the perf question is
    // about the shared collection size, not about ownership.
    const owner = new mongoose.Types.ObjectId();
    const docs = Array.from({ length: SEED_COUNT }, (_, i) => ({
      title: `Prompt number ${i} about gamma testing`,
      content: `Body ${i} with the needle word needleword embedded for searches.`,
      clientId: `perf-${i}`,
      categoryId: null,
      ownerId: owner,
      tags: ['perf'],
      createdAt: new Date(Date.now() - i * 1000),
      updatedAt: new Date()
    }));
    for (let i = 0; i < docs.length; i += 1000) {
      await mongoose.connection.collection('prompts').insertMany(docs.slice(i, i + 1000));
    }
    prompts = mongoose.model('Prompt');
  }, 120000);

  afterAll(async () => {
    const utils = require('./utils');
    await utils.disconnectDB();
  });

  it('documents the plan (no usable index) and bounds its cost at 10^4 docs', async () => {
    const filter = {
      $or: [{ title: /needleword/i }, { content: /needleword/i }, { tags: /needleword/i }]
    };
    const stats = await prompts.collection.find(filter).explain('executionStats');
    const plan = stats.queryPlanner?.winningPlan;

    // Collect every stage of the winning plan tree.
    const stages = [];
    const walk = (node) => {
      if (!node) return;
      stages.push(node.stage);
      if (Array.isArray(node.inputStage)) node.inputStage.forEach(walk);
      else walk(node.inputStage);
    };
    walk(plan);

    // Documented current state: a non-anchored substring regex cannot use a
    // B-tree index, so every branch of the $or scans the collection. (If a
    // future change makes any branch use an index, update this — that is the
    // win this tripwire exists to catch.)
    expect(stages.length).toBeGreaterThan(0);
    expect(new Set(stages).has('COLLSCAN')).toBe(true);
    expect(stages.every((s) => s === 'COLLSCAN' || s === 'SUBPLAN' || s === 'FILTER')).toBe(true);

    // A full scan of 10^4 small docs must stay cheap.
    const ms = stats.executionStats?.executionTimeMillis;
    expect(ms).toBeLessThan(1000);

    console.log(
      `[perf] 10^4 prompts: search scan = ${ms} ms, docs examined = ${stats.executionStats?.totalDocsExamined}`
    );
  });

  it('bounds the end-to-end search request at 10^4 docs', async () => {
    const started = Date.now();
    const res = await request(app)
      .get('/api/prompts')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'needleword', page: 1, limit: 50 });
    const ms = Date.now() - started;

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    // Includes the two full scans (count + find) + JSON shaping.
    expect(ms).toBeLessThan(2000);
    console.log(`[perf] 10^4 prompts: GET /api/prompts?q=needleword = ${ms} ms`);
  });
});
