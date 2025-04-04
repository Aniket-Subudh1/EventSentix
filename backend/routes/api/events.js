const express = require('express');
const router = express.Router();
const eventController = require('../../controllers/eventController');
const { protect, authorize, checkEventOwnership } = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/rateLimiter');

router.use(apiLimiter);

router.use(protect);

router.get('/', eventController.getEvents);

router.post('/', eventController.createEvent);

router.get('/:eventId', checkEventOwnership({ idField: 'eventId' }), eventController.getEvent);

router.put('/:eventId', checkEventOwnership({ idField: 'eventId' }), eventController.updateEvent);

router.delete('/:eventId', checkEventOwnership({ idField: 'eventId' }), eventController.deleteEvent);

router.post('/:eventId/organizers', checkEventOwnership({ idField: 'eventId' }), eventController.addOrganizer);

router.delete('/:eventId/organizers/:organizerId', checkEventOwnership({ idField: 'eventId' }), eventController.removeOrganizer);

router.put('/:eventId/social-tracking', checkEventOwnership({ idField: 'eventId' }), eventController.updateSocialTracking);

router.put('/:eventId/alert-settings', checkEventOwnership({ idField: 'eventId' }), eventController.updateAlertSettings);

router.get('/:eventId/location-map', checkEventOwnership({ idField: 'eventId' }), eventController.getLocationMap);

router.put('/:eventId/location-map', checkEventOwnership({ idField: 'eventId' }), eventController.updateLocationMap);

router.put('/:eventId/toggle-active', checkEventOwnership({ idField: 'eventId' }), eventController.toggleEventActive);

module.exports = router;