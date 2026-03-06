// ================================================================
// ReclaimX — backend/server.js
// Main Express server entry point
// ================================================================

const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── Security middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '10mb' }));

// Rate limit: 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please slow down.' }
}));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/authRoutes'));
app.use('/api/items',   require('./routes/itemRoutes'));
app.use('/api/matches', require('./routes/matchRoutes'));
app.use('/api/config',  require('./routes/configRoutes')); // For sending Firebase config to frontend

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ReclaimX backend running ✅', time: new Date() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── MongoDB connection ────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 ReclaimX backend running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
