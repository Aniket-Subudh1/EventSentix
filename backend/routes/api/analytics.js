const express = require('express');
const router = express.Router();
const analyticsController = require('../../controllers/analyticsController');
const { protect, checkEventOwnership } = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/rateLimiter');

router.use(protect);

router.use(apiLimiter);

router.get('/sentiment/trend/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getSentimentTrend
);

router.get('/sentiment/overview/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getSentimentOverview
);

router.get('/issues/trend/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getIssueTrend
);

router.get('/sources/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getSourceDistribution
);

router.get('/trending/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getTrendingTopics
);

router.get('/location/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getLocationHeatmap
);

router.get('/alerts/history/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getAlertHistory
);

router.get('/summary/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getEventSummary
);

router.get('/dashboard/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getDashboardData
);

router.get('/volume/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getFeedbackVolume
);

router.get('/resolution/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getResolutionStats
);

router.get('/export/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.exportAnalyticsData
);

router.get('/wordcloud/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  analyticsController.getWordCloudData
);

module.exports = router;