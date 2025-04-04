const Event = require('../../models/Event');
const SentimentRecord = require('../../models/SentimentRecord');
const logger = require('../../utils/logger');

exports.getEventThresholds = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    return event.alertSettings;
  } catch (error) {
    logger.error(`Get event thresholds error: ${error.message}`, { error, eventId });
    throw error;
  }
};


exports.updateEventThresholds = async (eventId, thresholds) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    event.alertSettings = {
      ...event.alertSettings,
      ...thresholds
    };
    
    await event.save();
    
    return event.alertSettings;
  } catch (error) {
    logger.error(`Update event thresholds error: ${error.message}`, { error, eventId, thresholds });
    throw error;
  }
};

exports.calculateRecommendedThresholds = async (eventId) => {
  try {
    const recentRecords = await SentimentRecord.find({
      event: eventId,
      timeframe: 'hour'
    })
    .sort({ timestamp: -1 })
    .limit(24); // Last 24 hours
    
    if (recentRecords.length === 0) {
      return {
        negativeSentimentThreshold: -0.5,
        issueAlertThreshold: 3,
        autoResolveTime: 60
      };
    }
    
    let totalNegativeScore = 0;
    let totalNegativeCount = 0;
    
    recentRecords.forEach(record => {
      totalNegativeScore += record.data.negative.avgScore * record.data.negative.count;
      totalNegativeCount += record.data.negative.count;
    });
    
    const avgNegativeScore = totalNegativeCount > 0 
      ? totalNegativeScore / totalNegativeCount 
      : -0.5;
    
    const recommendedNegativeThreshold = Math.max(avgNegativeScore * 0.9, -0.9);
    
    let totalMessages = 0;
    recentRecords.forEach(record => {
      totalMessages += record.data.total;
    });
    
    const avgMessagesPerHour = totalMessages / recentRecords.length;
    
    let recommendedIssueThreshold;
    if (avgMessagesPerHour < 10) {
      recommendedIssueThreshold = 2;
    } else if (avgMessagesPerHour < 50) {
      recommendedIssueThreshold = 3; 
    } else if (avgMessagesPerHour < 200) {
      recommendedIssueThreshold = 5;
    } else {
      recommendedIssueThreshold = 8; 
    }
    
    return {
      negativeSentimentThreshold: recommendedNegativeThreshold,
      issueAlertThreshold: recommendedIssueThreshold,
      autoResolveTime: 60 
    };
  } catch (error) {
    logger.error(`Calculate recommended thresholds error: ${error.message}`, { error, eventId });
    
   
    return {
      negativeSentimentThreshold: -0.5,
      issueAlertThreshold: 3,
      autoResolveTime: 60
    };
  }
};


exports.shouldGenerateAlert = async (feedback, thresholds) => {
  if (!thresholds) {
    thresholds = await this.getEventThresholds(feedback.event);
  }
  
  if (feedback.sentiment === 'negative' && 
      feedback.sentimentScore <= thresholds.negativeSentimentThreshold) {
    return true;
  }
  
  return false;
};

exports.adaptThresholds = async (eventId, feedbackData) => {
  try {
    const { alertId, wasAccurate } = feedbackData;
    
    const currentThresholds = await this.getEventThresholds(eventId);
    
    if (!wasAccurate) {
      const newThresholds = {
        negativeSentimentThreshold: Math.max(currentThresholds.negativeSentimentThreshold - 0.1, -1),
        issueAlertThreshold: currentThresholds.issueAlertThreshold + 1
      };
      
      return await this.updateEventThresholds(eventId, newThresholds);
    } else {
      return currentThresholds;
    }
  } catch (error) {
    logger.error(`Adapt thresholds error: ${error.message}`, { error, eventId, feedbackData });
    return null;
  }
};