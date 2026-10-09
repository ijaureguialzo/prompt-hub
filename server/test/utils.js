require('dotenv').config({ path: '.env.test' });

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

let mongoServer;

/**
 * Start an in-memory MongoDB instance and connect mongoose.
 * Returns the connection string.
 */
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return mongoose.connection.toString();

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);
  return uri;
}

/**
 * Drop all collections and close the mongoose connection.
 * mongodb-memory-server creates a fresh instance per run, so we just disconnect.
 */
async function disconnectDB() {
  if (mongoose.connection.readyState) {
    const collections = mongoose.connection.collections;
    for (const name in collections) {
      try {
        await collections[name].deleteMany({});
      } catch (_) {
        /* ignore */
      }
    }
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Clear all collections without dropping databases.
 * Faster than disconnect/reconnect for per-test cleanup.
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const name in collections) {
    await collections[name].deleteMany({});
  }
}

/**
 * Create a test user via the API and return { token, user }.
 * This registers the FIRST user, so they become admin.
 */
async function seedTestUser(extraFields = {}) {
  const app = require('../src/server');

  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      ...extraFields
    });

  const { token, user } = response.body;
  return { token, user };
}

/**
 * Create a second (non-admin) test user via the API.
 * Must be called after at least one admin exists.
 */
async function seedRegularUser(extraFields = {}) {
  const app = require('../src/server');

  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Regular User',
      email: 'regular@example.com',
      password: 'password456',
      ...extraFields
    });

  const { token, user } = response.body;
  return { token, user };
}

/**
 * Build an authenticated request helper bound to the express app.
 * Returns a supertest agent with Authorization header set.
 */
function authRequest(app, token) {
  return request(app).set('Authorization', `Bearer ${token}`);
}

module.exports = {
  connectDB,
  disconnectDB,
  clearDatabase,
  seedTestUser,
  seedRegularUser,
  authRequest
};
