// server/routes/api/alerts.js
const express = require('express');
const router = express.Router();
const Alert = require('../../models/Alert');
const alertController = require('../../controllers/alertController');
const { protect, checkEventOwnership } = require('../../middleware/auth');
const { apiLimiter } = require('../../middleware/rateLimiter');

router.use(protect);
router.use(apiLimiter);

// Create SOS or regular alert
router.post('/', async (req, res) => {
  try {
    const { 
      type, userName, latitude, longitude, accuracy, message, 
      event, severity, category, title, description 
    } = req.body;

    const alertData = {
      type: type || 'sos',
      severity: severity || (type === 'sos' ? 'critical' : 'medium'),
      category: category || (type === 'sos' ? 'emergency' : 'general'),
      status: 'new', // Default status
      statusUpdates: [{
        status: 'new',
        note: type === 'sos' ? 'SOS alert created' : 'Alert manually created',
        updatedBy: req.user ? req.user.id : null,
        timestamp: new Date()
      }]
    };

    // SOS-specific fields
    if (type === 'sos') {
      if (!latitude || !longitude) {
        return res.status(400).json({ msg: 'Location coordinates are required for SOS' });
      }
      alertData.userName = userName || 'Anonymous User';
      alertData.location = { latitude, longitude, accuracy };
      alertData.message = message || 'Emergency! Need assistance!';
      alertData.title = title || 'SOS Emergency Alert';
      alertData.description = description || message || 'Emergency assistance required';
      alertData.event = event || null; // Event is optional for SOS
    } else {
      // Event-based alert fields
      if (!event) {
        return res.status(400).json({ msg: 'Event ID required for non-SOS alerts' });
      }
      alertData.event = event;
      alertData.title = title;
      alertData.description = description;

      // Authorization check for non-SOS alerts
      const eventDoc = await require('../../models/Event').findById(event);
      if (!eventDoc) {
        return res.status(404).json({ msg: 'Event not found' });
      }
      if (
        req.user.role !== 'admin' &&
        eventDoc.owner.toString() !== req.user.id &&
        !eventDoc.organizers.map(org => org.toString()).includes(req.user.id)
      ) {
        return res.status(403).json({ msg: 'Not authorized to create alerts for this event' });
      }
    }

    const alert = await Alert.create(alertData);
    const io = req.app.get('io');
    if (io) {
      io.emit('new-alert', alert);
    }

    res.json(alert);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all alerts with filtering
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== 'admin') {
      const events = await require('../../models/Event').find({
        $or: [
          { owner: req.user.id },
          { organizers: req.user.id }
        ]
      }).select('_id');
      query.event = { $in: events.map(e => e._id) };
    }
    if (req.query.type) query.type = req.query.type;
    if (req.query.event) query.event = req.query.event;
    if (req.query.status) query.status = req.query.status;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .populate('event', 'name');
    res.json(alerts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Existing controller-based routes
router.get('/alert-types', alertController.getAlertTypes);

router.get('/event/:eventId',
  checkEventOwnership({ idField: 'eventId' }),
  alertController.getEventAlerts
);

router.get('/event/:eventId/count',
  checkEventOwnership({ idField: 'eventId' }),
  alertController.getActiveAlertCount
);

router.get('/severity/:severity',
  alertController.getAlertsBySeverity
);

router.post('/resolve-multiple',
  alertController.resolveMultipleAlerts
);

// Specific alert ID routes
router.get('/:alertId',
  alertController.getAlertById
);

router.put('/:alertId/status',
  alertController.updateAlertStatus
);

router.put('/:alertId/assign',
  alertController.assignAlert
);

router.post('/:alertId/notes',
  alertController.addAlertNote
);

router.post('/',
  alertController.createAlert // This will be overridden by our custom POST above
);

// Update alert (general updates)
router.put('/:id', async (req, res) => {
  try {
    const { status, message, description, severity, category } = req.body;
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ msg: 'Alert not found' });

    // Authorization check
    if (alert.event) {
      const event = await require('../../models/Event').findById(alert.event);
      if (
        req.user.role !== 'admin' &&
        event.owner.toString() !== req.user.id &&
        !event.organizers.map(org => org.toString()).includes(req.user.id)
      ) {
        return res.status(403).json({ msg: 'Not authorized to update this alert' });
      }
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (message) updateData.message = message;
    if (description) updateData.description = description;
    if (severity) updateData.severity = severity;
    if (category) updateData.category = category;

    if (status) {
      updateData.statusUpdates = [
        ...(alert.statusUpdates || []),
        {
          status,
          note: req.body.note || `Status updated to ${status}`,
          updatedBy: req.user ? req.user.id : null,
          timestamp: new Date()
        }
      ];
    }

    const updatedAlert = await Alert.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('update-alert', updatedAlert);
    }
    res.json(updatedAlert);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Delete alert (Simplified, no admin or status restrictions)
router.delete('/:id', async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ msg: 'Alert not found' });
    }

    await alert.remove();
    const io = req.app.get('io');
    if (io) {
      io.emit('delete-alert', req.params.id);
    }
    res.json({ msg: 'Alert deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// Keep the original controller-based routes
router.put('/:alertId',
  alertController.updateAlert
);

router.delete('/:alertId',
  alertController.deleteAlert
);

module.exports = router;