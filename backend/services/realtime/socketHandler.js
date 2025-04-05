const Event = require('../../models/Event');
const Feedback = require('../../models/Feedback');
const Alert = require('../../models/Alert');
const sentimentAnalyzer = require('../nlp/sentimentAnalyzer');
const alertGenerator = require('../alert/alertGenerator');
const logger = require('../../utils/logger');

// Map to track connected clients by event
const connectedClients = new Map();

/**
 * Set up event handlers for a socket connection
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket connection
 */
exports.setupEventHandlers = (io, socket) => {
  // Handle joining an event room
  socket.on('join-event', async (data) => {
    try {
      const { eventId, userId } = data;
      if (!eventId) {
        return socket.emit('error', { message: 'Event ID is required' });
      }
      
      const event = await Event.findById(eventId);
      if (!event) {
        return socket.emit('error', { message: 'Event not found' });
      }
      
      // Join the event room
      socket.join(`event:${eventId}`);
      
      // Track connected clients for this event
      if (!connectedClients.has(eventId)) {
        connectedClients.set(eventId, new Set());
      }
      connectedClients.get(eventId).add(socket.id);
      
      // Confirm joining
      socket.emit('joined-event', {
        eventId,
        active: event.isActive,
        name: event.name
      });
      
      logger.info(`Socket ${socket.id} joined event: ${eventId}`, { userId, eventId });
      
      // Notify about connection count
      io.to(`event:${eventId}`).emit('connection-count', {
        count: connectedClients.get(eventId).size
      });
    } catch (error) {
      logger.error(`Join event error: ${error.message}`, { error, socketId: socket.id });
      socket.emit('error', { message: 'Failed to join event' });
    }
  });
  
  // Handle leaving an event room
  socket.on('leave-event', (data) => {
    try {
      const { eventId } = data;
      if (!eventId) {
        return socket.emit('error', { message: 'Event ID is required' });
      }
      socket.leave(`event:${eventId}`);
      if (connectedClients.has(eventId)) {
        connectedClients.get(eventId).delete(socket.id);
        io.to(`event:${eventId}`).emit('connection-count', {
          count: connectedClients.get(eventId).size
        });
      }
      socket.emit('left-event', { eventId });
      logger.info(`Socket ${socket.id} left event: ${eventId}`);
    } catch (error) {
      logger.error(`Leave event error: ${error.message}`, { error, socketId: socket.id });
      socket.emit('error', { message: 'Failed to leave event' });
    }
  });
  
  socket.on('submit-feedback', async (data) => {
    try {
      const { eventId, text, source = 'app_chat', location, userId, user } = data;
      if (!eventId || !text) {
        return socket.emit('error', { message: 'Event ID and feedback text are required' });
      }
  
      // Ensure sourceId is generated if not provided
      const sourceId = data.sourceId || `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  
      const feedbackData = {
        event: eventId,
        source,
        text,
        sourceId, // use the generated sourceId
        user: typeof user === 'string' && user.trim() ? user.trim() : 'Anonymous',
        userId,
        issueDetails: { location },
        metadata: {
          platform: source
        }
      };
  
      const processedFeedback = await sentimentAnalyzer.processFeedback(feedbackData);
      // Ensure the processed feedback retains the user field
      if (!processedFeedback.user) {
        processedFeedback.user = feedbackData.user;
      }
      const feedback = await Feedback.create(processedFeedback);
  
      // Emit to all clients in the event room
      io.to(`event:${eventId}`).emit('new-feedback', feedback);
  
      // Generate and broadcast alerts if any
      const alerts = await alertGenerator.generateAlerts(feedback);
      if (alerts?.length) {
        io.to(`event:${eventId}`).emit('new-alerts', alerts);
        alerts.forEach(alert => {
          io.to(`alerts:${eventId}`).emit('new-alert', alert);
        });
      }
  
      // Confirm receipt to the sender
      socket.emit('feedback-received', { success: true, feedbackId: feedback._id });
      logger.info(`Feedback submitted via socket: ${feedback._id}`, { eventId, source });
    } catch (error) {
      logger.error(`Submit feedback error: ${error.message}`, { error, socketId: socket.id });
      socket.emit('error', { message: 'Failed to submit feedback' });
    }
  });
  
  
  // Handle subscribing to alerts for an event
  socket.on('subscribe-alerts', async (data) => {
    try {
      const { eventId } = data;
      if (!eventId) {
        return socket.emit('error', { message: 'Event ID is required' });
      }
      socket.join(`alerts:${eventId}`);
      socket.emit('subscribed-alerts', { eventId });
      logger.info(`Socket ${socket.id} subscribed to alerts for event: ${eventId}`);
    } catch (error) {
      logger.error(`Subscribe alerts error: ${error.message}`, { error, socketId: socket.id });
      socket.emit('error', { message: 'Failed to subscribe to alerts' });
    }
  });
  
  // Handle alert status updates via socket
  socket.on('update-alert', async (data) => {
    try {
      const { alertId, status, note, userId } = data;
      if (!alertId || !status) {
        return socket.emit('error', { message: 'Alert ID and status are required' });
      }
      const alert = await Alert.findById(alertId);
      if (!alert) {
        return socket.emit('error', { message: 'Alert not found' });
      }
      alert.status = status;
      alert.statusUpdates.push({
        status,
        note: note || '',
        updatedBy: userId,
        timestamp: new Date()
      });
      if (status === 'resolved' && !alert.resolvedAt) {
        alert.resolvedAt = new Date();
      }
      await alert.save();
      io.to(`alerts:${alert.event}`).emit('alert-updated', alert);
      socket.emit('alert-update-confirmed', { success: true, alertId: alert._id, status });
      logger.info(`Alert ${alertId} status updated to ${status}`, { userId });
    } catch (error) {
      logger.error(`Update alert error: ${error.message}`, { error, socketId: socket.id });
      socket.emit('error', { message: 'Failed to update alert' });
    }
  });
  
  // Handle socket disconnection
  socket.on('disconnect', () => {
    handleSocketDisconnect(io, socket);
  });
};

/**
 * Handle socket disconnection
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Socket connection
 */
const handleSocketDisconnect = (io, socket) => {
  try {
    for (const [eventId, clients] of connectedClients.entries()) {
      if (clients.has(socket.id)) {
        clients.delete(socket.id);
        io.to(`event:${eventId}`).emit('connection-count', {
          count: clients.size
        });
      }
    }
    logger.info(`Socket disconnected: ${socket.id}`);
  } catch (error) {
    logger.error(`Socket disconnect error: ${error.message}`, { error, socketId: socket.id });
  }
};

/**
 * Broadcast feedback to clients
 * @param {Object} io - Socket.io instance
 * @param {Object} feedback - Feedback data
 */
exports.broadcastFeedback = (io, feedback) => {
  try {
    if (!feedback || !feedback.event) return;
    io.to(`event:${feedback.event}`).emit('new-feedback', feedback);
    logger.debug(`Broadcasted feedback: ${feedback._id}`);
  } catch (error) {
    logger.error(`Broadcast feedback error: ${error.message}`, { error, feedbackId: feedback._id });
  }
};

/**
 * Broadcast alert to clients
 * @param {Object} io - Socket.io instance
 * @param {Object} alert - Alert data
 */
exports.broadcastAlert = (io, alert) => {
  try {
    if (!alert || !alert.event) return;
    io.to(`alerts:${alert.event}`).emit('new-alert', alert);
    io.to(`event:${alert.event}`).emit('new-alert', alert);
    logger.debug(`Broadcasted alert: ${alert._id}`);
  } catch (error) {
    logger.error(`Broadcast alert error: ${error.message}`, { error, alertId: alert._id });
  }
};

/**
 * Get connection count for an event
 * @param {string} eventId - Event ID
 * @returns {number} Connection count
 */
exports.getConnectionCount = (eventId) => {
  return connectedClients.has(eventId) ? connectedClients.get(eventId).size : 0;
};
