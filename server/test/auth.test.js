const request = require('supertest');
const User = require('../src/models/User');

describe('Auth', () => {
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

  beforeEach(async () => {
    const utils = require('./utils');
    await utils.clearDatabase();
  });

  // --- register() ---

  describe('POST /api/auth/register', () => {
    it('creates first user as admin and returns token + user without password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.name).toBe('Admin');
      expect(res.body.user.email).toBe('admin@test.com');
      expect(res.body.user.role).toBe('admin');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('creates subsequent users as regular user', async () => {
      // Create admin first
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

      // Create second user
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'User', email: 'user@test.com', password: 'password456' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('user');
    });

    it('promotes exactly one admin when first registrations are concurrent', async () => {
      // Regression (TOCTOU): two registrations racing on an empty database
      // must NOT both become admin. The unique sparse adminSlot index
      // arbitrates the claim atomically, regardless of interleaving.
      const [resA, resB] = await Promise.all([
        request(app)
          .post('/api/auth/register')
          .send({ name: 'First A', email: 'a@test.com', password: 'password123' }),
        request(app)
          .post('/api/auth/register')
          .send({ name: 'First B', email: 'b@test.com', password: 'password123' })
      ]);

      expect({
        a: { status: resA.status, role: resA.body?.user?.role },
        b: { status: resB.status, role: resB.body?.user?.role }
      }).toEqual({
        a: expect.objectContaining({ status: 201 }),
        b: expect.objectContaining({ status: 201 })
      });

      const roles = [resA.body.user.role, resB.body.user.role].sort();
      expect(roles).toEqual(['admin', 'user']);

      // The internal claim token is never exposed
      expect(resA.body.user).not.toHaveProperty('adminSlot');
      expect(resB.body.user).not.toHaveProperty('adminSlot');
    });

    it('lowercases and trims email on register', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: '  TEST@EXAMPLE.COM  ', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('trims name on register', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: '  Trimmed Name  ', email: 'trimmed@test.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.name).toBe('Trimmed Name');
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'missing@test.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Missing Email', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Missing Pass', email: 'missing@test.com' });

      expect(res.status).toBe(400);
    });

    it('returns 409 when email already registered', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'First', email: 'dup@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Second', email: 'dup@test.com', password: 'password456' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Email already registered');
      expect(res.body.code).toBe('EMAIL_TAKEN');
    });

    it('returns 403 when registration is disabled', async () => {
      // Create admin first to enable registration flow
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

      // Disable registration
      await request(app)
        .put('/api/site-config')
        .set('Authorization', `Bearer ${require('../src/middleware/auth').authenticate ? '' : ''}`)
        .send({ registrationEnabled: false });

      // We need to test this via the API — let's use a direct token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      const adminToken = loginRes.body.token;

      // Disable registration via admin
      await request(app)
        .put('/api/site-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ registrationEnabled: false });

      // Try to register — should be blocked
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Blocked', email: 'blocked@test.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Registration is currently disabled');
      expect(res.body.code).toBe('REGISTRATION_DISABLED');
    });
  });

  // --- login() ---

  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials and returns token + user', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'User', email: 'login@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('login@test.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('lowercases email on login', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'User', email: 'UPPER@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'upper@test.com', password: 'password123' });

      expect(res.status).toBe(200);
    });

    it('returns 401 when email does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('uses the same generic message for unknown email and wrong password (no enumeration)', async () => {
      // An attacker must not be able to tell which emails are registered:
      // both failure paths return the identical message (and, since the
      // unknown-email path compares against a dummy bcrypt hash, similar
      // response times).
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'User', email: 'known@test.com', password: 'password123' });

      const unknown = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.com', password: 'password123' });

      const wrong = await request(app)
        .post('/api/auth/login')
        .send({ email: 'known@test.com', password: 'definitely-wrong' });

      expect(unknown.status).toBe(401);
      expect(wrong.status).toBe(401);
      expect(unknown.body.message).toBe(wrong.body.message);
      expect(unknown.body.message).toBe('Invalid credentials');
      expect(unknown.body.code).toBe('INVALID_CREDENTIALS');
      expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 when password is wrong', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'User', email: 'wrongpass@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrongpass@test.com', password: 'WRONG' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('blocks login for deactivated (inactive) users', async () => {
      // Two users: first is admin, second is the deactivation target
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

      const targetRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Deactivated', email: 'inactive@test.com', password: 'password123' });

      // Admin (not the target — self-deactivation is now refused) deactivates the user
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      const deactivateRes = await request(app)
        .put('/api/users/' + targetRes.body.user._id)
        .set('Authorization', `Bearer ${adminLogin.body.token}`)
        .send({ isActive: false });

      expect(deactivateRes.status).toBe(200);

      // Try to login — should be blocked
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inactive@test.com', password: 'password123' });

      expect(res.status).toBe(403);
    });
  });

  // --- login lockout (per-account brute-force protection, PLAN.md P1/7) ---

  describe('login lockout (per-account brute-force protection)', () => {
    async function register(email) {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'U', email, password: 'password123' });
    }

    it('locks the account for 15 min after 5 failures in the window', async () => {
      await register('lock@test.com');

      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'lock@test.com', password: 'wrong-pass' });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
      }

      const fifth = await request(app)
        .post('/api/auth/login')
        .send({ email: 'lock@test.com', password: 'wrong-pass' });
      expect(fifth.status).toBe(401);
      expect(fifth.body.code).toBe('ACCOUNT_LOCKED');

      // While locked, even the correct password is refused
      const locked = await request(app)
        .post('/api/auth/login')
        .send({ email: 'lock@test.com', password: 'password123' });
      expect(locked.status).toBe(401);
      expect(locked.body.code).toBe('ACCOUNT_LOCKED');

      const user = await User.findOne({ email: 'lock@test.com' });
      expect(user.loginFails).toBe(5);
      expect(user.lockUntil).toBeInstanceOf(Date);
      expect(user.lockUntil - new Date()).toBeGreaterThan(0);
      expect(user.lockUntil - user.loginFailsAt).toBe(15 * 60 * 1000);
    });

    it('unlocks after expiry: a successful login clears the failure state', async () => {
      await register('unlock@test.com');
      // Simulate an expired lock left by earlier failures
      await User.updateOne(
        { email: 'unlock@test.com' },
        {
          lockUntil: new Date(Date.now() - 1000),
          loginFails: 5,
          loginFailsAt: new Date()
        }
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unlock@test.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();

      const user = await User.findOne({ email: 'unlock@test.com' });
      expect(user.loginFails).toBe(0);
      expect(user.lockUntil).toBeFalsy();
    });

    it('resets the failure counter when the 15-min window has passed', async () => {
      await register('window@test.com');
      // 4 failures, but the last one is 20 min ago (outside the window)
      await User.updateOne(
        { email: 'window@test.com' },
        { loginFails: 4, loginFailsAt: new Date(Date.now() - 20 * 60 * 1000) }
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'window@test.com', password: 'wrong' });
      expect(res.body.code).toBe('INVALID_CREDENTIALS'); // reset to 1, no lock

      const user = await User.findOne({ email: 'window@test.com' });
      expect(user.loginFails).toBe(1);
      expect(user.lockUntil).toBeFalsy();
    });

    it('a successful login after failures clears the counter', async () => {
      await register('clear@test.com');
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'clear@test.com', password: 'nope' });
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'clear@test.com', password: 'nope' });

      const ok = await request(app)
        .post('/api/auth/login')
        .send({ email: 'clear@test.com', password: 'password123' });
      expect(ok.status).toBe(200);

      const user = await User.findOne({ email: 'clear@test.com' });
      expect(user.loginFails).toBe(0);
      expect(user.lockUntil).toBeFalsy();
    });

    it('never creates or locks an account for unknown emails', async () => {
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'ghost@test.com', password: 'wrong-pass' });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe('INVALID_CREDENTIALS');
      }
      expect(await User.findOne({ email: 'ghost@test.com' })).toBeNull();
    });

    it('does not expose the internal failure state in API output', async () => {
      await register('hidden@test.com');
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'hidden@test.com', password: 'nope' });

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'hidden@test.com', password: 'password123' });
      expect(login.status).toBe(200);
      expect(login.body.user.loginFails).toBeUndefined();
      expect(login.body.user.loginFailsAt).toBeUndefined();
      expect(login.body.user.lockUntil).toBeUndefined();
    });
  });

  // --- getCurrentUser() ---

  describe('GET /api/auth/me', () => {
    it('returns current user info with valid token', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Me', email: 'me@test.com', password: 'password123' });

      const token = registerRes.body.token;
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Me');
      expect(res.body.user.email).toBe('me@test.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('returns 401 with expired token', async () => {
      const jwt = require('jsonwebtoken');

      // Create an expired token
      const expiredToken = jwt.sign(
        { id: 'some-id', email: 'old@test.com', role: 'user' },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: '-1h' } // expired 1 hour ago
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('returns 401 for deactivated user with valid token', async () => {
      // Two users: first (admin) deactivates the second
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Admin', email: 'admin@test.com', password: 'password123' });

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Deactivated', email: 'deact@test.com', password: 'password123' });

      const token = registerRes.body.token;
      const userId = registerRes.body.user._id;

      // Deactivate via admin API (admin, not the target)
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      await request(app)
        .put('/api/users/' + userId)
        .set('Authorization', `Bearer ${adminLogin.body.token}`)
        .send({ isActive: false });

      // Try to access /me with the old (now invalid) token
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });
});
