const Alert = require('../../models/Alert');
const socketHandler = require('./socketHandler');
const notificationService = require('../alert/notificationService');
const logger = require('../../utils/logger');


exports.broadcastAlert = async (io, alert) => {
  try {
    socketHandler.broadcastAlert(io, alert);
    
    logger.info(`Broadcasted alert: ${alert._id}`);
    return true;
  } catch (error) {
    logger.error(`Broadcast alert error: ${error.message}`, { error, alertId: alert._id });
    return false;
  }
};

exports.broadcastAlertUpdate = async (io, alertId, status, updateData = {}) => {
  try {
    const alert = await Alert.findById(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }
    
    alert.status = status;
    
    alert.statusUpdates.push({
      status,
      note: updateData.note || '',
      updatedBy: updateData.userId,
      timestamp: new Date()
    });
    
    if (status === 'resolved' && !alert.resolvedAt) {
      alert.resolvedAt = new Date();
    }
    
    if (updateData.assignedTo) {
      alert.assignedTo = updateData.assignedTo;
    }
    
    await alert.save();
    
    socketHandler.broadcastAlert(io, alert);
    
    logger.info(`Broadcasted alert update: ${alertId} to ${status}`);
    return alert;
  } catch (error) {
    logger.error(`Broadcast alert update error: ${error.message}`, { error, alertId });
    throw error;
  }
};

exports.sendEventDigests = async () => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    
    const alerts = await Alert.find({
      createdAt: { $gte: lastHour }
    }).distinct('event');
    
    let digestCount = 0;
    for (const eventId of alerts) {
      try {
        await notificationService.sendAlertDigest(eventId);
        digestCount++;
      } catch (error) {
        logger.error(`Send digest error for event ${eventId}: ${error.message}`, { error });
      }
    }
    
    logger.info(`Sent ${digestCount} event digests`);
    return digestCount;
  } catch (error) {
    logger.error(`Send event digests error: ${error.message}`, { error });
    return 0;
  }
};

exports.setupPeriodicDigests = (intervalMinutes = 60) => {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const timer = setInterval(async () => {
    try {
      await this.sendEventDigests();
    } catch (error) {
      logger.error(`Periodic digest error: ${error.message}`, { error });
    }
  }, intervalMs);
  
  logger.info(`Setup periodic alert digests every ${intervalMinutes} minutes`);
  
  return timer;
};


exports.processAutoResolveAlerts = async (io) => {
  try {
    const resolvedCount = await require('../alert/alertGenerator').autoResolveAlerts();
    
    if (resolvedCount > 0) {
      io.emit('alerts-auto-resolved', { count: resolvedCount });
    }
    
    return resolvedCount;
  } catch (error) {
    logger.error(`Auto-resolve alerts error: ${error.message}`, { error });
    return 0;
  }
};

exports.setupAutoResolveProcessor = (io, intervalMinutes = 10) => {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  const timer = setInterval(async () => {
    try {
      await this.processAutoResolveAlerts(io);
    } catch (error) {
      logger.error(`Auto-resolve processor error: ${error.message}`, { error });
    }
  }, intervalMs);
  
  logger.info(`Setup auto-resolve processor every ${intervalMinutes} minutes`);
  
  return timer;
};