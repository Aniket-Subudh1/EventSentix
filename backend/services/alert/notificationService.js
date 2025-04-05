const User = require('../../models/User');
const Event = require('../../models/Event');
const Alert = require('../../models/Alert');
const sendEmail = require('../../utils/sendEmail');
const logger = require('../../utils/logger');

const initTwilioClient = () => {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      return twilio;
    } catch (error) {
      logger.error(`Twilio initialization error: ${error.message}`, { error });
      return null;
    }
  }
  
  // Return a mock client for development environments without Twilio credentials
  if (process.env.NODE_ENV === 'development') {
    logger.info('No Twilio credentials found. Using mock Twilio client.');
    return {
      messages: {
        create: async (messageData) => {
          logger.info(`[MOCK SMS] To: ${messageData.to}, Body: ${messageData.body}`);
          return { sid: 'MOCK_SMS_SID' };
        }
      }
    };
  }
  
  return null;
};

exports.sendAlertNotification = async (alert) => {
  try {
    if (alert.notificationSent) {
      return true;
    }
    
    const event = await Event.findById(alert.event);
    if (!event) {
      logger.error(`Event not found for alert notification: ${alert.event}`);
      return false;
    }
    
    const organizers = await User.find({
      $or: [
        { _id: event.owner },
        { _id: { $in: event.organizers } }
      ]
    });
    
    if (organizers.length === 0) {
      logger.error(`No organizers found for event: ${event._id}`);
      return false;
    }
    
    const notifyUsers = filterUsersByAlertPreferences(organizers, alert.severity);
    
    await Promise.all([
      sendEmailNotifications(notifyUsers, alert, event),
      sendSmsNotifications(notifyUsers, alert, event),
      sendPushNotifications(notifyUsers, alert, event)
    ]);
    
    alert.notificationSent = true;
    await alert.save();
    
    return true;
  } catch (error) {
    logger.error(`Send alert notification error: ${error.message}`, { error, alertId: alert._id });
    return false;
  }
};

const filterUsersByAlertPreferences = (users, severity) => {
  const result = {
    email: [],
    sms: [],
    push: []
  };
  
  users.forEach(user => {
    if (user.alertPreferences.email.enabled) {
      if (
        user.alertPreferences.email.threshold === 'all' ||
        (user.alertPreferences.email.threshold === 'critical' && 
         (severity === 'critical' || severity === 'high'))
      ) {
        result.email.push(user);
      }
    }
    
    if (user.alertPreferences.sms.enabled && user.alertPreferences.sms.phoneNumber) {
      if (
        user.alertPreferences.sms.threshold === 'all' ||
        (user.alertPreferences.sms.threshold === 'critical' && 
         (severity === 'critical' || severity === 'high'))
      ) {
        result.sms.push(user);
      }
    }
    
    if (user.alertPreferences.push.enabled) {
      if (
        user.alertPreferences.push.threshold === 'all' ||
        (user.alertPreferences.push.threshold === 'critical' && 
         (severity === 'critical' || severity === 'high'))
      ) {
        result.push.push(user);
      }
    }
  });
  
  return result;
};

const sendEmailNotifications = async (users, alert, event) => {
  try {
    if (users.email.length === 0) {
      return true;
    }
    
    const emailPromises = users.email.map(user => {
      const subject = `[${getSeverityEmoji(alert.severity)}] Alert: ${alert.title} - ${event.name}`;
      
      const message = `
Alert Type: ${alert.type}
Severity: ${alert.severity}
Category: ${alert.category}
${alert.location ? `Location: ${alert.location}` : ''}

${alert.description}

View and manage this alert at: ${process.env.CLIENT_URL || 'http://localhost:3000'}/events/${event._id}/alerts/${alert._id}
      `;
      
      return sendEmail({
        email: user.email,
        subject,
        message
      });
    });
    
    await Promise.all(emailPromises);
    return true;
  } catch (error) {
    logger.error(`Send email notifications error: ${error.message}`, { error });
    return false;
  }
};

const sendSmsNotifications = async (users, alert, event) => {
  try {
    if (users.sms.length === 0) {
      return true;
    }
    
    // Get Twilio client
    const twilioClient = initTwilioClient();
    
    if (!twilioClient) {
      logger.warn('SMS notifications skipped: Twilio client not initialized');
      return false;
    }
    
    const smsPromises = users.sms.map(user => {
      const message = `${getSeverityEmoji(alert.severity)} ${event.name}: ${alert.title}${alert.location ? ` at ${alert.location}` : ''}`;
      
      return twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: user.alertPreferences.sms.phoneNumber
      });
    });
    
    const results = await Promise.all(smsPromises);
    
    // Log SMS results
    results.forEach((result, index) => {
      logger.info(`SMS sent to ${users.sms[index].name}: ${result.sid}`);
    });
    
    return true;
  } catch (error) {
    logger.error(`Send SMS notifications error: ${error.message}`, { error });
    return false;
  }
};

const sendPushNotifications = async (users, alert, event) => {
  try {
    if (users.push.length === 0) {
      return true;
    }
  
    logger.info(`Simulating push notifications for alert ${alert._id} to ${users.push.length} users`);
    
    return true;
  } catch (error) {
    logger.error(`Send push notifications error: ${error.message}`, { error });
    return false;
  }
};

const getSeverityEmoji = (severity) => {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '⚠';
    case 'low':
      return 'ℹ️';
    default:
      return '📢';
  }
};


exports.sendAlertDigest = async (eventId) => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    
    const alerts = await Alert.find({
      event: eventId,
      createdAt: { $gte: lastHour }
    }).sort({ createdAt: -1 });
    
    if (alerts.length === 0) {
      return true; 
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      logger.error(`Event not found for alert digest: ${eventId}`);
      return false;
    }
    
    const organizers = await User.find({
      $or: [
        { _id: event.owner },
        { _id: { $in: event.organizers } }
      ]
    });
    
    if (organizers.length === 0) {
      logger.error(`No organizers found for event: ${eventId}`);
      return false;
    }
    
    const digestSubject = `Event Alert Digest: ${event.name} - ${alerts.length} alerts in the last hour`;
    
    let digestContent = `## Event Alert Digest\n\n`;
    digestContent += `Event: ${event.name}\n`;
    digestContent += `Time: ${new Date().toLocaleString()}\n`;
    digestContent += `Total Alerts: ${alerts.length} in the last hour\n\n`;
    
    const alertsByType = {};
    alerts.forEach(alert => {
      if (!alertsByType[alert.type]) {
        alertsByType[alert.type] = [];
      }
      alertsByType[alert.type].push(alert);
    });
    
    Object.entries(alertsByType).forEach(([type, typeAlerts]) => {
      digestContent += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Alerts (${typeAlerts.length})\n\n`;
      
      typeAlerts.forEach(alert => {
        digestContent += `- ${getSeverityEmoji(alert.severity)} **${alert.title}**`;
        if (alert.location) {
          digestContent += ` at ${alert.location}`;
        }
        digestContent += `\n`;
      });
      
      digestContent += `\n`;
    });
    
    digestContent += `View all alerts at: ${process.env.CLIENT_URL || 'http://localhost:3000'}/events/${eventId}/alerts\n`;
    
    const emailPromises = organizers.map(user => {
      return sendEmail({
        email: user.email,
        subject: digestSubject,
        message: digestContent
      });
    });
    
    await Promise.all(emailPromises);
    return true;
  } catch (error) {
    logger.error(`Send alert digest error: ${error.message}`, { error, eventId });
    return false;
  }
};