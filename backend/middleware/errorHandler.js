/**
 * errorHandler.js
 *
 * Global Express error handling middleware.
 *
 * WHY THIS EXISTS:
 * Without a global error handler, if any route throws an unhandled exception:
 *   1. Express returns a default error page that can include stack traces
 *      — leaking your file paths, .env variable names, and package versions.
 *   2. Unhandled promise rejections can crash the entire Node process.
 *
 * This middleware catches all errors and returns a safe, sanitised response.
 * Add it LAST in server.js, after all routes:
 *
 *   app.use(errorHandler);
 */

/**
 * Whether we're in development mode.
 * In dev, we show more detail. In prod, we hide everything sensitive.
 */
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Express 4-argument error middleware.
 * MUST have all 4 args or Express won't treat it as an error handler.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars

  // Always log the full error server-side — useful for debugging
  console.error(`[ErrorHandler] ${req.method} ${req.path}`, {
    message: err.message,
    stack: isDev ? err.stack : '(hidden in production)',
    status: err.status || err.statusCode,
  });

  // Determine status code:
  // Use the error's own status if it has one, otherwise 500
  const statusCode = err.status || err.statusCode || 500;

  // Build the response — never include stack traces in production
  const response = {
    error: err.name || 'ServerError',
    message: isDev
      ? err.message
      : 'Something went wrong. Please try again later.',
  };

  // In dev, add the stack for easier debugging
  if (isDev && err.stack) {
    response.stack = err.stack;
  }

  // Handle specific known error types
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'PayloadTooLarge',
      message: 'Request body is too large.',
    });
  }

  if (err.name === 'UnauthorizedError' || err.message?.includes('Firebase')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token.',
    });
  }

  if (err.message?.includes('not found') || statusCode === 404) {
    return res.status(404).json({
      error: 'NotFound',
      message: isDev ? err.message : 'Resource not found.',
    });
  }

  return res.status(statusCode).json(response);
}

/**
 * notFoundHandler
 * Catches requests to routes that don't exist.
 * Add this BEFORE errorHandler in server.js.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
}

module.exports = { errorHandler, notFoundHandler };