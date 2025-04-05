const Event = require('../models/Event');
const twitterService = require('../services/social/twitterService');
const instagramService = require('../services/social/instagramService');
const linkedinService = require('../services/social/linkedinService');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');


exports.connectTwitter = asyncHandler(async (req, res) => {

  res.status(200).json({
    success: true,
    data: {
      connected: true,
      username: 'event_sentiment_monitor',
      tokenExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });
});


exports.disconnectTwitter = asyncHandler(async (req, res) => {
  
  res.status(200).json({
    success: true,
    data: {
      connected: false,
      message: 'Twitter integration disconnected'
    }
  });
});


exports.getTwitterStatus = asyncHandler(async (req, res) => {
  const isConfigured = !!process.env.TWITTER_BEARER_TOKEN;
  
  res.status(200).json({
    success: true,
    data: {
      connected: isConfigured,
      authenticated: isConfigured,
      username: isConfigured ? 'event_sentiment_monitor' : null
    }
  });
});

exports.startTwitterStream = asyncHandler(async (req, res) => {
  // Check if event exists
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
 
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage integrations for this event'
    });
  }

  if (
    !event.socialTracking.hashtags.length &&
    !event.socialTracking.mentions.length &&
    !event.socialTracking.keywords.length
  ) {
    return res.status(400).json({
      success: false,
      message: 'Event has no social tracking terms configured'
    });
  }
  
  try {
    // Start Twitter stream
    const streamStatus = await twitterService.startEventStream(req.params.eventId);
    
    res.status(200).json({
      success: true,
      data: streamStatus
    });
  } catch (error) {
    logger.error(`Start Twitter stream error: ${error.message}`, { error });
    
    res.status(500).json({
      success: false,
      message: 'Error starting Twitter stream',
      error: error.message
    });
  }
});

/**
 * @desc    Stop Twitter stream for event
 * @route   DELETE /api/integrations/twitter/stream/:eventId
 * @access  Private
 */
exports.stopTwitterStream = asyncHandler(async (req, res) => {
  // Check if event exists
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  // Check if user has access to this event
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage integrations for this event'
    });
  }
  
  try {
    // Stop Twitter stream
    const streamStatus = await twitterService.stopEventStream(req.params.eventId);
    
    res.status(200).json({
      success: true,
      data: streamStatus
    });
  } catch (error) {
    logger.error(`Stop Twitter stream error: ${error.message}`, { error });
    
    res.status(500).json({
      success: false,
      message: 'Error stopping Twitter stream',
      error: error.message
    });
  }
});


exports.searchTwitter = asyncHandler(async (req, res) => {
  const { eventId, hashtag } = req.body;
  
  if (!eventId) {
    return res.status(400).json({ success: false, message: 'Event ID is required' });
  }
  
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  
  try {
    const searchResults = await twitterService.searchTweets(eventId, hashtag || event.socialTracking.hashtags[0]);
    
    res.status(200).json({ 
      success: true, 
      data: searchResults
    });
  } catch (error) {
    logger.error(`Twitter search error: ${error.message}`, { error });
    res.status(500).json({ 
      success: false, 
      message: 'Error searching Twitter', 
      error: error.message 
    });
  }
});

/**
 * @desc    Connect Instagram
 * @route   POST /api/integrations/instagram/connect
 * @access  Private
 */
exports.connectInstagram = asyncHandler(async (req, res) => {
  // This would handle OAuth flow in a production implementation
  // For hackathon, we'll simulate a successful connection
  
  res.status(200).json({
    success: true,
    data: {
      connected: true,
      username: 'event_sentiment_monitor',
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
    }
  });
});

/**
 * @desc    Disconnect Instagram
 * @route   DELETE /api/integrations/instagram/disconnect
 * @access  Private
 */
exports.disconnectInstagram = asyncHandler(async (req, res) => {
  // This would revoke OAuth tokens in a production implementation
  
  res.status(200).json({
    success: true,
    data: {
      connected: false,
      message: 'Instagram integration disconnected'
    }
  });
});

/**
 * @desc    Get Instagram connection status
 * @route   GET /api/integrations/instagram/status
 * @access  Private
 */
exports.getInstagramStatus = asyncHandler(async (req, res) => {
  // Check if Instagram API keys are configured
  const isConfigured = !!process.env.INSTAGRAM_ACCESS_TOKEN;
  
  res.status(200).json({
    success: true,
    data: {
      connected: isConfigured,
      authenticated: isConfigured,
      username: isConfigured ? 'event_sentiment_monitor' : null
    }
  });
});


/**
 * @desc    Configure Instagram hashtags for event
 * @route   POST /api/integrations/instagram/hashtags/:eventId
 * @access  Private
 */
exports.configureInstagramHashtags = asyncHandler(async (req, res) => {
  const { hashtags } = req.body;
  
  if (!hashtags || !Array.isArray(hashtags)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of hashtags'
    });
  }
  
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage integrations for this event'
    });
  }
  
  const formattedHashtags = hashtags.map(tag => 
    tag.startsWith('#') ? tag : `#${tag}`
  );
  
  event.socialTracking.hashtags = formattedHashtags;
  await event.save();
  
  try {
    const pollStatus = await instagramService.startEventPolling(req.params.eventId);
    
    // Fetch initial sentiment results
    const latestPosts = await instagramService.fetchLatestPostsForEvent(req.params.eventId);
    const feedbacks = await Feedback.find({ event: req.params.eventId, source: 'instagram' })
      .sort({ createdAt: -1 })
      .limit(10); // Limit to recent posts for efficiency
    
    const sentimentSummary = {
      positive: feedbacks.filter(f => f.sentiment === 'positive').length,
      negative: feedbacks.filter(f => f.sentiment === 'negative').length,
      neutral: feedbacks.filter(f => f.sentiment === 'neutral').length
    };
    
    res.status(200).json({
      success: true,
      data: {
        hashtags: formattedHashtags,
        polling: pollStatus,
        sentimentSummary
      }
    });
  } catch (error) {
    logger.error(`Instagram polling error: ${error.message}`, { error });
    
    res.status(200).json({
      success: true,
      data: {
        hashtags: formattedHashtags,
        polling: {
          isActive: false,
          error: error.message
        },
        sentimentSummary: null
      }
    });
  }
});

/**
 * @desc    Connect LinkedIn
 * @route   POST /api/integrations/linkedin/connect
 * @access  Private
 */
exports.connectLinkedIn = asyncHandler(async (req, res) => {
  // This would handle OAuth flow in a production implementation
  // For hackathon, we'll simulate a successful connection
  
  res.status(200).json({
    success: true,
    data: {
      connected: true,
      username: 'Event Sentiment Monitor',
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
    }
  });
});

/**
 * @desc    Disconnect LinkedIn
 * @route   DELETE /api/integrations/linkedin/disconnect
 * @access  Private
 */
exports.disconnectLinkedIn = asyncHandler(async (req, res) => {
  // This would revoke OAuth tokens in a production implementation
  
  res.status(200).json({
    success: true,
    data: {
      connected: false,
      message: 'LinkedIn integration disconnected'
    }
  });
});

/**
 * @desc    Get LinkedIn connection status
 * @route   GET /api/integrations/linkedin/status
 * @access  Private
 */
exports.getLinkedInStatus = asyncHandler(async (req, res) => {
  // Check if LinkedIn API keys are configured
  const isConfigured = !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
  
  res.status(200).json({
    success: true,
    data: {
      connected: isConfigured,
      authenticated: isConfigured,
      company: isConfigured ? 'Example Company' : null
    }
  });
});

/**
 * @desc    Configure LinkedIn company for event
 * @route   POST /api/integrations/linkedin/company/:eventId
 * @access  Private
 */
exports.configureLinkedInCompany = asyncHandler(async (req, res) => {
  const { companyId, companyName } = req.body;
  
  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a company ID'
    });
  }
  
  // Check if event exists
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  // Check if user has access to this event
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to manage integrations for this event'
    });
  }
  
  // Add company mention to tracking
  if (companyName && !event.socialTracking.mentions.includes(companyName)) {
    event.socialTracking.mentions.push(companyName);
    await event.save();
  }
  
  // Start LinkedIn polling
  try {
    const pollStatus = await linkedinService.startCompanyPolling(req.params.eventId, companyId);
    
    res.status(200).json({
      success: true,
      data: {
        companyId,
        companyName,
        polling: pollStatus
      }
    });
  } catch (error) {
    logger.error(`LinkedIn polling error: ${error.message}`, { error });
    
    res.status(500).json({
      success: false,
      message: 'Error starting LinkedIn company polling',
      error: error.message
    });
  }
});

/**
 * @desc    Get integration settings for event
 * @route   GET /api/integrations/settings/:eventId
 * @access  Private
 */
exports.getIntegrationSettings = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view integrations for this event'
    });
  }
  
  const twitterStreamStatus = twitterService.getStreamStatus(req.params.eventId);
  const instagramPollStatus = instagramService.getPollStatus(req.params.eventId);
  const linkedinPollStatus = linkedinService.getPollStatus(req.params.eventId);
  
  // Fetch sentiment summary for Instagram
  const feedbacks = await Feedback.find({ event: req.params.eventId, source: 'instagram' });
  const sentimentSummary = {
    positive: feedbacks.filter(f => f.sentiment === 'positive').length,
    negative: feedbacks.filter(f => f.sentiment === 'negative').length,
    neutral: feedbacks.filter(f => f.sentiment === 'neutral').length,
    total: feedbacks.length
  };
  
  res.status(200).json({
    success: true,
    data: {
      event: {
        id: event._id,
        name: event.name
      },
      socialTracking: event.socialTracking,
      integrations: event.integrations,
      status: {
        twitter: twitterStreamStatus,
        instagram: {
          ...instagramPollStatus,
          sentimentSummary
        },
        linkedin: linkedinPollStatus
      }
    }
  });
});

/**
 * @desc    Update integration settings for event
 * @route   PUT /api/integrations/settings/:eventId
 * @access  Private
 */
exports.updateIntegrationSettings = asyncHandler(async (req, res) => {
  const { socialTracking, integrations } = req.body;

  const event = await Event.findById(req.params.eventId);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id &&
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update integrations for this event'
    });
  }

  // Update social tracking fields
  if (socialTracking) {
    if (socialTracking.hashtags) {
      event.socialTracking.hashtags = socialTracking.hashtags.map(tag =>
        tag.startsWith('#') ? tag : `#${tag}`
      );
    }
    if (socialTracking.mentions) {
      event.socialTracking.mentions = socialTracking.mentions;
    }
    if (socialTracking.keywords) {
      event.socialTracking.keywords = socialTracking.keywords;
    }
  }

  // Update integration flags if provided
  if (integrations) {
    event.integrations = { ...event.integrations, ...integrations };
  }

  await event.save();

  res.status(200).json({
    success: true,
    message: 'Integration settings updated successfully',
    data: {
      socialTracking: event.socialTracking,
      integrations: event.integrations
    }
  });
});

/**
 * @desc    Get summary of feedback and sentiment for event
 * @route   GET /api/integrations/summary/:eventId
 * @access  Private
 */
exports.getEventSummary = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      logger.error(`Event not found for ID: ${eventId}`);
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const feedbacks = await Feedback.find({ event: eventId });
    const totalFeedback = feedbacks.length;

    const positive = feedbacks.filter(f => f.sentiment > 0).length;
    const neutral = feedbacks.filter(f => f.sentiment === 0).length;
    const negative = feedbacks.filter(f => f.sentiment < 0).length;

    const summary = {
      overview: {
        totalFeedback,
        sentimentBreakdown: {
          positive: {
            count: positive,
            percentage: totalFeedback > 0 ? (positive / totalFeedback) * 100 : 0,
          },
          neutral: {
            count: neutral,
            percentage: totalFeedback > 0 ? (neutral / totalFeedback) * 100 : 0,
          },
          negative: {
            count: negative,
            percentage: totalFeedback > 0 ? (negative / totalFeedback) * 100 : 0,
          },
        },
        topIssues: [], // Could be filled in based on keywords or feedback
        topSources: [
          {
            source: 'twitter',
            count: feedbacks.filter(f => f.source === 'twitter').length,
            percentage: totalFeedback > 0 ? (feedbacks.filter(f => f.source === 'twitter').length / totalFeedback) * 100 : 0,
          },
          {
            source: 'instagram',
            count: feedbacks.filter(f => f.source === 'instagram').length,
            percentage: totalFeedback > 0 ? (feedbacks.filter(f => f.source === 'instagram').length / totalFeedback) * 100 : 0,
          },
          {
            source: 'linkedin',
            count: feedbacks.filter(f => f.source === 'linkedin').length,
            percentage: totalFeedback > 0 ? (feedbacks.filter(f => f.source === 'linkedin').length / totalFeedback) * 100 : 0,
          }
        ],
      },
      alerts: { active: 0, resolved: 0, total: 0 }, // Placeholder
      trends: { topics: [] }, // Placeholder
      insights: totalFeedback > 0
        ? [{ type: 'info', title: 'Feedback Collected', description: `${totalFeedback} feedback items collected.` }]
        : [],
    };

    logger.info(`Generated summary for event ${eventId}:`, summary);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    logger.error(`Get event summary error: ${error.message}`, { error, eventId });
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

/**
 * @desc    Test integration
 * @route   POST /api/integrations/test/:platform
 * @access  Private
 */
exports.testIntegration = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { eventId } = req.body;
  
  // Validate platform
  if (!['twitter', 'instagram', 'linkedin'].includes(platform)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid platform'
    });
  }
  
  // Check if event exists if eventId provided
  if (eventId) {
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Check if user has access to this event
    if (
      req.user.role !== 'admin' &&
      event.owner.toString() !== req.user.id && 
      !event.organizers.map(org => org.toString()).includes(req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to test integrations for this event'
      });
    }
  }
  
  // Test integration
  let testResult;
  
  try {
    switch (platform) {
      case 'twitter':
        // Test Twitter API
        testResult = {
          connected: !!process.env.TWITTER_BEARER_TOKEN,
          streamActive: eventId ? twitterService.getStreamStatus(eventId).isActive : false,
          testQuery: '#EventMonitor test'
        };
        break;
        
      case 'instagram':
        testResult = {
          connected: !!process.env.INSTAGRAM_ACCESS_TOKEN,
          pollingActive: eventId ? instagramService.getPollStatus(eventId).isActive : false,
          testHashtag: '#EventMonitor'
        };
        break;
        
      case 'linkedin':
        testResult = {
          connected: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
          pollingActive: eventId ? linkedinService.getPollStatus(eventId).isActive : false,
          testCompany: 'Example Company'
        };
        break;
    }
    
    res.status(200).json({
      success: true,
      data: {
        platform,
        status: 'connected',
        result: testResult
      }
    });
  } catch (error) {
    logger.error(`Test integration error: ${error.message}`, { error, platform });
    
    res.status(500).json({
      success: false,
      message: `Error testing ${platform} integration`,
      error: error.message
    });
  }
});