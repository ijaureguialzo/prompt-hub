const request = require('supertest');
const mongoose = require('mongoose');

describe('Prompts export / import (SPEC §2.2a)', () => {
  let app;
  let adminToken;
  let regularToken;
  let adminId;
  let regularId;
  let adminCatId;
  let regularCatId;

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
      .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });
    adminToken = adminRes.body.token;
    adminId = adminRes.body.user._id;

    const regularRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Regular', email: 'regular@test.com', password: 'password456' });
    regularToken = regularRes.body.token;
    regularId = regularRes.body.user._id;

    const adminCat = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Tech', description: 'Admin tech prompts' });
    adminCatId = adminCat.body._id;

    const regularCat = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ name: 'Regular Creative', description: 'Creative prompts' });
    regularCatId = regularCat.body._id;
  });

  async function createPromptAs(token, { title, content = 'c', categoryId, tags }) {
    const res = await request(app)
      .post('/api/prompts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, content, categoryId, tags });
    expect(res.status).toBe(201);
    return res.body;
  }

  // -------------------------------------------------------------------
  // GET /api/prompts/export
  // -------------------------------------------------------------------

  describe('GET /api/prompts/export', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app).get('/api/prompts/export');
      expect(res.status).toBe(401);
    });

    it('returns the ExportPayload shape with full content', async () => {
      const prompt = await createPromptAs(adminToken, {
        title: 'My prompt',
        content: 'Full content, not an excerpt'.repeat(10),
        categoryId: adminCatId,
        tags: ['a', 'b']
      });

      const res = await request(app)
        .get('/api/prompts/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.format).toBe('prompthub-export');
      expect(res.body.version).toBe(1);
      expect(res.body.exportedAt).toBeTruthy();
      expect(res.body.exporter).toEqual(
        expect.objectContaining({ id: adminId, name: 'Admin', email: 'admin@test.com' })
      );
      expect(res.body.prompts).toHaveLength(1);
      const row = res.body.prompts[0];
      expect(row.id).toBe(prompt._id);
      expect(row.clientId).toMatch(/^[0-9a-f-]{36}$/);
      expect(row.title).toBe('My prompt');
      // Full content — not the list's 200-char excerpt
      expect(row.content).toBe('Full content, not an excerpt'.repeat(10));
      expect(row.categoryId).toBe(adminCatId);
      expect(row.categoryName).toBe('Admin Tech');
      expect(row.tags).toEqual(['a', 'b']);
      expect(row.createdAt).toBeTruthy();
      expect(row.updatedAt).toBeTruthy();
    });

    it('returns only the caller own prompts (never other users prompts)', async () => {
      await createPromptAs(adminToken, { title: 'Admin only' });
      await createPromptAs(regularToken, { title: 'Regular only' });

      const res = await request(app)
        .get('/api/prompts/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.prompts.map((p) => p.title)).toEqual(['Admin only']);
    });

    it('returns an empty prompts list for a user without prompts', async () => {
      const res = await request(app)
        .get('/api/prompts/export')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(200);
      expect(res.body.prompts).toEqual([]);
    });
  });

  // -------------------------------------------------------------------
  // POST /api/prompts/import — dry run (classification)
  // -------------------------------------------------------------------

  describe('POST /api/prompts/import (dry run)', () => {
    it('returns 401 without a token', async () => {
      const res = await request(app)
        .post('/api/prompts/import')
        .send({ dryRun: true, prompts: [{ title: 'x', content: 'y' }] });
      expect(res.status).toBe(401);
    });

    it('classifies a prompt the user does not have as new', async () => {
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ dryRun: true, prompts: [{ clientId: 'uuid-1', title: 'Fresh', content: 'c' }] });

      expect(res.status).toBe(200);
      expect(res.body.dryRun).toBe(true);
      expect(res.body.summary).toEqual({ total: 1, new: 1, conflicts: 0, duplicates: 0 });
      expect(res.body.results[0].status).toBe('new');
      expect(res.body.results[0].existingId).toBeNull();
      expect(res.body.quota.exceeded).toBe(false);
    });

    it('reports per-entry category resolution against the importer\'s categories', async () => {
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          dryRun: true,
          prompts: [
            { title: 'Known category', content: 'c', categoryName: 'Regular Creative' },
            {
              title: 'Foreign category',
              content: 'c',
              categoryName: `Foreign ${Date.now()}`
            },
            { title: 'No category', content: 'c' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.results[0].categoryResolved).toBe(true);
      // A category the importer does not have: will be uncategorized on apply.
      expect(res.body.results[1].categoryResolved).toBe(false);
      // Nothing to resolve counts as resolved (no warning needed).
      expect(res.body.results[2].categoryResolved).toBe(true);
    });

    it('classifies a prompt the user already has (by clientId) as conflict', async () => {
      const mine = await createPromptAs(regularToken, { title: 'Mine' });
      await new Promise((r) => setTimeout(r, 20));
      // File version of the same prompt (newer content, same clientId)
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          dryRun: true,
          prompts: [{ clientId: mine.clientId, title: 'Mine', content: 'updated content' }]
        });

      expect(res.status).toBe(200);
      const row = res.body.results[0];
      expect(row.status).toBe('conflict');
      expect(row.existingId).toBe(mine._id);
      expect(row.existingTitle).toBe('Mine');
      expect(res.body.summary.conflicts).toBe(1);
    });

    it('does NOT match prompts that belong to another user (identity is per user)', async () => {
      // Admin owns a prompt; its export file is imported by the regular user.
      const adminPrompt = await createPromptAs(adminToken, { title: 'Admin idea' });

      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          dryRun: true,
          prompts: [
            {
              clientId: adminPrompt.clientId,
              id: adminPrompt._id, // the exporter's Mongo id — must be ignored
              title: 'Admin idea',
              content: adminPrompt.content
            }
          ]
        });

      expect(res.status).toBe(200);
      // Same clientId, same title — but in ANOTHER user's account: it is NEW
      expect(res.body.results[0].status).toBe('new');
      expect(res.body.results[0].existingId).toBeNull();
    });

    it('falls back to title matching for entries without a clientId', async () => {
      await createPromptAs(regularToken, { title: 'Legacy title' });

      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ dryRun: true, prompts: [{ title: 'legacy title', content: 'c' }] });

      expect(res.body.results[0].status).toBe('conflict');
    });

    it('treats in-file duplicates as duplicate (only the first is classified)', async () => {
      const mine = await createPromptAs(regularToken, { title: 'Dup' });
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          dryRun: true,
          prompts: [
            { clientId: mine.clientId, title: 'Dup', content: 'v1' },
            { clientId: mine.clientId, title: 'Dup', content: 'v2' }
          ]
        });

      expect(res.body.results[0].status).toBe('conflict');
      expect(res.body.results[1].status).toBe('duplicate');
      expect(res.body.summary.duplicates).toBe(1);
    });

    it('reports quota.exceeded in the dry run instead of failing', async () => {
      const original = process.env.MAX_PROMPTS_PER_USER;
      process.env.MAX_PROMPTS_PER_USER = '1';
      try {
        await createPromptAs(regularToken, { title: 'Existing' });
        const res = await request(app)
          .post('/api/prompts/import')
          .set('Authorization', `Bearer ${regularToken}`)
          .send({
            dryRun: true,
            prompts: [
              { clientId: 'a', title: 'New A', content: 'c' },
              { clientId: 'b', title: 'New B', content: 'c' }
            ]
          });

        expect(res.status).toBe(200);
        expect(res.body.quota).toEqual(
          expect.objectContaining({ used: 1, limit: 1, wouldUse: 3, exceeded: true })
        );
      } finally {
        if (original === undefined) delete process.env.MAX_PROMPTS_PER_USER;
        else process.env.MAX_PROMPTS_PER_USER = original;
      }
    });

    it('returns 400 IMPORT_INVALID for malformed payloads', async () => {
      const cases = [
        { dryRun: true }, // missing prompts
        { dryRun: true, prompts: 'nope' },
        { dryRun: true, prompts: [] },
        { dryRun: true, prompts: [{ content: 'no title' }] },
        { dryRun: true, prompts: [{ title: '   ', content: 'x' }] },
        { dryRun: true, prompts: [{ title: 'x', content: '' }] },
        { dryRun: true, prompts: [{ title: 'x'.repeat(101), content: 'x' }] },
        { dryRun: true, prompts: [{ title: 'x', content: 'x'.repeat(50001) }] },
        { dryRun: true, prompts: [{ title: 'x', content: 'y', tags: 'not-an-array' }] },
        { dryRun: true, prompts: [{ title: 'x', content: 'y', tags: Array(21).fill('t') }] },
        { dryRun: true, prompts: [{ title: 'x', content: 'y', clientId: 42 }] },
        { dryRun: true, prompts: [{ title: 'x', content: 'y' }], overwrites: 'all' }
      ];
      for (const payload of cases) {
        const res = await request(app)
          .post('/api/prompts/import')
          .set('Authorization', `Bearer ${regularToken}`)
          .send(payload);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('IMPORT_INVALID');
      }
    });

    it('returns 400 when more than MAX_IMPORT_PROMPTS entries are sent', async () => {
      const original = process.env.MAX_IMPORT_PROMPTS;
      process.env.MAX_IMPORT_PROMPTS = '2';
      try {
        const res = await request(app)
          .post('/api/prompts/import')
          .set('Authorization', `Bearer ${regularToken}`)
          .send({
            dryRun: true,
            prompts: [
              { title: 'A', content: 'c' },
              { title: 'B', content: 'c' },
              { title: 'C', content: 'c' }
            ]
          });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('IMPORT_INVALID');
      } finally {
        if (original === undefined) delete process.env.MAX_IMPORT_PROMPTS;
        else process.env.MAX_IMPORT_PROMPTS = original;
      }
    });
  });

  // -------------------------------------------------------------------
  // POST /api/prompts/import — apply
  // -------------------------------------------------------------------

  describe('POST /api/prompts/import (apply)', () => {
    it('creates new prompts owned by the importer, preserving file clientId and dates', async () => {
      const created = '2020-01-01T00:00:00.000Z';
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [
            {
              clientId: 'file-uuid-1',
              title: 'From file',
              content: 'file content',
              tags: ['x'],
              createdAt: created,
              updatedAt: created
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ created: 1, updated: 0, skipped: 0 });
      expect(res.body.results[0].status).toBe('created');

      const prompt = await mongoose.model('Prompt').findById(res.body.results[0].promptId);
      expect(prompt.ownerId.toString()).toBe(regularId);
      expect(prompt.clientId).toBe('file-uuid-1');
      expect(prompt.content).toBe('file content');
      expect(prompt.createdAt.toISOString()).toBe(created);
    });

    it('generates a fresh clientId when the file entry has none', async () => {
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ prompts: [{ title: 'No clientId', content: 'c' }] });

      expect(res.status).toBe(200);
      const prompt = await mongoose.model('Prompt').findById(res.body.results[0].promptId);
      expect(prompt.clientId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('leaves unconfirmed conflicts untouched and skips them', async () => {
      const mine = await createPromptAs(regularToken, { title: 'Keep me', content: 'original' });
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [{ clientId: mine.clientId, title: 'Keep me', content: 'file version' }]
          // no overwrites: the user did not confirm
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ created: 0, updated: 0, skipped: 1 });
      expect(res.body.results[0].reason).toBe('not-confirmed');

      const current = await mongoose.model('Prompt').findById(mine._id);
      expect(current.content).toBe('original');
    });

    it('overwrites confirmed conflicts in place (same _id, still the importers)', async () => {
      const mine = await createPromptAs(regularToken, {
        title: 'Before',
        content: 'old',
        categoryId: regularCatId
      });
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [
            {
              clientId: mine.clientId,
              title: 'After',
              content: 'new',
              tags: ['t1'],
              categoryId: adminCatId, // foreign category id: must resolve to null
              categoryName: null
            }
          ],
          overwrites: [0]
        });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ created: 0, updated: 1, skipped: 0 });
      expect(res.body.results[0].promptId).toBe(mine._id);

      const current = await mongoose.model('Prompt').findById(mine._id);
      expect(current.title).toBe('After');
      expect(current.content).toBe('new');
      expect(current.tags).toEqual(['t1']);
      expect(current.ownerId.toString()).toBe(regularId);
      // The foreign category does not belong to the importer: uncategorized.
      expect(current.categoryId).toBeNull();
    });

    it('resolves categories by name against the importer own categories', async () => {
      const mine = await createPromptAs(regularToken, { title: 'Cat', content: 'old' });
      // The file references the admin's category by its id and by the
      // importer's category by NAME (different id, same intent).
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [
            {
              clientId: mine.clientId,
              title: 'Cat',
              content: 'new',
              categoryId: adminCatId,
              categoryName: 'regular creative' // case-insensitive match
            }
          ],
          overwrites: [0]
        });

      expect(res.status).toBe(200);
      const current = await mongoose.model('Prompt').findById(mine._id);
      expect(current.categoryId.toString()).toBe(regularCatId);
    });

    it('creates uncategorized prompts for categories the importer does not have', async () => {
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [
            {
              clientId: 'c1',
              title: 'Uncat',
              content: 'c',
              categoryId: adminCatId,
              categoryName: 'Admin Tech'
            }
          ]
        });

      expect(res.status).toBe(200);
      const prompt = await mongoose.model('Prompt').findById(res.body.results[0].promptId);
      expect(prompt.categoryId).toBeNull();
    });

    it('never writes to another users prompts even if their id leaks into the file', async () => {
      const adminPrompt = await createPromptAs(adminToken, {
        title: 'Admin treasure',
        content: 'safe'
      });
      // A tampered/overlapping import by the regular user references the
      // admin prompt by clientId and tries to overwrite index 0.
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [
            {
              clientId: adminPrompt.clientId,
              title: 'Hacked',
              content: 'stolen',
              id: adminPrompt._id
            }
          ],
          overwrites: [0]
        });

      expect(res.status).toBe(200);
      // For the regular user the clientId is unknown -> created as a copy.
      expect(res.body).toMatchObject({ created: 1, updated: 0, skipped: 0 });

      const admin = await mongoose.model('Prompt').findById(adminPrompt._id);
      expect(admin.title).toBe('Admin treasure');
      expect(admin.content).toBe('safe');
      const copies = await mongoose.model('Prompt').find({ clientId: adminPrompt.clientId });
      expect(copies).toHaveLength(2);
      const regularCopy = copies.find((p) => p.ownerId.toString() === regularId);
      expect(regularCopy).toBeTruthy();
      expect(regularCopy._id.toString()).not.toBe(adminPrompt._id);
    });

    it('fails atomically with 409 when the quota would be exceeded (no partial writes)', async () => {
      const original = process.env.MAX_PROMPTS_PER_USER;
      process.env.MAX_PROMPTS_PER_USER = '1';
      try {
        await createPromptAs(regularToken, { title: 'Existing' });
        const before = await mongoose.model('Prompt').countDocuments({ ownerId: regularId });

        const res = await request(app)
          .post('/api/prompts/import')
          .set('Authorization', `Bearer ${regularToken}`)
          .send({
            prompts: [
              { clientId: 'a', title: 'New A', content: 'c' },
              { clientId: 'b', title: 'New B', content: 'c' }
            ]
          });

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('LIMIT_REACHED');
        expect(res.body.limit).toBe(1);

        // Atomic: nothing was written.
        const after = await mongoose.model('Prompt').countDocuments({ ownerId: regularId });
        expect(after).toBe(before);
      } finally {
        if (original === undefined) delete process.env.MAX_PROMPTS_PER_USER;
        else process.env.MAX_PROMPTS_PER_USER = original;
      }
    });

    it('is idempotent: re-importing the same file with all overwrites updates in place', async () => {
      const file = [
        { clientId: 'file-1', title: 'One', content: 'v1' },
        { clientId: 'file-2', title: 'Two', content: 'v2' }
      ];

      const first = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ prompts: file });
      expect(first.body.created).toBe(2);

      const second = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ prompts: file, overwrites: [0, 1] });

      expect(second.status).toBe(200);
      expect(second.body.created).toBe(0);
      expect(second.body.updated).toBe(2);
      expect(second.body.skipped).toBe(0);

      const count = await mongoose.model('Prompt').countDocuments({ ownerId: regularId });
      expect(count).toBe(2); // no duplicates
    });

    it('accepts a bare JSON array (lenient hand-made files)', async () => {
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send([{ title: 'Bare', content: 'c' }]);

      expect(res.status).toBe(200);
      expect(res.body.created).toBe(1);
    });
  });

  // -------------------------------------------------------------------
  // Request body limits (app parser 100 KB, import route 20 MB)
  // -------------------------------------------------------------------

  describe('body size limits', () => {
    it('rejects a >100kb body on the regular create route (app-level limit intact)', async () => {
      const res = await request(app)
        .post('/api/prompts')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ title: 'Big', content: 'x'.repeat(102500) });

      expect(res.status).toBe(413);
    });

    it('parses a >100kb body on the import route (route-level limit) and validates it', async () => {
      // ~120 KB body: above the app-level 100 KB limit, below the import
      // route's 20 MB limit. It must be PARSED (then rejected by content
      // validation) — a 413 here would mean the route parser is not active.
      const res = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({
          prompts: [
            { title: 'Big A', content: 'x'.repeat(60000) },
            { title: 'Big B', content: 'y'.repeat(60000) }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('IMPORT_INVALID');
      expect(res.body.message).toMatch(/content exceeds 50000/);
    });
  });

  // -------------------------------------------------------------------
  // Round trip: export -> re-import by the same user (the main workflow)
  // -------------------------------------------------------------------

  describe('round trip', () => {
    it('an export re-imported by the same user reproduces the prompts without duplicates', async () => {
      await createPromptAs(regularToken, {
        title: 'RT1',
        content: 'v1',
        categoryId: regularCatId,
        tags: ['a']
      });
      await createPromptAs(regularToken, { title: 'RT2', content: 'v2' });

      const exportRes = await request(app)
        .get('/api/prompts/export')
        .set('Authorization', `Bearer ${regularToken}`);
      expect(exportRes.status).toBe(200);
      expect(exportRes.body.prompts).toHaveLength(2);

      const importRes = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ prompts: exportRes.body.prompts, overwrites: [0, 1] });

      expect(importRes.status).toBe(200);
      expect(importRes.body.created).toBe(0);
      expect(importRes.body.updated).toBe(2);

      const count = await mongoose.model('Prompt').countDocuments({ ownerId: regularId });
      expect(count).toBe(2); // no duplicates
    });

    it('an export re-imported after deleting everything restores the prompts', async () => {
      const p1 = await createPromptAs(regularToken, { title: 'Gone1', content: 'v1' });
      const p2 = await createPromptAs(regularToken, { title: 'Gone2', content: 'v2' });
      await request(app)
        .delete(`/api/prompts/${p1._id}`)
        .set('Authorization', `Bearer ${regularToken}`);
      await request(app)
        .delete(`/api/prompts/${p2._id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      const exportRes = await request(app)
        .get('/api/prompts/export')
        .set('Authorization', `Bearer ${regularToken}`);
      expect(exportRes.body.prompts).toEqual([]);

      // The file was made earlier (before the deletes): re-importing it
      // recreates both prompts.
      const file = [
        { clientId: p1.clientId, title: 'Gone1', content: 'v1' },
        { clientId: p2.clientId, title: 'Gone2', content: 'v2' }
      ];
      const importRes = await request(app)
        .post('/api/prompts/import')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ prompts: file });

      expect(importRes.body.created).toBe(2);
      const count = await mongoose.model('Prompt').countDocuments({ ownerId: regularId });
      expect(count).toBe(2);
    });
  });

  // -------------------------------------------------------------------
  // Prompt schema: clientId
  // -------------------------------------------------------------------

  describe('Prompt schema clientId', () => {
    it('assigns a UUID clientId by default and indexes it', async () => {
      const prompt = new mongoose.model('Prompt')({ title: 'T', content: 'C', ownerId: regularId });
      expect(prompt.clientId).toMatch(/^[0-9a-f-]{36}$/);

      const indexedFields = mongoose
        .model('Prompt')
        .schema.indexes()
        .map(([spec]) => spec)
        .flatMap(Object.keys);
      expect(indexedFields).toContain('clientId');
    });
  });
});
