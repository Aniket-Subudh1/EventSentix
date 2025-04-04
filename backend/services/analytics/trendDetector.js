const SentimentRecord = require('../../models/SentimentRecord');
const Feedback = require('../../models/Feedback');
const Alert = require('../../models/Alert');
const textProcessing = require('../../utils/textProcessing');
const logger = require('../../utils/logger');


exports.detectSentimentTrends = async (eventId, options = {}) => {
  try {
    const {
      timeframe = 'hour',
      lookbackPeriods = 6,
      threshold = 20
    } = options;
    
    // Get sentiment records for this event
    const records = await SentimentRecord.find({
      event: eventId,
      timeframe
    })
    .sort({ timestamp: -1 })
    .limit(lookbackPeriods);
    
    if (records.length < 2) {
      return {
        trends: [],
        message: 'Not enough data for trend detection'
      };
    }
    
    // Calculate trend data
    const trends = [];
    
    // Look at sentiment changes
    const latestRecord = records[0];
    const previousRecords = records.slice(1);
    
    // Calculate average of previous records
    let previousPositiveCount = 0;
    let previousNegativeCount = 0;
    let previousTotalCount = 0;
    
    previousRecords.forEach(record => {
      previousPositiveCount += record.data.positive.count;
      previousNegativeCount += record.data.negative.count;
      previousTotalCount += record.data.total;
    });
    
    const avgPreviousPositivePercent = previousTotalCount > 0 ? 
      (previousPositiveCount / previousTotalCount) * 100 : 0;
    
    const avgPreviousNegativePercent = previousTotalCount > 0 ? 
      (previousNegativeCount / previousTotalCount) * 100 : 0;
    
    // Calculate current percentages
    const currentPositivePercent = latestRecord.data.total > 0 ? 
      (latestRecord.data.positive.count / latestRecord.data.total) * 100 : 0;
    
    const currentNegativePercent = latestRecord.data.total > 0 ? 
      (latestRecord.data.negative.count / latestRecord.data.total) * 100 : 0;
    
    // Check for significant changes
    const positiveChange = currentPositivePercent - avgPreviousPositivePercent;
    const negativeChange = currentNegativePercent - avgPreviousNegativePercent;
    
    if (Math.abs(positiveChange) >= threshold) {
      trends.push({
        type: 'sentiment',
        direction: positiveChange > 0 ? 'increase' : 'decrease',
        sentiment: 'positive',
        change: Math.abs(positiveChange),
        current: currentPositivePercent,
        previous: avgPreviousPositivePercent,
        severity: getSeverityFromChange(Math.abs(positiveChange))
      });
    }
    
    if (Math.abs(negativeChange) >= threshold) {
      trends.push({
        type: 'sentiment',
        direction: negativeChange > 0 ? 'increase' : 'decrease',
        sentiment: 'negative',
        change: Math.abs(negativeChange),
        current: currentNegativePercent,
        previous: avgPreviousNegativePercent,
        severity: getSeverityFromChange(Math.abs(negativeChange))
      });
    }
    
    // Check source distributions
    const sourceDistributionChanges = detectSourceDistributionChanges(latestRecord, previousRecords);
    trends.push(...sourceDistributionChanges);
    
    // Check issue type distributions
    const issueDistributionChanges = detectIssueDistributionChanges(latestRecord, previousRecords);
    trends.push(...issueDistributionChanges);
    
    return {
      trends,
      message: trends.length > 0 ? 'Trends detected' : 'No significant trends detected'
    };
  } catch (error) {
    logger.error(`Detect sentiment trends error: ${error.message}`, { error, eventId });
    throw error;
  }
};


exports.detectTrendingTopics = async (eventId, options = {}) => {
  try {
    const {
      timeWindow = 60, // minutes
      minMentions = 3,
      maxTopics = 10
    } = options;
    
    // Get recent feedback for this event
    const cutoffTime = new Date(Date.now() - timeWindow * 60 * 1000);
    
    const recentFeedback = await Feedback.find({
      event: eventId,
      createdAt: { $gte: cutoffTime }
    });
    
    if (recentFeedback.length === 0) {
      return {
        topics: [],
        message: 'No recent feedback for topic detection'
      };
    }
    
    // Extract all keywords from feedback
    const keywordCounts = {};
    let totalKeywords = 0;
    
    recentFeedback.forEach(feedback => {
      // Skip if no keywords
      if (!feedback.metadata?.keywords || feedback.metadata.keywords.length === 0) {
        // Extract keywords if not already present
        const extractedKeywords = textProcessing.extractKeywords(feedback.text, 5);
        
        extractedKeywords.forEach(keyword => {
          if (!keywordCounts[keyword]) {
            keywordCounts[keyword] = {
              count: 0,
              positive: 0,
              neutral: 0,
              negative: 0
            };
          }
          
          keywordCounts[keyword].count++;
          keywordCounts[keyword][feedback.sentiment]++;
          totalKeywords++;
        });
      } else {
        // Use existing keywords
        feedback.metadata.keywords.forEach(keyword => {
          if (!keywordCounts[keyword]) {
            keywordCounts[keyword] = {
              count: 0,
              positive: 0,
              neutral: 0,
              negative: 0
            };
          }
          
          keywordCounts[keyword].count++;
          keywordCounts[keyword][feedback.sentiment]++;
          totalKeywords++;
        });
      }
    });
    
    // Filter keywords with minimum mentions
    const filteredKeywords = Object.entries(keywordCounts)
      .filter(([_, data]) => data.count >= minMentions)
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        percentage: (data.count / totalKeywords) * 100,
        sentiment: {
          positive: data.positive,
          neutral: data.neutral,
          negative: data.negative
        },
        score: calculateKeywordScore(data)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxTopics);
    
    return {
      topics: filteredKeywords,
      total: recentFeedback.length,
      timeWindow
    };
  } catch (error) {
    logger.error(`Detect trending topics error: ${error.message}`, { error, eventId });
    throw error;
  }
};

/**
 * Create trend alert if significant trend detected
 * @param {String} eventId - Event ID
 * @param {Object} trendData - Detected trend data
 * @returns {Object} Created alert or null
 */
exports.createTrendAlert = async (eventId, trendData) => {
  try {
    // Only create alerts for high severity negative trends
    if (
      trendData.type === 'sentiment' && 
      trendData.sentiment === 'negative' && 
      trendData.direction === 'increase' && 
      trendData.severity === 'high'
    ) {
      // Check if we already have a recent trend alert
      const lastHour = new Date(Date.now() - 60 * 60 * 1000);
      
      const existingAlert = await Alert.findOne({
        event: eventId,
        type: 'trend',
        category: 'general',
        createdAt: { $gte: lastHour }
      });
      
      if (existingAlert) {
        // Update existing alert
        existingAlert.description = `Negative sentiment trend: ${trendData.current.toFixed(1)}% of recent feedback is negative (${trendData.change.toFixed(1)}% increase)`;
        existingAlert.metadata.sentimentAverage = trendData.current;
        existingAlert.updatedAt = new Date();
        await existingAlert.save();
        
        return existingAlert;
      }
      
      // Create new trend alert
      const alert = await Alert.create({
        event: eventId,
        type: 'trend',
        severity: 'high',
        title: 'Negative feedback trend detected',
        description: `Negative sentiment trend: ${trendData.current.toFixed(1)}% of recent feedback is negative (${trendData.change.toFixed(1)}% increase)`,
        category: 'general',
        metadata: {
          sentimentAverage: trendData.current,
          detectionMethod: 'trend',
          keywords: [],
          autoResolveDue: new Date(Date.now() + (2 * 60 * 60 * 1000)) // 2 hour auto-resolve
        }
      });
      
      return alert;
    }
    
    return null;
  } catch (error) {
    logger.error(`Create trend alert error: ${error.message}`, { error, eventId, trendData });
    return null;
  }
};

/**
 * Detect changes in source distribution
 * @param {Object} latestRecord - Latest sentiment record
 * @param {Array} previousRecords - Previous sentiment records
 * @returns {Array} Detected trends
 */
const detectSourceDistributionChanges = (latestRecord, previousRecords) => {
  const trends = [];
  
  // Calculate average source distribution from previous records
  const avgSourceDistribution = {};
  let previousTotalFeedback = 0;
  
  previousRecords.forEach(record => {
    previousTotalFeedback += record.data.total;
    
    Object.entries(record.sources).forEach(([source, count]) => {
      if (!avgSourceDistribution[source]) {
        avgSourceDistribution[source] = 0;
      }
      avgSourceDistribution[source] += count;
    });
  });
  
  // Calculate percentages
  const previousSourcePercentages = {};
  
  Object.entries(avgSourceDistribution).forEach(([source, count]) => {
    previousSourcePercentages[source] = previousTotalFeedback > 0 ? 
      (count / previousTotalFeedback) * 100 : 0;
  });
  
  // Calculate current percentages
  const currentSourcePercentages = {};
  
  Object.entries(latestRecord.sources).forEach(([source, count]) => {
    currentSourcePercentages[source] = latestRecord.data.total > 0 ? 
      (count / latestRecord.data.total) * 100 : 0;
  });
  
  // Compare percentages
  Object.entries(currentSourcePercentages).forEach(([source, currentPercent]) => {
    const previousPercent = previousSourcePercentages[source] || 0;
    const change = currentPercent - previousPercent;
    
    // Only consider significant changes (> 15%)
    if (Math.abs(change) >= 15) {
      trends.push({
        type: 'source',
        source,
        direction: change > 0 ? 'increase' : 'decrease',
        change: Math.abs(change),
        current: currentPercent,
        previous: previousPercent,
        severity: getSeverityFromChange(Math.abs(change))
      });
    }
  });
  
  return trends;
};

/**
 * Detect changes in issue type distribution
 * @param {Object} latestRecord - Latest sentiment record
 * @param {Array} previousRecords - Previous sentiment records
 * @returns {Array} Detected trends
 */
const detectIssueDistributionChanges = (latestRecord, previousRecords) => {
  const trends = [];
  
  // Calculate average issue distribution from previous records
  const avgIssueDistribution = {};
  let previousTotalNegative = 0;
  
  previousRecords.forEach(record => {
    previousTotalNegative += record.data.negative.count;
    
    Object.entries(record.issues).forEach(([issue, count]) => {
      if (!avgIssueDistribution[issue]) {
        avgIssueDistribution[issue] = 0;
      }
      avgIssueDistribution[issue] += count;
    });
  });
  
  // Calculate percentages
  const previousIssuePercentages = {};
  
  Object.entries(avgIssueDistribution).forEach(([issue, count]) => {
    previousIssuePercentages[issue] = previousTotalNegative > 0 ? 
      (count / previousTotalNegative) * 100 : 0;
  });
  
  // Calculate current percentages
  const currentIssuePercentages = {};
  
  Object.entries(latestRecord.issues).forEach(([issue, count]) => {
    currentIssuePercentages[issue] = latestRecord.data.negative.count > 0 ? 
      (count / latestRecord.data.negative.count) * 100 : 0;
  });
  
  // Compare percentages
  Object.entries(currentIssuePercentages).forEach(([issue, currentPercent]) => {
    const previousPercent = previousIssuePercentages[issue] || 0;
    const change = currentPercent - previousPercent;
    
    // Only consider significant changes (> 15%)
    if (Math.abs(change) >= 15 && currentPercent >= 10) {
      trends.push({
        type: 'issue',
        issue,
        direction: change > 0 ? 'increase' : 'decrease',
        change: Math.abs(change),
        current: currentPercent,
        previous: previousPercent,
        severity: getSeverityFromChange(Math.abs(change))
      });
    }
  });
  
  return trends;
};


const getSeverityFromChange = (change) => {
  if (change >= 30) {
    return 'high';
  } else if (change >= 20) {
    return 'medium';
  } else {
    return 'low';
  }
};


const calculateKeywordScore = (keywordData) => {
  // Weight negative mentions more heavily
  const score = 
    keywordData.count + 
    (keywordData.negative * 2) + 
    (keywordData.positive * 0.5);
  
  return score;
};