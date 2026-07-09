// ================================================================
// ReclaimX — backend/server.js
// Main Express server entry point
// ================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

app.set('trust proxy', 1);

// ── Security middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    // Allow localhost or your specific production CLIENT_URL(s)
    const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : [];
    if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin) || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '1mb' }));

// Rate limit: 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down.' }
}));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/items', require('./routes/itemRoutes'));
app.use('/api/matches', require('./routes/matchRoutes'));
app.use('/api/config', require('./routes/configRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ReclaimX backend running ✅', time: new Date() });
});

// ── Error Handling (Must be AFTER routes) ───────────────────

// 1. Catches requests to routes that don't exist
app.use(notFoundHandler);

// 2. Global error handler (The final safety net)
app.use(errorHandler);

// ── Server Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 ReclaimX backend running on port ${PORT} [Mode: ${process.env.NODE_ENV || 'development'}]`);
});
