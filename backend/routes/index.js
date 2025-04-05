const express = require('express');
const router = express.Router();

const authRoutes = require('./api/auth');
const eventsRoutes = require('./api/events');
const feedbackRoutes = require('./api/feedback');
const alertsRoutes = require('./api/alerts');
const analyticsRoutes = require('./api/analytics');
const integrationsRoutes = require('./api/integrations');

// Make sure all imported routes are properly initialized Express routers
router.use('/auth', authRoutes);
router.use('/events', eventsRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/alerts', alertsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/integrations', integrationsRoutes);

// Simple health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API documentation',
    endpoints: {
      auth: ['/api/auth/register', '/api/auth/login', '/api/auth/me'],
      events: ['/api/events', '/api/events/:id'],
      feedback: ['/api/feedback', '/api/feedback/:id'],
      alerts: ['/api/alerts', '/api/alerts/:id'],
      analytics: ['/api/analytics/sentiment', '/api/analytics/trends'],
      integrations: ['/api/integrations/twitter', '/api/integrations/instagram']
    }
  });
});

module.exports = router;