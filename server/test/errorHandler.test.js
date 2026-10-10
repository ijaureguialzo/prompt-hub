const { errorHandler } = require('../src/middleware/errorHandler');

// Minimal fake req/res to unit-test the handler without an HTTP server.
function fakeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

const req = { method: 'GET', path: '/api/x', originalUrl: '/api/x' };

describe('errorHandler', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('maps Mongoose ValidationError to 400 with the joined messages', () => {
    const err = new Error('validation failed');
    err.name = 'ValidationError';
    err.errors = { a: { message: 'a is required' }, b: { message: 'b is too long' } };

    const res = fakeRes();
    errorHandler(err, req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('a is required, b is too long');
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('maps known validator messages to specific codes', () => {
    const err = new Error('validation failed');
    err.name = 'ValidationError';
    err.errors = { tags: { message: 'At most 20 tags are allowed' } };

    const res = fakeRes();
    errorHandler(err, req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('TAGS_TOO_MANY');
    expect(res.body.message).toBe('At most 20 tags are allowed');
  });

  it('maps duplicate key errors to 400 with the field name', () => {
    const err = new Error('dup');
    err.code = 11000;
    err.keyValue = { email: 'a@b.com' };

    const res = fakeRes();
    errorHandler(err, req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('email must be unique');
    expect(res.body.code).toBe('DUPLICATE');
  });

  it('maps CastError to 404 (not found, no leak)', () => {
    const err = new Error('Cast to ObjectId failed');
    err.name = 'CastError';

    const res = fakeRes();
    errorHandler(err, req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Resource not found');
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns a generic message in production (no internal details leaked)', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('MongoInternalError: collection users index email_1 ...');

    const res = fakeRes();
    errorHandler(err, req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Internal Server Error');
    expect(res.body.message).not.toContain('MongoInternalError');
    expect(res.body.code).toBe('INTERNAL_ERROR');
    expect(res.body).not.toHaveProperty('error');
  });

  it('exposes the error message outside production (dev ergonomics)', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('something exploded');

    const res = fakeRes();
    errorHandler(err, req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('something exploded');
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });
});
