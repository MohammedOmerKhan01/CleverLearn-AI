require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { testConnection } = require('./config/db');
const { initDb } = require('./config/initDb');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const subjectsRoutes = require('./modules/subjects/subjects.routes');
const videosRoutes = require('./modules/videos/videos.routes');
const progressRoutes = require('./modules/progress/progress.routes');
const aiRoutes = require('./modules/ai/ai.routes');

// Subject-scoped video routes
const videosController = require('./modules/videos/videos.controller');
const { authenticate } = require('./middleware/auth');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests' } }));

// Parsing
app.use(express.json());
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/subjects/:subjectId/first-video', authenticate, videosController.getFirstVideo);
app.use('/api/videos', videosRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/ai', aiRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 4000;

async function start() {
  await testConnection();
  await initDb();
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

start();
