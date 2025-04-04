const Alert = require('../../models/Alert');
const Issue = require('../../models/Issue');
const Event = require('../../models/Event');
const SentimentRecord = require('../../models/SentimentRecord');
const issueClassifier = require('../nlp/issueClassifier');
const logger = require('../../utils/logger');
const notificationService = require('./notificationService');
const socketHandler = require('../realtime/socketHandler');

/**
 * Generate alerts based on feedback
 * @param {Object} feedbackData - Feedback data
 * @returns {Promise<Array>} Generated alerts
 */
exports.generateAlerts = async (feedbackData) => {
  try {
    if (!feedbackData || !feedbackData.event) {
      logger.warn('Invalid feedback data for alert generation', { feedbackData });
      return [];
    }
    
    const generatedAlerts = [];
    
    const event = await Event.findById(feedbackData.event);
    if (!event) {
      logger.warn(`Event not found for alert generation: ${feedbackData.event}`);
      return [];
    }
    
    // Get alert thresholds from event settings or use defaults
    const sentimentThreshold = event.alertSettings?.negativeSentimentThreshold || -0.5;
    const issueThreshold = event.alertSettings?.issueAlertThreshold || 3;
    
    // Check for negative sentiment that exceeds threshold
    if (feedbackData.sentiment === 'negative' && 
        feedbackData.sentimentScore <= sentimentThreshold) {
      const issueType = feedbackData.issueType || 'other';
      const location = feedbackData.issueDetails?.location || null;
      
      logger.info(`Detected negative sentiment feedback above threshold: ${feedbackData.sentimentScore} <= ${sentimentThreshold}`, {
        feedbackId: feedbackData._id,
        issueType
      });
      
      // Look for existing issues of the same type
      const existingIssues = await Issue.find({
        event: feedbackData.event,
        type: issueType,
        location: location,
        status: { $in: ['detected', 'confirmed', 'inProgress'] }
      });
      
      if (existingIssues.length > 0) {
        // Update existing issue
        const issue = existingIssues[0];
        issue.feedback.push(feedbackData._id);
        issue.metadata.feedbackCount += 1;
        issue.metadata.lastMentionedAt = new Date();
        
        // Update sentiment average
        const oldAvg = issue.metadata.sentimentAverage || 0;
        const oldCount = issue.metadata.feedbackCount - 1;
        const newAvg = ((oldAvg * oldCount) + feedbackData.sentimentScore) / issue.metadata.feedbackCount;
        issue.metadata.sentimentAverage = newAvg;
        
        // If we've reached the feedback threshold, create an alert
        if (issue.metadata.feedbackCount >= issueThreshold && 
            !await hasActiveAlertForIssue(issue._id)) {
          logger.info(`Issue threshold reached, creating alert: ${issue.metadata.feedbackCount} >= ${issueThreshold}`, {
            issueId: issue._id,
            issueType
          });
          
          const alert = await createIssueAlert(issue, feedbackData);
          generatedAlerts.push(alert);
        }
        
        await issue.save();
      } else {
        // Create a new issue
        const severity = detectSeverity(
          feedbackData.text, 
          feedbackData.sentimentScore
        ).severity;
        
        logger.info(`Creating new issue for feedback: ${feedbackData._id}`, {
          issueType,
          severity
        });
        
        const newIssue = await Issue.create({
          event: feedbackData.event,
          type: issueType,
          title: `${issueType.charAt(0).toUpperCase() + issueType.slice(1)} issue detected`,
          description: `Issue detected from feedback: "${feedbackData.text}"`,
          location: location,
          severity: severity,
          feedback: [feedbackData._id],
          metadata: {
            feedbackCount: 1,
            firstDetectedAt: new Date(),
            lastMentionedAt: new Date(),
            keywords: feedbackData.metadata?.keywords || [],
            sentimentAverage: feedbackData.sentimentScore
          }
        });
        
        // For high or critical severity issues, always create an alert
        if (severity === 'high' || severity === 'critical') {
          logger.info(`High severity issue detected, creating immediate alert`, {
            issueId: newIssue._id,
            severity
          });
          
          const alert = await createIssueAlert(newIssue, feedbackData);
          generatedAlerts.push(alert);
        }
      }
    }
    
    // Also check for sentiment trends that might need alerts
    try {
      const trendAlert = await checkForSentimentTrendAlert(feedbackData.event);
      if (trendAlert) {
        generatedAlerts.push(trendAlert);
      }
    } catch (trendError) {
      logger.error(`Error checking for sentiment trends: ${trendError.message}`, { error: trendError });
    }
    
    return generatedAlerts;
  } catch (error) {
    logger.error(`Alert generation error: ${error.message}`, { error, feedbackData });
    return [];
  }
};

/**
 * Check if there is already an active alert for an issue
 * @param {String} issueId - Issue ID
 * @returns {Promise<Boolean>} Whether there is an active alert
 */
const hasActiveAlertForIssue = async (issueId) => {
  try {
    const alertCount = await Alert.countDocuments({
      'relatedFeedback': issueId,
      'status': { $in: ['new', 'acknowledged', 'inProgress'] }
    });
    
    return alertCount > 0;
  } catch (error) {
    logger.error(`Error checking for active alerts: ${error.message}`, { error, issueId });
    return false;
  }
};

/**
 * Create an alert for an issue
 * @param {Object} issue - Issue object
 * @param {Object} feedbackData - Latest feedback data
 * @returns {Promise<Object>} Created alert
 */
const createIssueAlert = async (issue, feedbackData) => {
  try {
    let alertSeverity = issue.severity;
    
    // Create alert
    const alert = await Alert.create({
      event: issue.event,
      type: 'issue',
      severity: alertSeverity,
      title: `${issue.type.charAt(0).toUpperCase() + issue.type.slice(1)} issue detected`,
      description: `Multiple attendees have reported issues with ${issue.type}${issue.location ? ` in ${issue.location}` : ''}. Latest feedback: "${feedbackData.text}"`,
      category: issue.type,
      location: issue.location,
      relatedFeedback: [...issue.feedback],
      metadata: {
        issueCount: issue.metadata.feedbackCount,
        sentimentAverage: issue.metadata.sentimentAverage || feedbackData.sentimentScore,
        detectionMethod: 'automatic',
        keywords: issue.metadata.keywords || [],
        autoResolveDue: new Date(Date.now() + (60 * 60 * 1000)) // 1 hour auto-resolve
      },
      statusUpdates: [{
        status: 'new',
        note: 'Alert automatically created based on negative feedback',
        timestamp: new Date()
      }]
    });
    
    // Update issue with alert reference
    issue.alerts.push(alert._id);
    await issue.save();
    
    // Send notification
    try {
      await notificationService.sendAlertNotification(alert);
    } catch (notificationError) {
      logger.error(`Error sending alert notification: ${notificationError.message}`, { error: notificationError });
    }
    
    // Broadcast via socket if io is available
    try {
      const io = global.io;
      if (io) {
        socketHandler.broadcastAlert(io, alert);
      }
    } catch (socketError) {
      logger.error(`Error broadcasting alert: ${socketError.message}`, { error: socketError });
    }
    
    logger.info(`Created issue alert: ${alert._id}`, { 
      issueId: issue._id,
      severity: alertSeverity,
      feedbackCount: issue.metadata.feedbackCount
    });
    
    return alert;
  } catch (error) {
    logger.error(`Create issue alert error: ${error.message}`, { error, issue });
    throw error;
  }
};

/**
 * Check for negative sentiment trends that warrant alerts
 * @param {String} eventId - Event ID
 * @returns {Promise<Object|null>} Created alert or null
 */
const checkForSentimentTrendAlert = async (eventId) => {
  try {
    const lastHour = new Date(Date.now() - (60 * 60 * 1000)); 
    
    // Get recent sentiment records
    const records = await SentimentRecord.find({
      event: eventId,
      timeframe: 'minute',
      timestamp: { $gte: lastHour }
    }).sort({ timestamp: -1 }).limit(30);
    
    if (records.length < 10) {
      // Not enough data points
      return null;
    }
    
    // Analyze recent sentiment trend
    let negativeCount = 0;
    let totalMessages = 0;
    let negativeTrend = false;

    // Check most recent records (last 10 minutes)
    const recentRecords = records.slice(0, 10);
    for (const record of recentRecords) {
      negativeCount += record.data.negative.count;
      totalMessages += record.data.total;
    }
    
    // Calculate negative percentage
    const negativePercentage = totalMessages > 0 ? (negativeCount / totalMessages) * 100 : 0;
    
    // Check if negative percentage is high
    if (negativePercentage >= 60 && totalMessages >= 5) {
      negativeTrend = true;
    }
    
    // Compare with older records
    const olderRecords = records.slice(10);
    let olderNegativeCount = 0;
    let olderTotalMessages = 0;
    
    for (const record of olderRecords) {
      olderNegativeCount += record.data.negative.count;
      olderTotalMessages += record.data.total;
    }
    
    const olderNegativePercentage = olderTotalMessages > 0 
      ? (olderNegativeCount / olderTotalMessages) * 100 
      : 0;
    
    // Check if negative percentage has increased significantly
    if (negativePercentage - olderNegativePercentage >= 20 && totalMessages >= 5) {
      negativeTrend = true;
    }
    
    // Create or update trend alert if negative trend detected
    if (negativeTrend) {
      // Check for existing trend alert
      const existingAlert = await Alert.findOne({
        event: eventId,
        type: 'trend',
        status: { $in: ['new', 'acknowledged', 'inProgress'] },
        createdAt: { $gte: lastHour }
      });
      
      if (existingAlert) {
        // Update existing alert
        existingAlert.description = `Negative feedback trend detected: ${negativePercentage.toFixed(1)}% of recent feedback is negative.`;
        existingAlert.metadata.sentimentAverage = negativePercentage;
        await existingAlert.save();
        
        logger.info(`Updated trend alert: ${existingAlert._id}`, {
          negativePercentage
        });
        
        return existingAlert;
      } else {
        // Create new trend alert
        const alert = await Alert.create({
          event: eventId,
          type: 'trend',
          severity: negativePercentage >= 75 ? 'high' : 'medium',
          title: 'Negative feedback trend detected',
          description: `Negative feedback trend detected: ${negativePercentage.toFixed(1)}% of recent feedback is negative.`,
          category: 'general',
          metadata: {
            sentimentAverage: negativePercentage,
            detectionMethod: 'trend',
            autoResolveDue: new Date(Date.now() + (2 * 60 * 60 * 1000)) // 2 hour auto-resolve
          },
          statusUpdates: [{
            status: 'new',
            note: 'Alert automatically created based on negative sentiment trend',
            timestamp: new Date()
          }]
        });
        
        // Send notification
        try {
          await notificationService.sendAlertNotification(alert);
        } catch (notificationError) {
          logger.error(`Error sending trend alert notification: ${notificationError.message}`, { error: notificationError });
        }
        
        // Broadcast via socket if io is available
        try {
          const io = global.io;
          if (io) {
            socketHandler.broadcastAlert(io, alert);
          }
        } catch (socketError) {
          logger.error(`Error broadcasting trend alert: ${socketError.message}`, { error: socketError });
        }
        
        logger.info(`Created trend alert: ${alert._id}`, {
          negativePercentage
        });
        
        return alert;
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Sentiment trend alert error: ${error.message}`, { error, eventId });
    return null;
  }
};

/**
 * Create a manual alert
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} Created alert
 */
exports.createManualAlert = async (alertData) => {
  try {
    // Ensure statusUpdates field exists
    if (!alertData.statusUpdates || !alertData.statusUpdates.length) {
      alertData.statusUpdates = [{
        status: alertData.status || 'new',
        note: 'Alert manually created',
        timestamp: new Date()
      }];
    }
    
    // Create alert
    const alert = await Alert.create({
      ...alertData,
      metadata: {
        ...alertData.metadata,
        detectionMethod: 'manual',
        autoResolveDue: alertData.metadata?.autoResolveDue || new Date(Date.now() + (4 * 60 * 60 * 1000)) // 4 hour auto-resolve by default
      }
    });
    
    // Send notification
    try {
      await notificationService.sendAlertNotification(alert);
    } catch (notificationError) {
      logger.error(`Error sending manual alert notification: ${notificationError.message}`, { error: notificationError });
    }
    
    // Broadcast via socket if io is available
    try {
      const io = global.io;
      if (io) {
        socketHandler.broadcastAlert(io, alert);
      }
    } catch (socketError) {
      logger.error(`Error broadcasting manual alert: ${socketError.message}`, { error: socketError });
    }
    
    logger.info(`Created manual alert: ${alert._id}`, {
      severity: alert.severity,
      type: alert.type
    });
    
    return alert;
  } catch (error) {
    logger.error(`Create manual alert error: ${error.message}`, { error, alertData });
    throw error;
  }
};

/**
 * Auto-resolve expired alerts
 * @returns {Promise<Number>} Number of alerts resolved
 */
exports.autoResolveAlerts = async () => {
  try {
    const now = new Date();

    // Find alerts that have passed their auto-resolve time
    const alerts = await Alert.find({
      status: { $in: ['new', 'acknowledged', 'inProgress'] },
      'metadata.autoResolveDue': { $lte: now }
    });
    
    if (alerts.length === 0) {
      return 0;
    }
    
    // Update alerts to resolved status
    await Alert.updateMany(
      {
        _id: { $in: alerts.map(a => a._id) }
      },
      {
        status: 'resolved',
        resolvedAt: now,
        $push: {
          statusUpdates: {
            status: 'resolved',
            note: 'Automatically resolved due to time threshold',
            timestamp: now
          }
        }
      }
    );
    
    // Broadcast updates via socket if io is available
    try {
      const io = global.io;
      if (io && alerts.length > 0) {
        for (const alert of alerts) {
          // Update the alert object to reflect the new status
          alert.status = 'resolved';
          alert.resolvedAt = now;
          alert.statusUpdates.push({
            status: 'resolved',
            note: 'Automatically resolved due to time threshold',
            timestamp: now
          });
          
          socketHandler.broadcastAlert(io, alert);
        }
        
        io.emit('alerts-auto-resolved', { count: alerts.length });
      }
    } catch (socketError) {
      logger.error(`Error broadcasting auto-resolved alerts: ${socketError.message}`, { error: socketError });
    }
    
    logger.info(`Auto-resolved ${alerts.length} expired alerts`);
    return alerts.length;
  } catch (error) {
    logger.error(`Auto-resolve alerts error: ${error.message}`, { error });
    return 0;
  }
};

/**
 * Determine issue severity based on text and sentiment score
 * @param {String} text - Feedback text
 * @param {Number} sentimentScore - Sentiment score
 * @returns {Object} Severity info
 */
const detectSeverity = (text, sentimentScore) => {
  let severity = 'low';
  
  // Adjust severity based on sentiment score
  if (sentimentScore <= -0.8) {
    severity = 'critical';
  } else if (sentimentScore <= -0.6) {
    severity = 'high';
  } else if (sentimentScore <= -0.4) {
    severity = 'medium';
  }
  
  // Look for urgent keywords that might increase severity
  const urgentKeywords = [
    'urgent', 'immediately', 'emergency', 'dangerous', 'unsafe', 
    'broken', 'not working', 'serious', 'problem', 'help',
    'terrible', 'awful', 'horrible', 'disaster'
  ];
  
  const hasUrgentKeywords = urgentKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  // Increase severity if urgent keywords found
  if (hasUrgentKeywords) {
    if (severity === 'low') {
      severity = 'medium';
    } else if (severity === 'medium') {
      severity = 'high';
    } else if (severity === 'high') {
      severity = 'critical';
    }
  }
  
  return {
    severity,
    hasUrgentKeywords
  };
};