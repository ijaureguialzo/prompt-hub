// Global error handler middleware.
//
// Security: developer-written messages (Mongoose validators, mapped
// duplicate-key/cast errors) are safe to return. Raw error messages from
// drivers/OS are logged server-side and NOT exposed in production.
exports.errorHandler = (err, req, res, next) => {
  // Mongoose validation error (developer-defined messages — safe to expose)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Mongoose duplicate key error (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} must be unique` });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  // Anything else: log details server-side, generic client message.
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    message: isProduction ? 'Internal Server Error' : err.message || 'Internal Server Error'
  });
};
