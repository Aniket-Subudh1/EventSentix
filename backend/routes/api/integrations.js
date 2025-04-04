const express = require('express');
const router = express.Router();
const integrationController = require('../../controllers/integrationController');
const { protect, checkEventOwnership } = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/rateLimiter');

router.use(protect);

router.use(apiLimiter);

router.post('/twitter/connect',
  integrationController.connectTwitter
);

router.delete('/twitter/disconnect',
  integrationController.disconnectTwitter
);

router.get('/twitter/status',
  integrationController.getTwitterStatus
);

router.post('/twitter/stream/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  integrationController.startTwitterStream
);

router.delete('/twitter/stream/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  integrationController.stopTwitterStream
);

router.post('/instagram/connect',
  integrationController.connectInstagram
);

router.delete('/instagram/disconnect',
  integrationController.disconnectInstagram
);

router.get('/instagram/status',
  integrationController.getInstagramStatus
);

router.post('/instagram/hashtags/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  integrationController.configureInstagramHashtags
);

router.post('/linkedin/connect',
  integrationController.connectLinkedIn
);

router.delete('/linkedin/disconnect',
  integrationController.disconnectLinkedIn
);

router.get('/linkedin/status',
  integrationController.getLinkedInStatus
);

router.post('/linkedin/company/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  integrationController.configureLinkedInCompany
);

router.get('/settings/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  integrationController.getIntegrationSettings
);

router.put('/settings/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  integrationController.updateIntegrationSettings
);

router.post('/test/:platform',
  integrationController.testIntegration
);

module.exports = router;