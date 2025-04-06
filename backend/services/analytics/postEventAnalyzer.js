const Event = require('../../models/Event');
const Alert = require('../../models/Alert');
const Feedback = require('../../models/Feedback');
const Issue = require('../../models/Issue');
const SentimentRecord = require('../../models/SentimentRecord');
const logger = require('../../utils/logger');

class PostEventAnalyzer {
  /**
   * Generate a comprehensive post-event analysis report
   * @param {string} eventId - Event ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Post-event analysis report
   */
  static async generatePostEventReport(eventId, options = {}) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      const now = new Date();
      const eventEndDate = new Date(event.endDate);
      
      // Allow generation of report if event has ended or is within 24 hours of ending
      const eventEnded = now > eventEndDate;
      const nearEnd = Math.abs(now - eventEndDate) < 24 * 60 * 60 * 1000;
      
      if (!options.force && !eventEnded && !nearEnd) {
        throw new Error('Cannot generate post-event report for an active event that is not near conclusion');
      }

      // Parallel data fetching for performance
      const [
        feedbackData,
        alertsData,
        issuesData,
        sentimentData
      ] = await Promise.all([
        this.analyzeFeedback(eventId),
        this.analyzeAlerts(eventId),
        this.analyzeIssues(eventId),
        this.analyzeSentimentTrends(eventId)
      ]);

      // Generate key insights based on collected data
      const insights = this.generateKeyInsights(
        feedbackData,
        alertsData,
        issuesData,
        sentimentData,
        event
      );

      // Compile complete report
      return {
        event: {
          id: event._id,
          name: event.name,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location
        },
        reportGeneratedAt: new Date(),
        eventStatus: eventEnded ? 'completed' : 'active',
        summary: this.generateExecutiveSummary(
          feedbackData,
          alertsData,
          issuesData,
          sentimentData
        ),
        feedback: feedbackData,
        alerts: alertsData,
        issues: issuesData,
        sentiment: sentimentData,
        insights: insights,
        improvement: this.generateImprovementRecommendations(
          feedbackData,
          alertsData,
          issuesData,
          sentimentData
        )
      };
    } catch (error) {
      logger.error(`Post-event report generation error: ${error.message}`, { error, eventId });
      throw error;
    }
  }

  /**
   * Analyze feedback data for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Feedback analysis data
   */
  static async analyzeFeedback(eventId) {
    try {
      const feedback = await Feedback.find({ event: eventId });

      // Calculate sentiment distribution
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      const sourceCounts = {};
      const issueTypes = {};
      const topPositiveFeedback = [];
      const topNegativeFeedback = [];
      
      let totalSentimentScore = 0;

      feedback.forEach(item => {
        // Count sentiments
        sentimentCounts[item.sentiment]++;
        totalSentimentScore += item.sentimentScore || 0;
        
        // Count sources
        if (!sourceCounts[item.source]) {
          sourceCounts[item.source] = 0;
        }
        sourceCounts[item.source]++;
        
        // Count issue types for negative feedback
        if (item.sentiment === 'negative' && item.issueType) {
          if (!issueTypes[item.issueType]) {
            issueTypes[item.issueType] = 0;
          }
          issueTypes[item.issueType]++;
        }
        
        // Collect top feedback examples
        if (item.sentiment === 'positive') {
          if (topPositiveFeedback.length < 5) {
            topPositiveFeedback.push({
              id: item._id,
              text: item.text,
              source: item.source,
              score: item.sentimentScore,
              createdAt: item.createdAt
            });
          } else {
            // Replace if this has a higher score
            const lowest = topPositiveFeedback.reduce((min, fb) => 
              fb.score < min.score ? fb : min, topPositiveFeedback[0]);
            
            if ((item.sentimentScore || 0) > lowest.score) {
              const index = topPositiveFeedback.indexOf(lowest);
              topPositiveFeedback[index] = {
                id: item._id,
                text: item.text,
                source: item.source,
                score: item.sentimentScore,
                createdAt: item.createdAt
              };
            }
          }
        } else if (item.sentiment === 'negative') {
          if (topNegativeFeedback.length < 5) {
            topNegativeFeedback.push({
              id: item._id,
              text: item.text,
              source: item.source,
              score: item.sentimentScore,
              issueType: item.issueType,
              createdAt: item.createdAt
            });
          } else {
            // Replace if this has a lower score (more negative)
            const highest = topNegativeFeedback.reduce((max, fb) => 
              fb.score > max.score ? fb : max, topNegativeFeedback[0]);
            
            if ((item.sentimentScore || 0) < highest.score) {
              const index = topNegativeFeedback.indexOf(highest);
              topNegativeFeedback[index] = {
                id: item._id,
                text: item.text,
                source: item.source,
                score: item.sentimentScore,
                issueType: item.issueType,
                createdAt: item.createdAt
              };
            }
          }
        }
      });

      // Sort feedback examples by score
      topPositiveFeedback.sort((a, b) => b.score - a.score);
      topNegativeFeedback.sort((a, b) => a.score - b.score);

      // Format sentiment percentages
      const total = feedback.length;
      const sentimentPercentages = {};
      Object.keys(sentimentCounts).forEach(sentiment => {
        sentimentPercentages[sentiment] = total > 0 
          ? (sentimentCounts[sentiment] / total) * 100 
          : 0;
      });

      // Format sources percentages
      const sourcePercentages = {};
      Object.keys(sourceCounts).forEach(source => {
        sourcePercentages[source] = total > 0 
          ? (sourceCounts[source] / total) * 100 
          : 0;
      });

      // Format issues percentages and sort by frequency
      const negativeTotal = sentimentCounts.negative;
      const issuePercentages = {};
      Object.keys(issueTypes).forEach(issue => {
        issuePercentages[issue] = negativeTotal > 0 
          ? (issueTypes[issue] / negativeTotal) * 100 
          : 0;
      });

      // Top issues by count
      const topIssues = Object.entries(issueTypes)
        .map(([issue, count]) => ({ issue, count, percentage: issuePercentages[issue] }))
        .sort((a, b) => b.count - a.count);

      // Calculate overall sentiment metrics
      const averageSentimentScore = total > 0 ? totalSentimentScore / total : 0;
      const netSentimentScore = ((sentimentPercentages.positive - sentimentPercentages.negative) / 100).toFixed(2);

      return {
        total,
        sentimentCounts,
        sentimentPercentages,
        sourceCounts,
        sourcePercentages,
        issueTypes,
        issuePercentages,
        topIssues: topIssues.slice(0, 5),
        topPositiveFeedback,
        topNegativeFeedback,
        averageSentimentScore,
        netSentimentScore
      };
    } catch (error) {
      logger.error(`Analyze feedback error: ${error.message}`, { error, eventId });
      throw error;
    }
  }

  /**
   * Analyze alerts data for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Alerts analysis data
   */
  static async analyzeAlerts(eventId) {
    try {
      const alerts = await Alert.find({ event: eventId });

      // Calculate alert statistics
      const typeCounts = { sentiment: 0, issue: 0, trend: 0, system: 0 };
      const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
      const categoryCounts = {};
      const statusCounts = { new: 0, acknowledged: 0, inProgress: 0, resolved: 0, ignored: 0 };
      
      // Response time tracking
      let totalResponseTime = 0;
      let resolvedCount = 0;
      let criticalResponseTime = 0;
      let criticalCount = 0;

      // Timeline data
      const alertsByDay = {};

      alerts.forEach(alert => {
        // Count alert types
        typeCounts[alert.type]++;
        
        // Count severities
        severityCounts[alert.severity]++;
        
        // Count categories
        if (!categoryCounts[alert.category]) {
          categoryCounts[alert.category] = 0;
        }
        categoryCounts[alert.category]++;
        
        // Count statuses
        statusCounts[alert.status]++;
        
        // Calculate response times for resolved alerts
        if (alert.status === 'resolved' && alert.resolvedAt) {
          const responseTime = new Date(alert.resolvedAt) - new Date(alert.createdAt);
          totalResponseTime += responseTime;
          resolvedCount++;
          
          // Track critical alert response times separately
          if (alert.severity === 'critical') {
            criticalResponseTime += responseTime;
            criticalCount++;
          }
        }
        
        // Organize alerts by day for timeline
        const day = new Date(alert.createdAt).toISOString().split('T')[0];
        if (!alertsByDay[day]) {
          alertsByDay[day] = {
            date: day,
            count: 0,
            resolved: 0,
            byType: { sentiment: 0, issue: 0, trend: 0, system: 0 },
            bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
          };
        }
        
        alertsByDay[day].count++;
        alertsByDay[day].byType[alert.type]++;
        alertsByDay[day].bySeverity[alert.severity]++;
        
        if (alert.status === 'resolved') {
          alertsByDay[day].resolved++;
        }
      });

      // Calculate averages and percentages
      const totalAlerts = alerts.length;
      const averageResponseTimeMs = resolvedCount > 0 ? totalResponseTime / resolvedCount : 0;
      const criticalResponseTimeMs = criticalCount > 0 ? criticalResponseTime / criticalCount : 0;
      
      // Convert to minutes for readability
      const averageResponseTimeMinutes = Math.floor(averageResponseTimeMs / 1000 / 60);
      const criticalResponseTimeMinutes = Math.floor(criticalResponseTimeMs / 1000 / 60);
      
      // Sort day timeline
      const timeline = Object.values(alertsByDay).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      // Calculate resolution rate
      const resolutionRate = totalAlerts > 0 
        ? (statusCounts.resolved / totalAlerts) * 100 
        : 0;

      // Top categories by count
      const topCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ 
          category, 
          count, 
          percentage: totalAlerts > 0 ? (count / totalAlerts) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count);

      return {
        total: totalAlerts,
        typeCounts,
        severityCounts,
        categoryCounts,
        statusCounts,
        topCategories: topCategories.slice(0, 5),
        resolutionRate,
        averageResponseTimeMinutes,
        criticalResponseTimeMinutes,
        timeline
      };
    } catch (error) {
      logger.error(`Analyze alerts error: ${error.message}`, { error, eventId });
      throw error;
    }
  }

  /**
   * Analyze issues data for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Issues analysis data
   */
  static async analyzeIssues(eventId) {
    try {
      const issues = await Issue.find({ event: eventId });

      // Calculate issue statistics
      const typeCounts = {};
      const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
      const statusCounts = { detected: 0, confirmed: 0, inProgress: 0, resolved: 0, falsePositive: 0 };
      const locationCounts = {};
      
      let totalResolutionTime = 0;
      let resolvedCount = 0;
      
      issues.forEach(issue => {
        // Count issue types
        if (!typeCounts[issue.type]) {
          typeCounts[issue.type] = 0;
        }
        typeCounts[issue.type]++;
        
        // Count severities
        severityCounts[issue.severity]++;
        
        // Count statuses
        statusCounts[issue.status]++;
        
        // Count locations if available
        if (issue.location) {
          if (!locationCounts[issue.location]) {
            locationCounts[issue.location] = 0;
          }
          locationCounts[issue.location]++;
        }
        
        // Calculate resolution times for resolved issues
        if (issue.status === 'resolved' && issue.resolvedAt) {
          const resolutionTime = new Date(issue.resolvedAt) - new Date(issue.createdAt);
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });

      // Calculate averages and percentages
      const totalIssues = issues.length;
      const averageResolutionTimeMs = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
      const averageResolutionTimeMinutes = Math.floor(averageResolutionTimeMs / 1000 / 60);
      
      // Calculate resolution rate
      const resolutionRate = totalIssues > 0 
        ? ((statusCounts.resolved + statusCounts.falsePositive) / totalIssues) * 100 
        : 0;

      // Top issue types by frequency
      const topIssueTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ 
          type, 
          count, 
          percentage: totalIssues > 0 ? (count / totalIssues) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count);

      // Top locations by count
      const topLocations = Object.entries(locationCounts)
        .map(([location, count]) => ({ 
          location, 
          count, 
          percentage: totalIssues > 0 ? (count / totalIssues) * 100 : 0 
        }))
        .sort((a, b) => b.count - a.count);

      return {
        total: totalIssues,
        typeCounts,
        severityCounts,
        statusCounts,
        locationCounts,
        topIssueTypes: topIssueTypes.slice(0, 5),
        topLocations: topLocations.slice(0, 5),
        resolutionRate,
        averageResolutionTimeMinutes,
        unresolvedCount: totalIssues - statusCounts.resolved - statusCounts.falsePositive
      };
    } catch (error) {
      logger.error(`Analyze issues error: ${error.message}`, { error, eventId });
      throw error;
    }
  }

  /**
   * Analyze sentiment trends for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Sentiment trend analysis data
   */
  static async analyzeSentimentTrends(eventId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      // Get sentiment records for hourly and daily views
      const hourlyRecords = await SentimentRecord.find({
        event: eventId,
        timeframe: 'hour'
      }).sort({ timestamp: 1 });

      const dailyRecords = await SentimentRecord.find({
        event: eventId,
        timeframe: 'day'
      }).sort({ timestamp: 1 });

      // Calculate event day blocks (for multi-day events)
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const eventDayCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      const eventDays = [];
      for (let i = 0; i < eventDayCount; i++) {
        const day = new Date(startDate);
        day.setDate(day.getDate() + i);
        eventDays.push(day.toISOString().split('T')[0]);
      }

      // Process hourly records
      const hourly = {
        timeline: hourlyRecords.map(record => ({
          timestamp: record.timestamp,
          positive: record.data.positive.count,
          neutral: record.data.neutral.count,
          negative: record.data.negative.count,
          total: record.data.total,
          sentiment: {
            positive: record.data.total > 0 
              ? (record.data.positive.count / record.data.total) * 100 
              : 0,
            neutral: record.data.total > 0 
              ? (record.data.neutral.count / record.data.total) * 100 
              : 0,
            negative: record.data.total > 0 
              ? (record.data.negative.count / record.data.total) * 100 
              : 0
          }
        }))
      };

      // Process daily records
      const daily = {
        timeline: dailyRecords.map(record => ({
          timestamp: record.timestamp,
          positive: record.data.positive.count,
          neutral: record.data.neutral.count,
          negative: record.data.negative.count,
          total: record.data.total,
          sentiment: {
            positive: record.data.total > 0 
              ? (record.data.positive.count / record.data.total) * 100 
              : 0,
            neutral: record.data.total > 0 
              ? (record.data.neutral.count / record.data.total) * 100 
              : 0,
            negative: record.data.total > 0 
              ? (record.data.negative.count / record.data.total) * 100 
              : 0
          }
        }))
      };

      // Calculate per-day feedback volume
      const dailyVolume = {};
      eventDays.forEach(day => {
        dailyVolume[day] = {
          date: day,
          total: 0,
          positive: 0,
          neutral: 0, 
          negative: 0
        };
      });

      // Fill with actual data
      daily.timeline.forEach(day => {
        const dateStr = new Date(day.timestamp).toISOString().split('T')[0];
        if (dailyVolume[dateStr]) {
          dailyVolume[dateStr].total = day.total;
          dailyVolume[dateStr].positive = day.positive;
          dailyVolume[dateStr].neutral = day.neutral;
          dailyVolume[dateStr].negative = day.negative;
        }
      });

      // Find peak periods and sentiment turning points
      const peakVolumePeriod = hourly.timeline.reduce((max, period) => 
        period.total > max.total ? period : max, 
        { total: 0 }
      );
      
      // Only include periods with sufficient data for trend analysis
      const significantPeriods = hourly.timeline.filter(period => period.total >= 5);

      const peakNegativePeriod = significantPeriods.reduce((max, period) => 
        (period.negative / period.total) > (max.negative / max.total) ? period : max, 
        { negative: 0, total: 1 }
      );

      const peakPositivePeriod = significantPeriods.reduce((max, period) => 
        (period.positive / period.total) > (max.positive / max.total) ? period : max, 
        { positive: 0, total: 1 }
      );

      // Find sentiment changes/turning points
      const sentimentChanges = [];
      for (let i = 1; i < significantPeriods.length; i++) {
        const prevPeriod = significantPeriods[i-1];
        const currPeriod = significantPeriods[i];
        
        const prevNegPercent = (prevPeriod.negative / prevPeriod.total) * 100;
        const currNegPercent = (currPeriod.negative / currPeriod.total) * 100;
        
        const change = currNegPercent - prevNegPercent;
        
        // Only record significant changes (>15%)
        if (Math.abs(change) >= 15) {
          sentimentChanges.push({
            from: prevPeriod.timestamp,
            to: currPeriod.timestamp,
            changePct: change.toFixed(1),
            direction: change > 0 ? 'negative' : 'positive'
          });
        }
      }

      return {
        hourly,
        daily,
        dailyVolume: Object.values(dailyVolume),
        peakVolumePeriod,
        peakNegativePeriod,
        peakPositivePeriod,
        sentimentChanges: sentimentChanges.slice(0, 5), // Top 5 most significant changes
        eventDayCount
      };
    } catch (error) {
      logger.error(`Analyze sentiment trends error: ${error.message}`, { error, eventId });
      throw error;
    }
  }

  /**
   * Generate executive summary from analyzed data
   * @param {Object} feedbackData - Feedback analysis data
   * @param {Object} alertsData - Alerts analysis data
   * @param {Object} issuesData - Issues analysis data
   * @param {Object} sentimentData - Sentiment trend analysis data
   * @returns {Object} Executive summary
   */
  static generateExecutiveSummary(feedbackData, alertsData, issuesData, sentimentData) {
    // Overall success score (0-100)
    let overallScore = 50; // Start at neutral

    // Feedback component (40% weight)
    const sentimentScore = Math.min(100, Math.max(0, 
      50 + (parseFloat(feedbackData.netSentimentScore) * 50)
    ));
    
    // Issues component (30% weight)
    const issueScore = Math.min(100, Math.max(0, 
      issuesData.resolutionRate
    ));
    
    // Alerts component (30% weight)
    const alertScore = Math.min(100, Math.max(0, 
      alertsData.resolutionRate
    ));
    
    // Calculate weighted score
    overallScore = Math.round(
      (sentimentScore * 0.4) + 
      (issueScore * 0.3) + 
      (alertScore * 0.3)
    );

    // Determine success level
    let successLevel;
    if (overallScore >= 90) {
      successLevel = 'exceptional';
    } else if (overallScore >= 75) {
      successLevel = 'successful';
    } else if (overallScore >= 60) {
      successLevel = 'satisfactory';
    } else if (overallScore >= 40) {
      successLevel = 'mixed';
    } else if (overallScore >= 25) {
      successLevel = 'challenging';
    } else {
      successLevel = 'problematic';
    }

    // Determine primary feedback source
    let primarySource = 'direct';
    let maxSourceCount = 0;
    Object.entries(feedbackData.sourceCounts).forEach(([source, count]) => {
      if (count > maxSourceCount) {
        primarySource = source;
        maxSourceCount = count;
      }
    });

    return {
      overallScore,
      successLevel,
      feedbackTotal: feedbackData.total,
      topIssueType: feedbackData.topIssues.length > 0 ? feedbackData.topIssues[0].issue : 'none',
      primarySentiment: feedbackData.sentimentPercentages.positive > feedbackData.sentimentPercentages.negative 
        ? 'positive' 
        : 'negative',
      sentimentRatio: `${Math.round(feedbackData.sentimentPercentages.positive)}/${Math.round(feedbackData.sentimentPercentages.negative)}`,
      netSentimentScore: feedbackData.netSentimentScore,
      primarySource,
      alertsTotal: alertsData.total,
      alertsResolutionRate: alertsData.resolutionRate.toFixed(1),
      averageAlertResponseTime: alertsData.averageResponseTimeMinutes,
      issuesTotal: issuesData.total,
      issuesResolutionRate: issuesData.resolutionRate.toFixed(1),
      unresolvedIssuesCount: issuesData.unresolvedCount
    };
  }

  /**
   * Generate key insights from analyzed data
   * @param {Object} feedbackData - Feedback analysis data
   * @param {Object} alertsData - Alerts analysis data
   * @param {Object} issuesData - Issues analysis data
   * @param {Object} sentimentData - Sentiment trend analysis data
   * @param {Object} event - Event data
   * @returns {Array} Key insights list
   */
  static generateKeyInsights(feedbackData, alertsData, issuesData, sentimentData, event) {
    const insights = [];

    // Event scale insight
    const eventLength = Math.ceil((new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24));
    insights.push({
      type: 'info',
      title: 'Event Scale',
      content: `${event.name} ran for ${eventLength} days with ${feedbackData.total} pieces of feedback collected.`
    });

    // Sentiment insight
    if (feedbackData.sentimentPercentages.positive > 75) {
      insights.push({
        type: 'positive',
        title: 'Overwhelmingly Positive Feedback',
        content: `The event received exceptionally positive feedback with ${Math.round(feedbackData.sentimentPercentages.positive)}% positive sentiment.`
      });
    } else if (feedbackData.sentimentPercentages.positive > 60) {
      insights.push({
        type: 'positive',
        title: 'Generally Positive Reception',
        content: `The event was well-received with ${Math.round(feedbackData.sentimentPercentages.positive)}% positive feedback.`
      });
    } else if (feedbackData.sentimentPercentages.negative > 50) {
      insights.push({
        type: 'negative',
        title: 'Predominantly Negative Reception',
        content: `The event faced significant challenges with ${Math.round(feedbackData.sentimentPercentages.negative)}% negative feedback.`
      });
    } else {
      insights.push({
        type: 'neutral',
        title: 'Mixed Reception',
        content: `The event received mixed feedback with ${Math.round(feedbackData.sentimentPercentages.positive)}% positive, ${Math.round(feedbackData.sentimentPercentages.neutral)}% neutral, and ${Math.round(feedbackData.sentimentPercentages.negative)}% negative sentiment.`
      });
    }

    // Top issues insight
    if (feedbackData.topIssues.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Primary Reported Issues',
        content: `The most common issue type was "${feedbackData.topIssues[0].issue}" (${Math.round(feedbackData.topIssues[0].percentage)}% of negative feedback), followed by ${feedbackData.topIssues.length > 1 ? `"${feedbackData.topIssues[1].issue}" (${Math.round(feedbackData.topIssues[1].percentage)}%)` : 'no other significant issues'}.`
      });
    }

    // Alert response insight
    if (alertsData.total > 0) {
      if (alertsData.resolutionRate > 90) {
        insights.push({
          type: 'positive',
          title: 'Excellent Alert Management',
          content: `The team resolved ${Math.round(alertsData.resolutionRate)}% of alerts with an average response time of ${alertsData.averageResponseTimeMinutes} minutes.`
        });
      } else if (alertsData.resolutionRate < 50) {
        insights.push({
          type: 'negative',
          title: 'Alert Management Challenges',
          content: `Only ${Math.round(alertsData.resolutionRate)}% of alerts were resolved, with ${alertsData.statusCounts.new} alerts left unaddressed.`
        });
      }
    }

    // Critical issue insight
    if (issuesData.severityCounts.critical > 0) {
      insights.push({
        type: 'warning',
        title: 'Critical Issues Detected',
        content: `${issuesData.severityCounts.critical} critical issues were detected during the event.`
      });
    }

    // Engagement pattern insights
    if (sentimentData.dailyVolume.length > 1) {
      const maxVolumeDay = sentimentData.dailyVolume.reduce((max, day) => 
        day.total > max.total ? day : max, 
        sentimentData.dailyVolume[0]
      );
      
      const firstDay = sentimentData.dailyVolume[0];
      const lastDay = sentimentData.dailyVolume[sentimentData.dailyVolume.length - 1];
      
      insights.push({
        type: 'info',
        title: 'Engagement Pattern',
        content: `Peak engagement occurred on ${new Date(maxVolumeDay.date).toLocaleDateString()} with ${maxVolumeDay.total} feedback items. ${
          maxVolumeDay.date === firstDay.date 
            ? 'Engagement was highest on the first day and declined thereafter.'
            : maxVolumeDay.date === lastDay.date
              ? 'Engagement built gradually and peaked on the final day.'
              : 'Engagement peaked in the middle of the event.'
        }`
      });
    }

    // Sentiment trends
    if (sentimentData.sentimentChanges.length > 0) {
      const significantChange = sentimentData.sentimentChanges[0];
      insights.push({
        type: significantChange.direction === 'negative' ? 'warning' : 'positive',
        title: 'Significant Sentiment Shift',
        content: `A ${Math.abs(significantChange.changePct)}% shift toward ${significantChange.direction} sentiment was detected between ${new Date(significantChange.from).toLocaleString()} and ${new Date(significantChange.to).toLocaleString()}.`
      });
    }
    
    // Source insights
    const sourceEntries = Object.entries(feedbackData.sourcePercentages);
    if (sourceEntries.length > 1) {
      sourceEntries.sort((a, b) => b[1] - a[1]);
      const [topSource, topPercentage] = sourceEntries[0];
      insights.push({
        type: 'info',
        title: 'Feedback Channels',
        content: `${Math.round(topPercentage)}% of feedback came from ${topSource}, making it the most active channel.`
      });
    }

    return insights;
  }

  /**
   * Generate improvement recommendations based on analytics
   * @param {Object} feedbackData - Feedback analysis data
   * @param {Object} alertsData - Alerts analysis data
   * @param {Object} issuesData - Issues analysis data
   * @param {Object} sentimentData - Sentiment trend analysis data
   * @returns {Array} Improvement recommendations
   */
  static generateImprovementRecommendations(feedbackData, alertsData, issuesData, sentimentData) {
    const recommendations = [];
    
    // Issues-based recommendations
    if (feedbackData.topIssues.length > 0) {
      const topIssue = feedbackData.topIssues[0];
      
      switch (topIssue.issue) {
        case 'queue':
          recommendations.push({
            area: 'Logistics',
            title: 'Improve Queue Management',
            description: 'Reduce waiting times by adding more entry points, implementing timed entry tickets, or using digital queues with mobile notifications.',
            priority: topIssue.percentage > 30 ? 'high' : 'medium'
          });
          break;
          
        case 'audio':
          recommendations.push({
            area: 'Technical',
            title: 'Enhance Audio Setup',
            description: 'Invest in better audio equipment, perform more thorough sound checks, and consider acoustic treatments for venues with echo problems.',
            priority: topIssue.percentage > 30 ? 'high' : 'medium'
          });
          break;
          
        case 'video':
          recommendations.push({
            area: 'Technical',
            title: 'Improve Visual Displays',
            description: 'Use higher brightness projectors, larger screens, or multiple displays to ensure visibility from all areas.',
            priority: topIssue.percentage > 30 ? 'high' : 'medium'
          });
          break;
          
        case 'crowding':
          recommendations.push({
            area: 'Venue',
            title: 'Address Space Management',
            description: 'Consider larger venues, reduce ticket sales, or improve space utilization with better layout design.',
            priority: topIssue.percentage > 30 ? 'high' : 'medium'
          });
          break;
          
        case 'amenities':
          recommendations.push({
            area: 'Services',
            title: 'Enhance Attendee Amenities',
            description: 'Improve food/beverage options, add more restroom facilities, or enhance seating comfort based on specific complaints.',
            priority: topIssue.percentage > 30 ? 'high' : 'medium'
          });
          break;
          
        case 'content':
          recommendations.push({
            area: 'Programming',
            title: 'Refine Event Content',
            description: 'More carefully curate speakers, add more interactive elements, or diversify session formats to improve engagement.',
            priority: topIssue.percentage > 30 ? 'high' : 'medium'
          });
          break;
          
        case 'temperature':
          recommendations.push({
            area: 'Venue',
            title: 'Improve Climate Control',
            description: 'Better manage venue temperature settings and consider seasonal factors when planning future events.',
            priority: topIssue.percentage > 25 ? 'high' : 'medium'
          });
          break;
          
        case 'safety':
          recommendations.push({
            area: 'Security',
            title: 'Enhance Safety Measures',
            description: 'Review and improve security protocols, emergency procedures, and staff training for safety situations.',
            priority: 'high'
          });
          break;
          
        default:
          recommendations.push({
            area: 'General',
            title: `Address ${topIssue.issue} Issues`,
            description: `Review feedback related to ${topIssue.issue} and develop specific improvements for future events.`,
            priority: topIssue.percentage > 25 ? 'high' : 'medium'
          });
      }
    }
    
    // Alert response recommendations
    if (alertsData.resolutionRate < 70) {
      recommendations.push({
        area: 'Operations',
        title: 'Improve Alert Response System',
        description: 'Enhance staff training on alert management, implement clearer escalation procedures, and ensure adequate staffing for issue resolution.',
        priority: 'high'
      });
    }
    
    if (alertsData.averageResponseTimeMinutes > 30 && alertsData.total > 5) {
      recommendations.push({
        area: 'Operations',
        title: 'Decrease Alert Response Time',
        description: `Current average response time of ${alertsData.averageResponseTimeMinutes} minutes should be reduced by implementing rapid response teams and improving alert notification systems.`,
        priority: 'medium'
      });
    }
    
    // Sentiment-based recommendations
    if (feedbackData.sentimentPercentages.negative > 30) {
      recommendations.push({
        area: 'Customer Experience',
        title: 'Address Negative Sentiment Patterns',
        description: 'Conduct deeper analysis of negative feedback, identifying specific pain points and developing targeted improvements.',
        priority: 'high'
      });
    }
    
    // Feedback volume recommendations
    const feedbackPerDay = feedbackData.total / sentimentData.eventDayCount;
    if (feedbackPerDay < 10 && feedbackData.total > 0) {
      recommendations.push({
        area: 'Feedback Collection',
        title: 'Increase Feedback Collection',
        description: 'Implement more aggressive feedback collection through prominent QR codes, email follow-ups, and incentives for providing feedback.',
        priority: 'medium'
      });
    }
    
    // Source-based recommendations
    const sourceEntries = Object.entries(feedbackData.sourcePercentages);
    if (sourceEntries.length <= 2) {
      recommendations.push({
        area: 'Monitoring',
        title: 'Diversify Feedback Channels',
        description: 'Expand monitoring across more platforms including social media, event app, email surveys, and on-site kiosks to capture a wider range of attendee sentiment.',
        priority: 'medium'
      });
    }
    
    // Add at least one positive reinforcement
    if (feedbackData.sentimentPercentages.positive > 60) {
      let reinforceArea = 'overall experience';
      
      if (feedbackData.topPositiveFeedback.length > 0) {
        // Try to identify what people liked from the positive feedback
        const positiveText = feedbackData.topPositiveFeedback.map(f => f.text).join(' ').toLowerCase();
        
        if (positiveText.includes('speaker') || positiveText.includes('presentation') || positiveText.includes('content')) {
          reinforceArea = 'content and speakers';
        } else if (positiveText.includes('food') || positiveText.includes('drink') || positiveText.includes('refreshment')) {
          reinforceArea = 'food and beverage service';
        } else if (positiveText.includes('staff') || positiveText.includes('friendly') || positiveText.includes('helpful')) {
          reinforceArea = 'staff service and friendliness';
        } else if (positiveText.includes('venue') || positiveText.includes('location') || positiveText.includes('facility')) {
          reinforceArea = 'venue selection';
        }
      }
      
      recommendations.push({
        area: 'Strengths',
        title: 'Build on Positive Elements',
        description: `Maintain and enhance the ${reinforceArea}, which received notably positive feedback.`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }
}
module.exports = PostEventAnalyzer;