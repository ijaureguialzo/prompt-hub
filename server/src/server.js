require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const promptRoutes = require('./routes/promptRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const siteConfigRoutes = require('./routes/siteConfigRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { assertConfig } = require('./config');

// Fail fast: refuse to run without a valid JWT secret. As a process, exit
// with a clear message; when imported (e.g. by tests), throw so a
// half-configured app is never served.
try {
  assertConfig();
} catch (err) {
  if (require.main === module) {
    console.error(`[config] FATAL: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://prompthub.test').split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/promptdb')
    .then(() => {
      console.log('Connected to MongoDB');
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}
