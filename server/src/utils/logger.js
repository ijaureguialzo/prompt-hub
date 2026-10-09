// Minimal structured logger: one JSON object per line on stdout/stderr.
// Docker captures stdout as JSON log lines, and this app's log volume is
// low enough that a full-featured logger (pino) would be overkill.
//
// Usage:
//   logger.info('server started', { port });
//   logger.error('request failed', { err: errToMeta(error), requestId: req.id });

function emit(level, msg, meta) {
  const line = { level, msg, time: new Date().toISOString() };
  if (meta) Object.assign(line, meta);
  const out = level === 'error' || level === 'fatal' ? console.error : console.log;
  out(JSON.stringify(line));
}

const logger = {
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta),
  fatal: (msg, meta) => emit('fatal', msg, meta)
};

/**
 * Condense an Error (or anything thrown) into a loggable meta object.
 * The stack is included outside production to keep prod lines small.
 */
function errToMeta(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    ...(process.env.NODE_ENV !== 'production' ? { stack: error?.stack } : {})
  };
}

module.exports = { logger, errToMeta };
