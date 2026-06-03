// backend/middleware/errorHandler.js
const isDev = process.env.NODE_ENV !== 'production';

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(`[Error] ${req.method} ${req.path}`, {
    message: err.message,
    stack:   isDev ? err.stack : '(hidden)',
  });

  const status = err.status || err.statusCode || 500;

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'PayloadTooLarge', message: 'Request body too large.' });
  }
  if (err.name === 'UnauthorizedError' || err.message?.includes('Firebase')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token.' });
  }
  if (err.message?.includes('not found') || status === 404) {
    return res.status(404).json({ error: 'NotFound', message: isDev ? err.message : 'Resource not found.' });
  }

  res.status(status).json({
    error:   err.name || 'ServerError',
    message: isDev ? err.message : 'Something went wrong. Please try again later.',
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error:   'NotFound',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
}

module.exports = { errorHandler, notFoundHandler };
