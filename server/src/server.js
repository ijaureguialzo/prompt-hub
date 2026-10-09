require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');
const { apiLimiter } = require('./middleware/rateLimit');
const promptRoutes = require('./routes/promptRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const siteConfigRoutes = require('./routes/siteConfigRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { assertConfig } = require('./config');
const { logger, errToMeta } = require('./utils/logger');

// Fail fast: refuse to run without a valid JWT secret. As a process, exit
// with a clear message; when imported (e.g. by tests), throw so a
// half-configured app is never served.
try {
  assertConfig();
} catch (err) {
  if (require.main === module) {
    logger.fatal('invalid configuration', { err: errToMeta(err) });
    process.exit(1);
  }
  throw err;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://prompthub.test')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Request id: propagate an inbound X-Request-Id or generate one, so logs
// from the same request can be correlated.
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
});

// Security headers (CSP, nosniff, frame denial, ...)
app.use(helmet());

// We run behind exactly one reverse proxy (Traefik): trust the first
// X-Forwarded-For hop so rate limiting sees the real client IP.
app.set('trust proxy', 1);

app.use(cors({ origin: allowedOrigins }));
// No credentials: auth is a Bearer header, not cookies
app.use(express.json());
// JSON-only API: no form/urlencoded body parsing (avoids the `qs`
// dependency and its historical DoS surface)
app.use(
  compression({
    // API payloads are small; compress everything rather than a 1kb threshold
    threshold: 0
  })
);

// Loose per-IP limiter for the whole API (DoS protection).
// Strict per-endpoint limiters live on /api/auth (see routes/authRoutes.js).
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/site-config', siteConfigRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/categories', categoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;

// Only auto-connect and listen when run directly (not when imported for testing)
if (require.main === module) {
  const { flushAudits } = require('./utils/audit');

  mongoose
    .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/promptdb')
    .then(() => {
      logger.info('connected to MongoDB');
      const server = app.listen(PORT, () => {
        logger.info('server running', { port: PORT });
      });

      // Graceful shutdown: stop accepting connections, let in-flight
      // requests (and fire-and-forget audit writes) finish, then close the
      // database. Without this, `docker restart` kills requests mid-flight.
      const shutdownTimeoutMs = 10 * 1000;
      function shutdown(signal) {
        logger.info('shutting down', { signal });
        const forceExit = setTimeout(() => {
          logger.fatal('shutdown timed out, forcing exit');
          process.exit(1);
        }, shutdownTimeoutMs);
        forceExit.unref();

        server.close(async () => {
          try {
            await flushAudits();
            await mongoose.disconnect();
            logger.info('shutdown complete');
            process.exit(0);
          } catch (err) {
            logger.fatal('error during shutdown', { err: errToMeta(err) });
            process.exit(1);
          }
        });
      }

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));

      // Fail closed on unexpected faults: Docker restarts the container
      // (restart: unless-stopped) rather than limping along in a broken state.
      process.on('uncaughtException', (err) => {
        logger.fatal('uncaught exception', { err: errToMeta(err) });
        process.exit(1);
      });
      process.on('unhandledRejection', (reason) => {
        logger.fatal('unhandled promise rejection', { err: errToMeta(reason) });
        process.exit(1);
      });
    })
    .catch((err) => {
      logger.fatal('MongoDB connection error', { err: errToMeta(err) });
      process.exit(1);
    });
}
