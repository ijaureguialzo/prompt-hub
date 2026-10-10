// Global error handler middleware.
//
// Every error response carries a stable `code` (language-neutral) plus an
// English `message` fallback: the client maps the code to its own locale.
//
// Security: developer-written messages (Mongoose validators, mapped
// duplicate-key/cast errors) are safe to return. Raw error messages from
// drivers/OS are logged server-side and NOT exposed in production.
const { logger, errToMeta } = require('../utils/logger');
const KNOWN_VALIDATION_CODES = require('../utils/errorCodes');

exports.errorHandler = (err, req, res, _next) => {
  // Mongoose validation error (developer-defined messages — safe to expose)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    const specific = messages.map((m) => KNOWN_VALIDATION_CODES[m]).find(Boolean);
    return res.status(400).json({
      code: specific || 'VALIDATION_ERROR',
      message: messages.join(', ')
    });
  }

  // Mongoose duplicate key error (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ code: 'DUPLICATE', message: `${field} must be unique` });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Resource not found' });
  }

  // Anything else: log details server-side, generic client message.
  logger.error(`request failed: ${req.method} ${req.originalUrl}`, {
    requestId: req.id,
    status: err.status || 500,
    err: errToMeta(err)
  });
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    code: 'INTERNAL_ERROR',
    message: isProduction ? 'Internal Server Error' : err.message || 'Internal Server Error'
  });
};
