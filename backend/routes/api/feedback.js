const express = require('express');
const router = express.Router();
const feedbackController = require('../../controllers/feedbackController');
const { protect, checkEventOwnership } = require('../../middleware/auth');
const { apiLimiter, feedbackLimiter } = require('../../middleware/rateLimiter');


router.post('/submit', feedbackLimiter, feedbackController.submitFeedback);

router.post('/webhook/twitter', feedbackController.twitterWebhook);
router.post('/webhook/instagram', feedbackController.instagramWebhook);
router.post('/webhook/linkedin', feedbackController.linkedinWebhook);

router.use(protect);

router.use(apiLimiter);

router.get('/event/:eventId', 
  checkEventOwnership({ idField: 'eventId' }),
  feedbackController.getEventFeedback
);

router.get('/event/:eventId/stats',
  checkEventOwnership({ idField: 'eventId' }),
  feedbackController.getEventFeedbackStats
);

router.get('/event/:eventId/sentiment',
  checkEventOwnership({ idField: 'eventId' }),
  feedbackController.getSentimentBreakdown
);

router.get('/event/:eventId/issues',
  checkEventOwnership({ idField: 'eventId' }),
  feedbackController.getIssueBreakdown
);

router.get('/event/:eventId/by-source',
  checkEventOwnership({ idField: 'eventId' }),
  feedbackController.getFeedbackBySource
);

router.get('/:feedbackId',
  feedbackController.getFeedbackById
);

router.put('/:feedbackId',
  feedbackController.updateFeedback
);

router.delete('/:feedbackId',
  feedbackController.deleteFeedback
);

router.post('/batch-process',
  feedbackController.batchProcessFeedback
);

module.exports = router;