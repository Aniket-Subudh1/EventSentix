const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const sentimentAnalyzer = require('../services/nlp/sentimentAnalyzer');
const feedQueue = require('../services/realtime/feedQueue');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');


exports.submitFeedback = asyncHandler(async (req, res) => {
  const { event: eventId, text, source = 'direct', location } = req.body;

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (!event.isActive) {
    return res.status(400).json({ success: false, message: 'Event is not active' });
  }

  if (!req.body.sourceId) {
    req.body.sourceId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
  }

  const feedbackData = {
    event: eventId,
    source,
    sourceId: req.body.sourceId,
    text,
    user: typeof req.body.username === 'string' && req.body.username.trim()
      ? req.body.username.trim()
      : 'Anonymous',
    userId: req.body.userId || null,
    issueDetails: { location },
    metadata: {
      platform: req.body.platform || source
    }
  };
  

  try {
    await feedQueue.addWithHighPriority(feedbackData);
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully and is being processed',
      data: {
        eventId,
        source,
        text: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      }
    });
  } catch (error) {
    logger.error(`Queue submission failed, processing directly: ${error.message}`, { error });

    try {
      const processedFeedback = await sentimentAnalyzer.processFeedback(feedbackData);
      const feedback = await Feedback.create(processedFeedback);

      res.status(201).json({
        success: true,
        message: 'Feedback submitted and processed',
        data: feedback
      });
    } catch (dbError) {
      logger.error(`Direct processing also failed: ${dbError.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to process feedback',
        error: dbError.message
      });
    }
  }
});


exports.twitterWebhook = asyncHandler(async (req, res) => {

  const tweetData = req.body;
  
  res.status(200).json({
    success: true,
    message: 'Webhook received'
  });
  
  try {
    const tweetData = req.body;
    
    logger.info('Received Twitter webhook data', { 
      tweetId: tweetData.id_str,
      text: tweetData.text && tweetData.text.substring(0, 50),
      user: tweetData.user && tweetData.user.screen_name
    });
    
    // Extract hashtags from the tweet
    const hashtags = tweetData.entities?.hashtags?.map(h => h.tag.toLowerCase()) || [];
    
    if (hashtags.length === 0) {
      logger.info('Tweet has no hashtags, skipping');
      return;
    }
    
    const events = await Event.find({
      isActive: true,
      'socialTracking.hashtags': { $in: hashtags.map(tag => `#${tag}`) }
    });
    
    if (events.length === 0) {
      logger.info('No matching events found for tweet hashtags');
      return;
    }
    

    for (const event of events) {
      logger.info(`Processing tweet for event: ${event.name} (${event._id})`);
      
      const feedbackData = {
        event: event._id,
        source: 'twitter',
        sourceId: tweetData.id_str,
        text: tweetData.text,
        metadata: {
          username: tweetData.user?.screen_name || 'unknown',
          platform: 'twitter',
          profileUrl: tweetData.user ? `https://twitter.com/${tweetData.user.screen_name}` : null,
          followerCount: tweetData.user?.followers_count || 0,
          hashTags: hashtags,
          mentions: tweetData.entities?.user_mentions?.map(m => m.screen_name) || []
        }
      };
      
      // Process and store the feedback
      try {
        // Use feed queue if available
        await feedQueue.addToQueue(feedbackData);
        logger.info(`Added tweet to processing queue for event ${event._id}`);
      } catch (queueError) {
        logger.error(`Queue submission failed, processing directly: ${queueError.message}`, { error: queueError });
        
        // Direct processing as fallback
        const processedFeedback = await sentimentAnalyzer.processFeedback(feedbackData);
        const feedback = await Feedback.create(processedFeedback);
        
        // Generate alerts
        const alerts = await alertGenerator.generateAlerts(feedback);
        
        logger.info(`Processed tweet directly: ${feedback._id}`, {
          sentiment: feedback.sentiment,
          alertsGenerated: alerts?.length || 0
        });
      }
    }
  } catch (error) {
    logger.error(`Twitter webhook processing error: ${error.message}`, { error });
  }
});


exports.instagramWebhook = asyncHandler(async (req, res) => {

  const instagramData = req.body;
  

  res.status(200).json({
    success: true,
    message: 'Webhook received'
  });
  
  try {

    const hashtags = instagramData.caption?.hashtags || [];
    
    if (hashtags.length === 0) {
      logger.info('Instagram post has no hashtags, skipping');
      return;
    }
    

    const events = await Event.find({
      isActive: true,
      'socialTracking.hashtags': { $in: hashtags.map(tag => `#${tag}`) }
    });
    
    if (events.length === 0) {
      logger.info('No matching events found for Instagram hashtags');
      return;
    }
    
    for (const event of events) {
      const feedbackData = {
        event: event._id,
        source: 'instagram',
        sourceId: instagramData.id,
        text: instagramData.caption?.text || '',
        metadata: {
          username: instagramData.user?.username || 'unknown',
          platform: 'instagram',
          profileUrl: instagramData.user?.profile_url || null,
          followerCount: instagramData.user?.followers_count || 0,
          mediaUrls: [instagramData.media_url],
          hashTags: hashtags,
          mentions: instagramData.caption?.mentions || []
        }
      };
      

      await feedQueue.addToQueue(feedbackData);
    }
  } catch (error) {
    logger.error(`Instagram webhook processing error: ${error.message}`, { error });
  }
});


exports.linkedinWebhook = asyncHandler(async (req, res) => {

  

  const linkedinData = req.body;

  res.status(200).json({
    success: true,
    message: 'Webhook received'
  });
  
  try {

    const hashtags = linkedinData.content?.hashtags || [];
    const mentions = linkedinData.content?.mentions || [];
    
    if (hashtags.length === 0 && mentions.length === 0) {
      logger.info('LinkedIn post has no hashtags or mentions, skipping');
      return;
    }
    
 
    const events = await Event.find({
      isActive: true,
      $or: [
        { 'socialTracking.hashtags': { $in: hashtags.map(tag => `#${tag}`) } },
        { 'socialTracking.mentions': { $in: mentions } }
      ]
    });
    
    if (events.length === 0) {
      logger.info('No matching events found for LinkedIn hashtags/mentions');
      return;
    }
    
 
    for (const event of events) {
      const feedbackData = {
        event: event._id,
        source: 'linkedin',
        sourceId: linkedinData.id,
        text: linkedinData.content?.text || '',
        metadata: {
          username: linkedinData.author?.name || 'unknown',
          platform: 'linkedin',
          profileUrl: linkedinData.author?.profile_url || null,
          followerCount: linkedinData.author?.connections || 0,
          mediaUrls: linkedinData.content?.media_url ? [linkedinData.content.media_url] : [],
          hashTags: hashtags,
          mentions: mentions
        }
      };
      
  
      await feedQueue.addToQueue(feedbackData);
    }
  } catch (error) {
    logger.error(`LinkedIn webhook processing error: ${error.message}`, { error });
  }
});


exports.getEventFeedback = asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;

  if (!eventId || eventId === 'undefined') {
    logger.error('Invalid eventId provided:', { eventId });
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing event ID'
    });
  }

  const query = {
    event: eventId
  };

  // Apply filters if provided
  if (req.query.sentiment) {
    query.sentiment = req.query.sentiment;
  }
  
  if (req.query.source) {
    query.source = req.query.source;
  }
  
  if (req.query.issueType) {
    query.issueType = req.query.issueType;
  }
  
  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    
    if (req.query.startDate) {
      query.createdAt.$gte = new Date(req.query.startDate);
    }
    
    if (req.query.endDate) {
      query.createdAt.$lte = new Date(req.query.endDate);
    }
  }
  
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const startIndex = (page - 1) * limit;
  
  logger.info('Fetching feedback with filters', { query, page, limit });

  const total = await Feedback.countDocuments(query);
  const feedback = await Feedback.find(query)
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: req.query.sort === 'asc' ? 1 : -1 });

  res.status(200).json({
    success: true,
    count: feedback.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: feedback
  });
});

exports.getEventFeedbackStats = asyncHandler(async (req, res) => {
  const sentimentStats = await Feedback.aggregate([
    { $match: { event: req.params.eventId } },
    {
      $group: {
        _id: '$sentiment',
        count: { $sum: 1 }
      }
    }
  ]);
  

  const sourceStats = await Feedback.aggregate([
    { $match: { event: req.params.eventId } },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 }
      }
    }
  ]);
  

  const issueStats = await Feedback.aggregate([
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
        count: { $sum: 1 }
      }
    }
  ]);
  
  const formattedSentiment = {};
  sentimentStats.forEach(item => {
    formattedSentiment[item._id] = item.count;
  });
  
  const formattedSources = {};
  sourceStats.forEach(item => {
    formattedSources[item._id] = item.count;
  });
  
  const formattedIssues = {};
  issueStats.forEach(item => {
    formattedIssues[item._id] = item.count;
  });
  

  const total = await Feedback.countDocuments({ event: req.params.eventId });
  
  res.status(200).json({
    success: true,
    data: {
      total,
      sentiment: formattedSentiment,
      sources: formattedSources,
      issues: formattedIssues
    }
  });
});

exports.getSentimentBreakdown = asyncHandler(async (req, res) => {

  let dateFilter = {};
  if (req.query.startDate || req.query.endDate) {
    dateFilter = {};
    
    if (req.query.startDate) {
      dateFilter.$gte = new Date(req.query.startDate);
    }
    
    if (req.query.endDate) {
      dateFilter.$lte = new Date(req.query.endDate);
    }
  }
  
  const matchCriteria = { event: req.params.eventId };
  if (Object.keys(dateFilter).length > 0) {
    matchCriteria.createdAt = dateFilter;
  }
  

  const sentimentOverTime = await Feedback.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: req.query.groupBy === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          sentiment: '$sentiment'
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$sentimentScore' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
  
  const timeLabels = new Set();
  const formattedData = {
    positive: {},
    neutral: {},
    negative: {}
  };
  
  sentimentOverTime.forEach(item => {
    const { date } = item._id;
    const sentiment = item._id.sentiment;
    
    timeLabels.add(date);
    formattedData[sentiment][date] = {
      count: item.count,
      avgScore: item.avgScore
    };
  });

  const chartData = Array.from(timeLabels).map(date => {
    return {
      date,
      positive: formattedData.positive[date]?.count || 0,
      neutral: formattedData.neutral[date]?.count || 0,
      negative: formattedData.negative[date]?.count || 0,
      positiveScore: formattedData.positive[date]?.avgScore || 0,
      neutralScore: formattedData.neutral[date]?.avgScore || 0,
      negativeScore: formattedData.negative[date]?.avgScore || 0
    };
  });
  
  res.status(200).json({
    success: true,
    data: chartData
  });
});

exports.getIssueBreakdown = asyncHandler(async (req, res) => {
  // Get issues breakdown
  const issueBreakdown = await Feedback.aggregate([
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
        count: { $sum: 1 },
        avgScore: { $avg: '$sentimentScore' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  

  const locationBreakdown = await Feedback.aggregate([
    { 
      $match: { 
        event: req.params.eventId,
        sentiment: 'negative',
        issueType: { $ne: null },
        'issueDetails.location': { $ne: null }
      } 
    },
    {
      $group: {
        _id: {
          issueType: '$issueType',
          location: '$issueDetails.location'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  const locationByIssue = {};
  locationBreakdown.forEach(item => {
    const issueType = item._id.issueType;
    const location = item._id.location;
    
    if (!locationByIssue[issueType]) {
      locationByIssue[issueType] = [];
    }
    
    locationByIssue[issueType].push({
      location,
      count: item.count
    });
  });
  
  const formattedIssues = issueBreakdown.map(issue => ({
    type: issue._id,
    count: issue.count,
    avgScore: issue.avgScore,
    locations: locationByIssue[issue._id] || []
  }));
  
  res.status(200).json({
    success: true,
    data: formattedIssues
  });
});

exports.getFeedbackBySource = asyncHandler(async (req, res) => {

  const sourceBreakdown = await Feedback.aggregate([
    { $match: { event: req.params.eventId } },
    {
      $group: {
        _id: '$source',
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
        },
        avgScore: { $avg: '$sentimentScore' }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  const formattedSources = sourceBreakdown.map(source => ({
    source: source._id,
    count: source.count,
    sentiment: {
      positive: source.positive,
      neutral: source.neutral,
      negative: source.negative
    },
    avgScore: source.avgScore
  }));
  
  res.status(200).json({
    success: true,
    data: formattedSources
  });
});

exports.getFeedbackById = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.feedbackId);
  
  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }

  const event = await Event.findById(feedback.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }
  
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this feedback'
    });
  }
  
  res.status(200).json({
    success: true,
    data: feedback
  });
});

exports.updateFeedback = asyncHandler(async (req, res) => {
  let feedback = await Feedback.findById(req.params.feedbackId);
  
  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }
  
  const event = await Event.findById(feedback.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }
  
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this feedback'
    });
  }
  
  const allowedUpdates = {
    processed: req.body.processed,
    issueType: req.body.issueType,
    issueDetails: req.body.issueDetails
  };
  
  const filteredUpdates = Object.entries(allowedUpdates)
    .filter(([_, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  

  feedback = await Feedback.findByIdAndUpdate(
    req.params.feedbackId,
    filteredUpdates,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: feedback
  });
});

exports.deleteFeedback = asyncHandler(async (req, res) => {
  const feedback = await Feedback.findById(req.params.feedbackId);
  
  if (!feedback) {
    return res.status(404).json({
      success: false,
      message: 'Feedback not found'
    });
  }
  
  const event = await Event.findById(feedback.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }
  
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this feedback'
    });
  }
  
  await feedback.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

exports.batchProcessFeedback = asyncHandler(async (req, res) => {
  const { feedbackIds, updates } = req.body;
  
  if (!feedbackIds || !Array.isArray(feedbackIds) || feedbackIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of feedback IDs'
    });
  }
  
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Please provide update fields'
    });
  }
  
  const allowedUpdates = {
    processed: updates.processed,
    issueType: updates.issueType,
    'issueDetails.resolved': updates.resolved,
    'issueDetails.severity': updates.severity
  };
  
  const filteredUpdates = Object.entries(allowedUpdates)
    .filter(([_, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  
  if (Object.keys(filteredUpdates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid update fields provided'
    });
  }
  
  const result = await Feedback.updateMany(
    { _id: { $in: feedbackIds } },
    { $set: filteredUpdates }
  );
  
  res.status(200).json({
    success: true,
    message: 'Batch update completed',
    data: {
      matched: result.matchedCount,
      modified: result.modifiedCount
    }
  });
});