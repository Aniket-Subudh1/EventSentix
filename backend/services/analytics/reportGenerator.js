const Event = require('../../models/Event');
const Feedback = require('../../models/Feedback');
const Alert = require('../../models/Alert');
const Issue = require('../../models/Issue');
const sentimentAggregator = require('./sentimentAggregator');
const trendDetector = require('./trendDetector');
const logger = require('../../utils/logger');


exports.generateEventSummary = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    const sentimentOverview = await sentimentAggregator.getSentimentOverview(eventId);
    
    const feedbackVolume = await sentimentAggregator.getFeedbackVolume(eventId, {
      groupBy: 'hour'
    });
    
    const alertStats = await getAlertStats(eventId);
    
    const trendingTopics = await trendDetector.detectTrendingTopics(eventId, {
      timeWindow: 60,
      minMentions: 2
    });
    
    const issueStats = await getIssueStats(eventId);
    
    const insights = generateKeyInsights(
      sentimentOverview,
      alertStats,
      issueStats,
      trendingTopics
    );
    
    return {
      event: {
        id: event._id,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        isActive: event.isActive
      },
      overview: {
        totalFeedback: sentimentOverview.total,
        sentimentBreakdown: sentimentOverview.sentiment,
        topSources: sentimentOverview.sources.slice(0, 3),
        topIssues: sentimentOverview.issues.slice(0, 3)
      },
      alerts: alertStats,
      issues: issueStats,
      trends: {
        topics: trendingTopics.topics.slice(0, 5),
        volume: feedbackVolume.volume.slice(-12) // Last 12 hours
      },
      insights
    };
  } catch (error) {
    logger.error(`Generate event summary error: ${error.message}`, { error, eventId });
    throw error;
  }
};

exports.generateDetailedReport = async (eventId, options = {}) => {
  try {
    const { startTime, endTime } = options;
    
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    const reportStart = startTime ? new Date(startTime) : event.startDate;
    const reportEnd = endTime ? new Date(endTime) : new Date();
    
    const sentimentOverview = await sentimentAggregator.getSentimentOverview(eventId, {
      startTime: reportStart,
      endTime: reportEnd
    });
    
    const sentimentTrend = await sentimentAggregator.getSentimentTrend(eventId, {
      timeframe: 'hour',
      limit: 24
    });
    
    const issueTrend = await sentimentAggregator.getIssueTrend(eventId, {
      timeframe: 'hour',
      limit: 24
    });
    
    const sourceDistribution = await sentimentAggregator.getSourceDistribution(eventId, {
      startTime: reportStart,
      endTime: reportEnd
    });
    
    const trendingTopics = await trendDetector.detectTrendingTopics(eventId, {
      timeWindow: 1440, 
      minMentions: 3,
      maxTopics: 20
    });
    
    const alertHistory = await getAlertHistory(eventId, {
      startTime: reportStart,
      endTime: reportEnd
    });
    
    const issueStats = await getIssueStats(eventId, {
      startTime: reportStart,
      endTime: reportEnd
    });
    
    const topFeedback = await getTopFeedback(eventId, {
      startTime: reportStart,
      endTime: reportEnd
    });
    
    return {
      reportInfo: {
        eventId,
        eventName: event.name,
        startDate: reportStart,
        endDate: reportEnd,
        generatedAt: new Date()
      },
      summary: {
        totalFeedback: sentimentOverview.total,
        sentimentBreakdown: sentimentOverview.sentiment,
        totalAlerts: alertHistory.total,
        resolvedAlerts: alertHistory.resolved,
        topIssues: sentimentOverview.issues.slice(0, 5)
      },
      sentimentAnalysis: {
        overview: sentimentOverview,
        trend: sentimentTrend,
        sources: sourceDistribution
      },
      issueAnalysis: {
        trend: issueTrend,
        resolution: issueStats,
        topIssues: sentimentOverview.issues.slice(0, 10)
      },
      alertAnalysis: {
        history: alertHistory,
        byType: alertHistory.byType,
        responseTime: alertHistory.averageResponseTime
      },
      contentAnalysis: {
        trendingTopics: trendingTopics.topics,
        topPositive: topFeedback.positive,
        topNegative: topFeedback.negative
      }
    };
  } catch (error) {
    logger.error(`Generate detailed report error: ${error.message}`, { error, eventId });
    throw error;
  }
};

exports.exportEventData = async (eventId, options = {}) => {
  try {
    const { format = 'json', includeAll = false } = options;
    
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const feedback = await Feedback.find({ event: eventId });
    
    const alerts = await Alert.find({ event: eventId });
    
    const issues = await Issue.find({ event: eventId });
    
    const exportData = {
      event: {
        id: event._id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location
      },
      stats: {
        totalFeedback: feedback.length,
        totalAlerts: alerts.length,
        totalIssues: issues.length
      }
    };

    if (includeAll) {
      exportData.feedback = feedback;
      exportData.alerts = alerts;
      exportData.issues = issues;
    }
    
    switch (format) {
      case 'csv':
        return formatCSV(exportData, includeAll);
      case 'json':
      default:
        return exportData;
    }
  } catch (error) {
    logger.error(`Export event data error: ${error.message}`, { error, eventId });
    throw error;
  }
};

const getAlertStats = async (eventId, options = {}) => {
  try {
    const { startTime, endTime } = options;
    
    const query = { event: eventId };
    
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }
    
    const alerts = await Alert.find(query);
    
    const statusCounts = {
      new: 0,
      acknowledged: 0,
      inProgress: 0,
      resolved: 0,
      ignored: 0
    };
    
    const typeCounts = {
      sentiment: 0,
      issue: 0,
      trend: 0,
      system: 0
    };
    
    const severityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    let totalResponseTime = 0;
    let resolvedCount = 0;
    
    alerts.forEach(alert => {
 
      statusCounts[alert.status]++;
      

      typeCounts[alert.type]++;
      

      severityCounts[alert.severity]++;
      

      if (alert.status === 'resolved' && alert.resolvedAt) {
        const responseTime = alert.resolvedAt - alert.createdAt;
        totalResponseTime += responseTime;
        resolvedCount++;
      }
    });
    

    const averageResponseTime = resolvedCount > 0 
      ? totalResponseTime / resolvedCount 
      : 0;
    
    return {
      total: alerts.length,
      active: statusCounts.new + statusCounts.acknowledged + statusCounts.inProgress,
      resolved: statusCounts.resolved,
      ignored: statusCounts.ignored,
      byStatus: statusCounts,
      byType: typeCounts,
      bySeverity: severityCounts,
      averageResponseTime,
      responseTimeMinutes: averageResponseTime > 0 
        ? Math.floor(averageResponseTime / 1000 / 60) 
        : 0
    };
  } catch (error) {
    logger.error(`Get alert stats error: ${error.message}`, { error, eventId });
    throw error;
  }
};

const getAlertHistory = async (eventId, options = {}) => {
  try {
    const { startTime, endTime } = options;
    

    const query = { event: eventId };
    
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }
    
    const alerts = await Alert.find(query).sort({ createdAt: -1 });
    
    const history = alerts.map(alert => ({
      id: alert._id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      category: alert.category,
      status: alert.status,
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt
    }));
    
    const byType = {};
    const bySeverity = {};
    const byCategory = {};
    
    let totalResponseTime = 0;
    let resolvedCount = 0;
    
    alerts.forEach(alert => {

      if (!byType[alert.type]) {
        byType[alert.type] = 0;
      }
      byType[alert.type]++;
      
      if (!bySeverity[alert.severity]) {
        bySeverity[alert.severity] = 0;
      }
      bySeverity[alert.severity]++;
      
      if (!byCategory[alert.category]) {
        byCategory[alert.category] = 0;
      }
      byCategory[alert.category]++;
      
      if (alert.status === 'resolved' && alert.resolvedAt) {
        const responseTime = alert.resolvedAt - alert.createdAt;
        totalResponseTime += responseTime;
        resolvedCount++;
      }
    });
    
    const averageResponseTime = resolvedCount > 0 
      ? totalResponseTime / resolvedCount 
      : 0;
    
    return {
      history,
      total: alerts.length,
      resolved: resolvedCount,
      byType,
      bySeverity,
      byCategory,
      averageResponseTime,
      responseTimeMinutes: averageResponseTime > 0 
        ? Math.floor(averageResponseTime / 1000 / 60) 
        : 0
    };
  } catch (error) {
    logger.error(`Get alert history error: ${error.message}`, { error, eventId });
    throw error;
  }
};


const getIssueStats = async (eventId, options = {}) => {
  try {
    const { startTime, endTime } = options;
    

    const query = { event: eventId };
    
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }
    
    const issues = await Issue.find(query);
    
    const typeCounts = {};
    
    const statusCounts = {
      detected: 0,
      confirmed: 0,
      inProgress: 0,
      resolved: 0,
      falsePositive: 0
    };
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    issues.forEach(issue => {
      if (!typeCounts[issue.type]) {
        typeCounts[issue.type] = 0;
      }
      typeCounts[issue.type]++;
      
      statusCounts[issue.status]++;
      
      if (issue.status === 'resolved' && issue.resolvedAt) {
        const resolutionTime = issue.resolvedAt - issue.createdAt;
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });
    
    const averageResolutionTime = resolvedCount > 0 
      ? totalResolutionTime / resolvedCount 
      : 0;
    
    return {
      total: issues.length,
      active: statusCounts.detected + statusCounts.confirmed + statusCounts.inProgress,
      resolved: statusCounts.resolved,
      falsePositive: statusCounts.falsePositive,
      byType: typeCounts,
      byStatus: statusCounts,
      averageResolutionTime,
      resolutionTimeMinutes: averageResolutionTime > 0 
        ? Math.floor(averageResolutionTime / 1000 / 60) 
        : 0,
      resolutionRate: issues.length > 0 
        ? (statusCounts.resolved / issues.length) * 100 
        : 0
    };
  } catch (error) {
    logger.error(`Get issue stats error: ${error.message}`, { error, eventId });
    throw error;
  }
};

const getTopFeedback = async (eventId, options = {}) => {
  try {
    const { startTime, endTime, limit = 5 } = options;
    
    const query = { event: eventId };
    
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }
    

    const positiveQuery = { ...query, sentiment: 'positive' };
    const topPositive = await Feedback.find(positiveQuery)
      .sort({ sentimentScore: -1 })
      .limit(limit);
    
    const negativeQuery = { ...query, sentiment: 'negative' };
    const topNegative = await Feedback.find(negativeQuery)
      .sort({ sentimentScore: 1 })
      .limit(limit);
    
    return {
      positive: topPositive.map(item => ({
        id: item._id,
        text: item.text,
        source: item.source,
        score: item.sentimentScore,
        createdAt: item.createdAt
      })),
      negative: topNegative.map(item => ({
        id: item._id,
        text: item.text,
        source: item.source,
        score: item.sentimentScore,
        issueType: item.issueType,
        createdAt: item.createdAt
      }))
    };
  } catch (error) {
    logger.error(`Get top feedback error: ${error.message}`, { error, eventId });
    throw error;
  }
};

const generateKeyInsights = (sentimentOverview, alertStats, issueStats, trendingTopics) => {
  const insights = [];
  
  if (sentimentOverview.total > 0) {
    const posPercentage = sentimentOverview.sentiment.positive.percentage;
    const negPercentage = sentimentOverview.sentiment.negative.percentage;
    
    if (posPercentage >= 70) {
      insights.push({
        type: 'positive',
        title: 'Very Positive Sentiment',
        description: `Overall sentiment is very positive with ${posPercentage.toFixed(1)}% positive feedback.`
      });
    } else if (posPercentage >= 50) {
      insights.push({
        type: 'positive',
        title: 'Positive Sentiment',
        description: `Overall sentiment is positive with ${posPercentage.toFixed(1)}% positive feedback.`
      });
    } else if (negPercentage >= 50) {
      insights.push({
        type: 'negative',
        title: 'Negative Sentiment',
        description: `Overall sentiment is concerning with ${negPercentage.toFixed(1)}% negative feedback.`
      });
    }
  }
  
  if (sentimentOverview.issues.length > 0) {
    const topIssue = sentimentOverview.issues[0];
    if (topIssue.percentage >= 30) {
      insights.push({
        type: 'issue',
        title: `Top Issue: ${topIssue.issue}`,
        description: `${topIssue.issue} represents ${topIssue.percentage.toFixed(1)}% of all negative feedback.`
      });
    }
  }
  
  if (alertStats.total > 10) {
    if (alertStats.responseTimeMinutes < 15) {
      insights.push({
        type: 'positive',
        title: 'Quick Alert Response',
        description: `Team is responding to alerts in an average of ${alertStats.responseTimeMinutes} minutes.`
      });
    } else if (alertStats.responseTimeMinutes > 60) {
      insights.push({
        type: 'warning',
        title: 'Slow Alert Response',
        description: `Alert response time is ${alertStats.responseTimeMinutes} minutes on average.`
      });
    }
  }
  
  if (issueStats.total > 5) {
    if (issueStats.resolutionRate >= 80) {
      insights.push({
        type: 'positive',
        title: 'High Issue Resolution',
        description: `${issueStats.resolutionRate.toFixed(1)}% of identified issues have been resolved.`
      });
    } else if (issueStats.resolutionRate <= 40) {
      insights.push({
        type: 'warning',
        title: 'Low Issue Resolution',
        description: `Only ${issueStats.resolutionRate.toFixed(1)}% of identified issues have been resolved.`
      });
    }
  }
  
  if (trendingTopics.topics.length > 0) {
    const topTopic = trendingTopics.topics[0];
    
    insights.push({
      type: 'info',
      title: `Trending Topic: ${topTopic.keyword}`,
      description: `"${topTopic.keyword}" is mentioned in ${topTopic.count} pieces of feedback.`
    });
  }
  
  return insights;
};

const formatCSV = (data, includeAll) => {
  let csv = '';
  
  csv += 'Event Information\n';
  csv += `Name,${data.event.name}\n`;
  csv += `Start Date,${data.event.startDate}\n`;
  csv += `End Date,${data.event.endDate}\n`;
  csv += `Location,${data.event.location}\n\n`;
  
  csv += 'Statistics\n';
  csv += `Total Feedback,${data.stats.totalFeedback}\n`;
  csv += `Total Alerts,${data.stats.totalAlerts}\n`;
  csv += `Total Issues,${data.stats.totalIssues}\n\n`;
  
  if (includeAll && data.feedback.length > 0) {
    csv += 'Feedback\n';
    csv += 'ID,Source,Sentiment,Score,Issue Type,Text,Created At\n';
    
    data.feedback.forEach(item => {
      csv += `${item._id},${item.source},${item.sentiment},${item.sentimentScore},${item.issueType || ''},${item.text.replace(/,/g, ' ')},${item.createdAt}\n`;
    });
    
    csv += '\n';
  }
  
  if (includeAll && data.alerts.length > 0) {
    csv += 'Alerts\n';
    csv += 'ID,Type,Severity,Category,Status,Title,Created At,Resolved At\n';
    
    data.alerts.forEach(item => {
      csv += `${item._id},${item.type},${item.severity},${item.category},${item.status},${item.title.replace(/,/g, ' ')},${item.createdAt},${item.resolvedAt || ''}\n`;
    });
    
    csv += '\n';
  }
  
  return csv;
};