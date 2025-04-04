const sentimentAggregator = require('../services/analytics/sentimentAggregator');
const trendDetector = require('../services/analytics/trendDetector');
const reportGenerator = require('../services/analytics/reportGenerator');
const Feedback = require('../models/Feedback');
const Alert = require('../models/Alert');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

exports.getSentimentTrend = asyncHandler(async (req, res) => {
  const { timeframe, limit } = req.query;
  
  const trendData = await sentimentAggregator.getSentimentTrend(
    req.params.eventId,
    {
      timeframe,
      limit: parseInt(limit, 10) || undefined
    }
  );
  
  res.status(200).json({
    success: true,
    data: trendData
  });
});


exports.getSentimentOverview = asyncHandler(async (req, res) => {
  const { startTime, endTime } = req.query;
  
  const overview = await sentimentAggregator.getSentimentOverview(
    req.params.eventId,
    { startTime, endTime }
  );
  
  res.status(200).json({
    success: true,
    data: overview
  });
});

// exports.getSentimentOverview = asyncHandler(async (req, res) => {
//   const sentimentOverview = await sentimentAggregator.getSentimentOverview(req.params.eventId, {
//     startTime: req.query.startTime,
//     endTime: req.query.endTime,
//   });

//   res.status(200).json({ success: true, data: sentimentOverview });
// });


exports.getIssueTrend = asyncHandler(async (req, res) => {
  const { timeframe, limit } = req.query;
  
  const trendData = await sentimentAggregator.getIssueTrend(
    req.params.eventId,
    {
      timeframe,
      limit: parseInt(limit, 10) || undefined
    }
  );
  
  res.status(200).json({
    success: true,
    data: trendData
  });
});

exports.getSourceDistribution = asyncHandler(async (req, res) => {
  const { startTime, endTime } = req.query;
  
  const distribution = await sentimentAggregator.getSourceDistribution(
    req.params.eventId,
    { startTime, endTime }
  );
  
  res.status(200).json({
    success: true,
    data: distribution
  });
});


exports.getTrendingTopics = asyncHandler(async (req, res) => {
  const timeWindow = parseInt(req.query.timeWindow, 10) || 60; 
  const minMentions = parseInt(req.query.minMentions, 10) || 2;
  const maxTopics = parseInt(req.query.maxTopics, 10) || 10;
  
  const topics = await trendDetector.detectTrendingTopics(
    req.params.eventId,
    {
      timeWindow,
      minMentions,
      maxTopics
    }
  );
  
  res.status(200).json({
    success: true,
    data: topics
  });
});

exports.getLocationHeatmap = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  

  const locations = event.locationMap.areas.map(area => area.name);
  
  const feedback = await Feedback.find({
    event: req.params.eventId,
    'issueDetails.location': { $ne: null },
    sentiment: 'negative' 
  });
  

  const locationCounts = {};
  
  feedback.forEach(item => {
    const location = item.issueDetails.location;
    
    if (!locationCounts[location]) {
      locationCounts[location] = {
        count: 0,
        issues: {}
      };
    }
    
    locationCounts[location].count++;
    

    if (item.issueType) {
      if (!locationCounts[location].issues[item.issueType]) {
        locationCounts[location].issues[item.issueType] = 0;
      }
      
      locationCounts[location].issues[item.issueType]++;
    }
  });
  

  const heatmapData = Object.entries(locationCounts).map(([location, data]) => ({
    location,
    count: data.count,
    issues: Object.entries(data.issues).map(([type, count]) => ({
      type,
      count
    }))
  })).sort((a, b) => b.count - a.count);
  
  res.status(200).json({
    success: true,
    data: {
      locations,
      heatmap: heatmapData
    }
  });
});


exports.getAlertHistory = asyncHandler(async (req, res) => {
  const { startTime, endTime } = req.query;
  
  const query = {
    event: req.params.eventId
  };
  
  if (startTime || endTime) {
    query.createdAt = {};
    if (startTime) query.createdAt.$gte = new Date(startTime);
    if (endTime) query.createdAt.$lte = new Date(endTime);
  }
  
  const alerts = await Alert.find(query).sort({ createdAt: 1 });
  
  const alertsByDay = {};
  
  alerts.forEach(alert => {
    const day = new Date(alert.createdAt).toISOString().split('T')[0];
    
    if (!alertsByDay[day]) {
      alertsByDay[day] = {
        date: day,
        total: 0,
        resolved: 0,
        byType: {},
        bySeverity: {}
      };
    }
    
    alertsByDay[day].total++;
    
    if (alert.status === 'resolved') {
      alertsByDay[day].resolved++;
    }
    
    if (!alertsByDay[day].byType[alert.type]) {
      alertsByDay[day].byType[alert.type] = 0;
    }
    alertsByDay[day].byType[alert.type]++;
    
    if (!alertsByDay[day].bySeverity[alert.severity]) {
      alertsByDay[day].bySeverity[alert.severity] = 0;
    }
    alertsByDay[day].bySeverity[alert.severity]++;
  });
  
  const history = Object.values(alertsByDay);
  
  const responseTimesMs = [];
  alerts.forEach(alert => {
    if (alert.status === 'resolved' && alert.resolvedAt) {
      const responseTime = alert.resolvedAt - alert.createdAt;
      responseTimesMs.push(responseTime);
    }
  });
  
  const averageResponseTimeMs = responseTimesMs.length > 0
    ? responseTimesMs.reduce((sum, time) => sum + time, 0) / responseTimesMs.length
    : 0;
  
  res.status(200).json({
    success: true,
    data: {
      history,
      summary: {
        total: alerts.length,
        resolved: alerts.filter(a => a.status === 'resolved').length,
        averageResponseTimeMinutes: Math.round(averageResponseTimeMs / 1000 / 60)
      }
    }
  });
});

exports.getEventSummary = asyncHandler(async (req, res) => {
  const summary = await reportGenerator.generateEventSummary(req.params.eventId);
  
  res.status(200).json({
    success: true,
    data: summary
  });
});

exports.getDashboardData = asyncHandler(async (req, res) => {
  // Get event
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  

  const activeAlerts = await Alert.countDocuments({
    event: req.params.eventId,
    status: { $in: ['new', 'acknowledged', 'inProgress'] }
  });
  

  const recentFeedback = await Feedback.countDocuments({
    event: req.params.eventId,
    createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
  });
  

  const lastHourSentiment = await Feedback.aggregate([
    { 
      $match: { 
        event: req.params.eventId,
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      } 
    },
    {
      $group: {
        _id: '$sentiment',
        count: { $sum: 1 }
      }
    }
  ]);
  

  const sentimentCounts = {
    positive: 0,
    neutral: 0,
    negative: 0
  };
  
  lastHourSentiment.forEach(item => {
    sentimentCounts[item._id] = item.count;
  });
  

  const trendingTopics = await trendDetector.detectTrendingTopics(
    req.params.eventId,
    { timeWindow: 60, minMentions: 2, maxTopics: 5 }
  );
  

  const latestAlerts = await Alert.find({ event: req.params.eventId })
    .sort({ createdAt: -1 })
    .limit(5);
  

  const latestFeedback = await Feedback.find({ event: req.params.eventId })
    .sort({ createdAt: -1 })
    .limit(5);
  
  res.status(200).json({
    success: true,
    data: {
      event: {
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        isActive: event.isActive
      },
      alerts: {
        active: activeAlerts,
        latest: latestAlerts
      },
      feedback: {
        recent: recentFeedback,
        latest: latestFeedback,
        sentiment: sentimentCounts
      },
      trends: trendingTopics.topics
    }
  });
});


exports.getFeedbackVolume = asyncHandler(async (req, res) => {
  const { groupBy, startTime, endTime } = req.query;
  
  const volumeData = await sentimentAggregator.getFeedbackVolume(
    req.params.eventId,
    { groupBy, startTime, endTime }
  );
  
  res.status(200).json({
    success: true,
    data: volumeData
  });
});

exports.getResolutionStats = asyncHandler(async (req, res) => {

  const issues = await Feedback.aggregate([
    { 
      $match: { 
        event: req.params.eventId,
        sentiment: 'negative',
        issueType: { $ne: null }
      } 
    },
    {
      $group: {
        _id: '$issueType',
        total: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$issueDetails.resolved', true] }, 1, 0]
          }
        }
      }
    }
  ]);
  

  const alerts = await Alert.aggregate([
    { 
      $match: { 
        event: req.params.eventId
      } 
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
          }
        }
      }
    }
  ]);
  
 
  const issueStats = issues.map(issue => ({
    type: issue._id,
    total: issue.total,
    resolved: issue.resolved,
    resolutionRate: issue.total > 0 ? (issue.resolved / issue.total) * 100 : 0
  }));
  
  const alertStats = alerts.map(alert => ({
    type: alert._id,
    total: alert.total,
    resolved: alert.resolved,
    resolutionRate: alert.total > 0 ? (alert.resolved / alert.total) * 100 : 0
  }));
  

  const totalIssues = issues.reduce((sum, issue) => sum + issue.total, 0);
  const resolvedIssues = issues.reduce((sum, issue) => sum + issue.resolved, 0);
  
  const totalAlerts = alerts.reduce((sum, alert) => sum + alert.total, 0);
  const resolvedAlerts = alerts.reduce((sum, alert) => sum + alert.resolved, 0);
  
  res.status(200).json({
    success: true,
    data: {
      issues: {
        total: totalIssues,
        resolved: resolvedIssues,
        resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0,
        byType: issueStats
      },
      alerts: {
        total: totalAlerts,
        resolved: resolvedAlerts,
        resolutionRate: totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0,
        byType: alertStats
      }
    }
  });
});

exports.exportAnalyticsData = asyncHandler(async (req, res) => {
  const { format, includeAll } = req.query;
  
  const exportData = await reportGenerator.exportEventData(
    req.params.eventId,
    {
      format: format || 'json',
      includeAll: includeAll === 'true'
    }
  );
  
  if (format === 'csv') {

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event_${req.params.eventId}_export.csv"`);
    return res.send(exportData);
  }
  

  res.status(200).json({
    success: true,
    data: exportData
  });
});

exports.getWordCloudData = asyncHandler(async (req, res) => {
  const { sentiment, limit, startTime, endTime } = req.query;
  

  const query = {
    event: req.params.eventId
  };
  

  if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
    query.sentiment = sentiment;
  }
  
  if (startTime || endTime) {
    query.createdAt = {};
    if (startTime) query.createdAt.$gte = new Date(startTime);
    if (endTime) query.createdAt.$lte = new Date(endTime);
  }
  
  const feedback = await Feedback.find(query).limit(parseInt(limit, 10) || 500);
  

  const wordCounts = {};
  
  feedback.forEach(item => {
   
    const keywords = item.metadata?.keywords || [];
    
    keywords.forEach(keyword => {
      
      const normalizedKeyword = keyword.toLowerCase().trim();
      
     
      if (normalizedKeyword.length < 3 || !isNaN(normalizedKeyword)) {
        return;
      }
      
      if (!wordCounts[normalizedKeyword]) {
        wordCounts[normalizedKeyword] = {
          count: 0,
          sentiment: {
            positive: 0,
            neutral: 0,
            negative: 0
          }
        };
      }
      
      wordCounts[normalizedKeyword].count++;
      wordCounts[normalizedKeyword].sentiment[item.sentiment]++;
    });
  });
  

  const words = Object.entries(wordCounts)
    .filter(([_, data]) => data.count >= 2) 
    .map(([word, data]) => ({
      text: word,
      value: data.count,
      sentiment: Object.entries(data.sentiment)
        .sort((a, b) => b[1] - a[1])[0][0] 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, parseInt(req.query.maxWords, 10) || 100); 
  
  res.status(200).json({
    success: true,
    data: {
      words,
      total: words.length,
      query: {
        sentiment,
        feedbackCount: feedback.length
      }
    }
  });
});