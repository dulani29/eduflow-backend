const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const discussionRoutes = require('./routes/discussionRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const tutorRoutes = require('./routes/tutorRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/discussions', discussionRoutes);
app.use('/api/v1/assessments', assessmentRoutes);
app.use('/api/v1/tutors', tutorRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'EduFlow API is running' });
});

// Root URL handler so the browser doesn't show "Cannot GET /"
app.get('/', (req, res) => {
  res.send('<h1>Welcome to the EduFlow API</h1><p>The backend is running perfectly! Mobile app should connect to /api/v1</p>');
});

// Error handler
app.use(errorHandler);

module.exports = app;