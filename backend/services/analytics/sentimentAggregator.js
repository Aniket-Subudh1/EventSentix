const SentimentRecord = require('../../models/SentimentRecord');
const Feedback = require('../../models/Feedback');
const Event = require('../../models/Event');
const logger = require('../../utils/logger');

exports.getSentimentOverview = async (eventId, options = {}) => {
  try {
    const { startTime, endTime } = options;

    const query = { event: eventId };
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }

    const feedback = await Feedback.find(query);

    const totalFeedback = feedback.length;
    const sentimentBreakdown = {
      positive: { count: 0, percentage: 0, avgScore: 0 },
      neutral: { count: 0, percentage: 0, avgScore: 0 },
      negative: { count: 0, percentage: 0, avgScore: 0 },
    };
    const sourceBreakdown = {};
    const issuesBreakdown = {};

    let positiveScores = 0, neutralScores = 0, negativeScores = 0;

    feedback.forEach(item => {
      sentimentBreakdown[item.sentiment].count++;
      if (item.sentiment === 'positive') positiveScores += item.sentimentScore;
      if (item.sentiment === 'neutral') neutralScores += item.sentimentScore;
      if (item.sentiment === 'negative') negativeScores += item.sentimentScore;

      sourceBreakdown[item.source] = (sourceBreakdown[item.source] || 0) + 1;

      if (item.sentiment === 'negative' && item.issueType) {
        issuesBreakdown[item.issueType] = (issuesBreakdown[item.issueType] || 0) + 1;
      }
    });

    sentimentBreakdown.positive.percentage = totalFeedback > 0 ? (sentimentBreakdown.positive.count / totalFeedback) * 100 : 0;
    sentimentBreakdown.neutral.percentage = totalFeedback > 0 ? (sentimentBreakdown.neutral.count / totalFeedback) * 100 : 0;
    sentimentBreakdown.negative.percentage = totalFeedback > 0 ? (sentimentBreakdown.negative.count / totalFeedback) * 100 : 0;

    sentimentBreakdown.positive.avgScore = sentimentBreakdown.positive.count > 0 ? positiveScores / sentimentBreakdown.positive.count : 0;
    sentimentBreakdown.neutral.avgScore = sentimentBreakdown.neutral.count > 0 ? neutralScores / sentimentBreakdown.neutral.count : 0;
    sentimentBreakdown.negative.avgScore = sentimentBreakdown.negative.count > 0 ? negativeScores / sentimentBreakdown.negative.count : 0;

    const sources = Object.entries(sourceBreakdown).map(([source, count]) => ({
      source,
      count,
      percentage: totalFeedback > 0 ? (count / totalFeedback) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

    const issues = Object.entries(issuesBreakdown).map(([issue, count]) => ({
      issue,
      count,
      percentage: sentimentBreakdown.negative.count > 0 ? (count / sentimentBreakdown.negative.count) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

    return {
      total: totalFeedback,
      sentiment: sentimentBreakdown,
      sources,
      issues,
    };
  } catch (error) {
    logger.error(`Get sentiment overview error: ${error.message}`, { error, eventId });
    throw error;
  }
};

exports.getSentimentTrend = async (eventId, options = {}) => {
  try {
    const { timeframe = 'hour', limit = 24, startTime, endTime } = options;

    const query = { event: eventId };
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }

    const feedback = await Feedback.find(query);

    const groupByTimeframe = (date) => {
      const groupedDate = new Date(date);
      // if (timeframe === 'minute') groupedDate.setSeconds(0, 0);
      if (timeframe === 'hour') groupedDate.setMinutes(0, 0, 0);
      else if (timeframe === 'day') groupedDate.setHours(0, 0, 0, 0);
      else if (timeframe === 'week') {
        const startOfMonth = new Date(groupedDate.getFullYear(), groupedDate.getMonth(), 1);
        const daysSinceMonthStart = Math.floor((groupedDate - startOfMonth) / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor(daysSinceMonthStart / 7) + 1; // Week 1, Week 2, etc.
        groupedDate.setDate(1 + (weekNumber - 1) * 7); // Start of the week
        groupedDate.setHours(0, 0, 0, 0);
      }
      return groupedDate.toISOString();
    };

    const sentimentTrend = new Map();

    feedback.forEach((item) => {
      const timeKey = groupByTimeframe(item.createdAt);

      if (!sentimentTrend.has(timeKey)) {
        sentimentTrend.set(timeKey, {
          timestamp: new Date(timeKey),
          positive: { count: 0, percentage: 0 },
          neutral: { count: 0, percentage: 0 },
          negative: { count: 0, percentage: 0 },
          total: 0,
        });
      }

      const record = sentimentTrend.get(timeKey);
      record[item.sentiment].count++;
      record.total++;
    });

    // Calculate percentages
    sentimentTrend.forEach((record) => {
      record.positive.percentage = record.total > 0 ? (record.positive.count / record.total) * 100 : 0;
      record.neutral.percentage = record.total > 0 ? (record.neutral.count / record.total) * 100 : 0;
      record.negative.percentage = record.total > 0 ? (record.negative.count / record.total) * 100 : 0;
    });

    // Convert map to sorted array
    const timeline = Array.from(sentimentTrend.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit);

    // Calculate weekly totals if timeframe is 'week'
    let weeklyTotals = null;
    if (timeframe === 'week') {
      weeklyTotals = {
        positive: 0,
        neutral: 0,
        negative: 0,
        total: 0,
      };

      timeline.forEach((record) => {
        weeklyTotals.positive += record.positive.count;
        weeklyTotals.neutral += record.neutral.count;
        weeklyTotals.negative += record.negative.count;
        weeklyTotals.total += record.total;
      });
    }

    return {
      timeline,
      timeframe,
      weeklyTotals,
      recordCount: timeline.length,
    };
  } catch (error) {
    logger.error(`Get sentiment trend error: ${error.message}`, { error, eventId });
    throw error;
  }
};

exports.getIssueTrend = async (eventId, options = {}) => {
  try {
    const { timeframe = 'hour', limit = 24 } = options;
    
    const records = await SentimentRecord.find({
      event: eventId,
      timeframe
    })
    .sort({ timestamp: -1 })
    .limit(limit);

    const issueTypes = new Set();
    records.forEach(record => {
      Object.keys(record.issues).forEach(issue => {
        if (record.issues[issue] > 0) {
          issueTypes.add(issue);
        }
      });
    });

    const timeline = records.map(record => {
      const data = {
        timestamp: record.timestamp,
        total: record.data.negative.count
      };
      

      issueTypes.forEach(issue => {
        data[issue] = record.issues[issue] || 0;
      });
      
      return data;
    }).reverse(); 
    
    return {
      timeline,
      timeframe,
      issueTypes: Array.from(issueTypes),
      recordCount: records.length
    };
  } catch (error) {
    logger.error(`Get issue trend error: ${error.message}`, { error, eventId });
    throw error;
  }
};

exports.getSourceDistribution = async (eventId, options = {}) => {
  try {
    const { startTime, endTime } = options;
    

    const query = { event: eventId };
    
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }
    

    const feedback = await Feedback.find(query);
    

    const sourceCounts = {};
    let total = 0;
    
    feedback.forEach(item => {
      if (!sourceCounts[item.source]) {
        sourceCounts[item.source] = {
          count: 0,
          sentiment: {
            positive: 0,
            neutral: 0,
            negative: 0
          }
        };
      }
      
      sourceCounts[item.source].count++;
      sourceCounts[item.source].sentiment[item.sentiment]++;
      total++;
    });
    
    const distribution = Object.entries(sourceCounts).map(([source, data]) => ({
      source,
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      sentiment: {
        positive: {
          count: data.sentiment.positive,
          percentage: data.count > 0 ? (data.sentiment.positive / data.count) * 100 : 0
        },
        neutral: {
          count: data.sentiment.neutral,
          percentage: data.count > 0 ? (data.sentiment.neutral / data.count) * 100 : 0
        },
        negative: {
          count: data.sentiment.negative,
          percentage: data.count > 0 ? (data.sentiment.negative / data.count) * 100 : 0
        }
      }
    })).sort((a, b) => b.count - a.count);
    
    return {
      distribution,
      total
    };
  } catch (error) {
    logger.error(`Get source distribution error: ${error.message}`, { error, eventId });
    throw error;
  }
};

exports.getFeedbackVolume = async (eventId, options = {}) => {
  try {
    const { 
      groupBy = 'hour', 
      startTime, 
      endTime 
    } = options;
    

    const query = { event: eventId };
    
    if (startTime || endTime) {
      query.createdAt = {};
      if (startTime) query.createdAt.$gte = new Date(startTime);
      if (endTime) query.createdAt.$lte = new Date(endTime);
    }

    let groupFormat;
    
    switch (groupBy) {
      case 'minute':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' },
          minute: { $minute: '$createdAt' }
        };
        break;
      case 'hour':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
        break;
      case 'day':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      default:
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        };
    }

    const volumeData = await Feedback.aggregate([
      { $match: query },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          positive: {
            $sum: {
              $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0]
            }
          },
          neutral: {
            $sum: {
              $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0]
            }
          },
          negative: {
            $sum: {
              $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    const volume = volumeData.map(item => {
      const date = new Date(
        item._id.year,
        item._id.month - 1,
        item._id.day,
        item._id.hour || 0,
        item._id.minute || 0
      );
      
      return {
        timestamp: date,
        count: item.count,
        positive: item.positive,
        neutral: item.neutral,
        negative: item.negative
      };
    });
    
    return {
      volume,
      groupBy,
      total: volume.reduce((sum, item) => sum + item.count, 0)
    };
  } catch (error) {
    logger.error(`Get feedback volume error: ${error.message}`, { error, eventId });
    throw error;
  }
};

exports.recalculateHistoricalData = async (eventId) => {
  try {
 
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    await SentimentRecord.deleteMany({ event: eventId });
    
    const feedback = await Feedback.find({ event: eventId });
    
    logger.info(`Recalculating sentiment data for event ${eventId}: ${feedback.length} feedback items`);
    
    const minuteRecords = new Map();
    const hourRecords = new Map();
    const dayRecords = new Map();
    
    for (const item of feedback) {

      const date = new Date(item.createdAt);
      
      const minuteDate = new Date(date);
      minuteDate.setSeconds(0, 0);
      const minuteKey = minuteDate.toISOString();
      
      const hourDate = new Date(date);
      hourDate.setMinutes(0, 0, 0);
      const hourKey = hourDate.toISOString();
      

      const dayDate = new Date(date);
      dayDate.setHours(0, 0, 0, 0);
      const dayKey = dayDate.toISOString();
      
      if (!minuteRecords.has(minuteKey)) {
        minuteRecords.set(minuteKey, {
          timestamp: minuteDate,
          data: { positive: 0, neutral: 0, negative: 0, total: 0 },
          sources: {},
          issues: {}
        });
      }
      
      if (!hourRecords.has(hourKey)) {
        hourRecords.set(hourKey, {
          timestamp: hourDate,
          data: { positive: 0, neutral: 0, negative: 0, total: 0 },
          sources: {},
          issues: {}
        });
      }
      
      if (!dayRecords.has(dayKey)) {
        dayRecords.set(dayKey, {
          timestamp: dayDate,
          data: { positive: 0, neutral: 0, negative: 0, total: 0 },
          sources: {},
          issues: {}
        });
      }
      
      [
        [minuteRecords, minuteKey],
        [hourRecords, hourKey],
        [dayRecords, dayKey]
      ].forEach(([records, key]) => {
        const record = records.get(key);
        
        record.data[item.sentiment]++;
        record.data.total++;
        
        if (!record.sources[item.source]) {
          record.sources[item.source] = 0;
        }
        record.sources[item.source]++;
        
        if (item.sentiment === 'negative' && item.issueType) {
          if (!record.issues[item.issueType]) {
            record.issues[item.issueType] = 0;
          }
          record.issues[item.issueType]++;
        }
      });
    }
    
    const createRecords = async (records, timeframe) => {
      const newRecords = [];
      
      for (const [key, data] of records.entries()) {
        const record = new SentimentRecord({
          event: eventId,
          timeframe,
          timestamp: data.timestamp,
          data: {
            positive: {
              count: data.data.positive,
              avgScore: 0 
            },
            neutral: {
              count: data.data.neutral,
              avgScore: 0
            },
            negative: {
              count: data.data.negative,
              avgScore: 0
            },
            total: data.data.total
          },
          sources: data.sources,
          issues: data.issues
        });
        
        newRecords.push(record);
      }
      
      if (newRecords.length > 0) {
        await SentimentRecord.insertMany(newRecords);
      }
      
      return newRecords.length;
    };
    
    const minuteCount = await createRecords(minuteRecords, 'minute');
    const hourCount = await createRecords(hourRecords, 'hour');
    const dayCount = await createRecords(dayRecords, 'day');
    
    logger.info(`Recalculation complete for event ${eventId}: ${minuteCount} minute records, ${hourCount} hour records, ${dayCount} day records`);
    
    return {
      success: true,
      recordCounts: {
        minute: minuteCount,
        hour: hourCount,
        day: dayCount
      },
      feedbackCount: feedback.length
    };
  } catch (error) {
    logger.error(`Recalculate historical data error: ${error.message}`, { error, eventId });
    throw error;
  }
};