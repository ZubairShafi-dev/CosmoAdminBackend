const express = require('express');
const cors = require('cors');

// Route imports
const authRoutes      = require('./routes/authRoutes');
const productRoutes   = require('./routes/productRoutes');
const orderRoutes     = require('./routes/orderRoutes');
const walletRoutes    = require('./routes/walletRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const adminRoutes     = require('./routes/adminRoutes');

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cosmo Orbit API is running 🚀' });
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/products',  productRoutes);
app.use('/api/orders',    orderRoutes);
app.use('/api/wallet',    walletRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/settings',  require('./routes/settingsRoutes'));
app.use('/api/rewards',   require('./routes/rewardRoutes'));
app.use('/api/admin',     adminRoutes);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
