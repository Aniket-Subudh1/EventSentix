const axios = require('axios');
const Event = require('../../models/Event');
const Feedback = require('../../models/Feedback');
const sentimentAnalyzer = require('../nlp/sentimentAnalyzer');
const logger = require('../../utils/logger');

const activePolls = new Map();

const getLinkedInClient = () => {
  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    throw new Error('LinkedIn API keys not configured');
  }
  
  return axios.create({
    baseURL: 'https://api.linkedin.com/v2',
    headers: {
      'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
};


exports.startCompanyPolling = async (eventId, companyId) => {
  try {
    if (activePolls.has(eventId)) {
      return {
        success: true,
        message: 'LinkedIn polling already active',
        isActive: true
      };
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    if (!companyId) {
      throw new Error('LinkedIn company ID is required');
    }
    

    const pollInterval = setInterval(async () => {
      try {
        await pollLinkedInCompany(companyId, event);
      } catch (error) {
        logger.error(`LinkedIn poll error: ${error.message}`, { error });
      }
    }, 10 * 60 * 1000); 
    

    activePolls.set(eventId, {
      pollInterval,
      companyId,
      startTime: new Date(),
      lastPollTime: null,
      lastResults: null
    });
    
 
    await pollLinkedInCompany(companyId, event);
    
    return {
      success: true,
      message: 'LinkedIn polling started successfully',
      isActive: true,
      companyId
    };
  } catch (error) {
    logger.error(`Start LinkedIn polling error: ${error.message}`, { error, eventId, companyId });
    
    if (activePolls.has(eventId)) {
      const activePoll = activePolls.get(eventId);
      if (activePoll.pollInterval) {
        clearInterval(activePoll.pollInterval);
      }
      activePolls.delete(eventId);
    }
    
    throw error;
  }
};

exports.stopCompanyPolling = async (eventId) => {
  try {
    if (!activePolls.has(eventId)) {
      return {
        success: true,
        message: 'No active LinkedIn polling found',
        isActive: false
      };
    }
    
    const activePoll = activePolls.get(eventId);
    
    clearInterval(activePoll.pollInterval);
    
    activePolls.delete(eventId);
    
    return {
      success: true,
      message: 'LinkedIn polling stopped successfully',
      isActive: false,
      runtime: getPollRuntime(activePoll.startTime)
    };
  } catch (error) {
    logger.error(`Stop LinkedIn polling error: ${error.message}`, { error, eventId });
    throw error;
  }
};

const pollLinkedInCompany = async (companyId, event) => {
  try {
   
    logger.info(`Polling LinkedIn company: ${companyId}`);
    
    if (activePolls.has(event._id.toString())) {
      activePolls.get(event._id.toString()).lastPollTime = new Date();
    }
    
    const trackingTerms = [
      ...event.socialTracking.hashtags,
      ...event.socialTracking.mentions,
      ...event.socialTracking.keywords
    ];
    
    const mockPosts = generateMockLinkedInPosts(companyId, trackingTerms, 3);
    
    const processPromises = mockPosts.map(post => processLinkedInPost(post, event._id));
    const results = await Promise.all(processPromises);
    
    if (activePolls.has(event._id.toString())) {
      activePolls.get(event._id.toString()).lastResults = {
        count: results.filter(Boolean).length,
        timestamp: new Date()
      };
    }
    
    return results.filter(Boolean);
  } catch (error) {
    logger.error(`Poll LinkedIn company error: ${error.message}`, { error, companyId });
    throw error;
  }
};


const processLinkedInPost = async (post, eventId) => {
  try {
    const existingFeedback = await Feedback.findOne({
      event: eventId,
      source: 'linkedin',
      sourceId: post.id
    });
    
    if (existingFeedback) {
      logger.debug(`LinkedIn post already processed: ${post.id}`);
      return existingFeedback;
    }
    
    const feedbackData = {
      event: eventId,
      source: 'linkedin',
      sourceId: post.id,
      text: post.text,
      metadata: {
        username: post.authorName,
        platform: 'linkedin',
        profileUrl: post.authorUrl,
        followerCount: post.authorFollowers,
        mediaUrls: post.mediaUrl ? [post.mediaUrl] : [],
        hashTags: post.hashtags,
        mentions: post.mentions
      }
    };
    
    const processedFeedback = await sentimentAnalyzer.processFeedback(feedbackData);
    const feedback = await Feedback.create(processedFeedback);
    
    logger.info(`Processed LinkedIn post as feedback: ${feedback._id}`, { 
      postId: post.id, 
      sentiment: feedback.sentiment,
      issueType: feedback.issueType
    });
    
    return feedback;
  } catch (error) {
    logger.error(`Process LinkedIn post error: ${error.message}`, { error, postId: post.id });
    return null;
  }
};


const generateMockLinkedInPosts = (companyId, trackingTerms, count = 3) => {
  const posts = [];
  
  const commentTemplates = [
    'Attended {company}\'s event yesterday. The keynote speaker was incredible but the venue was too small for the crowd.',
    'Great insights at the {company} conference! Audio issues in breakout room 3 though. #ProfessionalDevelopment',
    'Impressed by the organization of {company}\'s event. The networking opportunities were fantastic!',
    'Struggling to hear the presenters at {company}\'s workshop. Please adjust the sound system! #feedback',
    'The content at {company}\'s seminar was top-notch, but the registration process was chaotic. #RoomForImprovement',
    'Just wanted to thank {company} for an amazing event. The speakers were knowledgeable and engaging!',
    'The WiFi at {company}\'s conference center keeps dropping. Hard to follow along with the digital materials. #TechIssues'
  ];
  
  for (let i = 0; i < count; i++) {
    const randomTemplate = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
    const text = randomTemplate.replace('{company}', 'ABC Company');
    
    const hashtags = text.match(/#(\w+)/g)?.map(tag => tag.substring(1)) || [];
    
    if (trackingTerms.length > 0) {
      const randomTerm = trackingTerms[Math.floor(Math.random() * trackingTerms.length)];
      if (!text.includes(randomTerm)) {
        const termText = randomTerm.startsWith('#') 
          ? ` ${randomTerm}` 
          : ` #${randomTerm}`;
        text += termText;
        
        if (randomTerm.startsWith('#')) {
          hashtags.push(randomTerm.substring(1));
        }
      }
    }
    
    posts.push({
      id: `mock_li_${Date.now()}_${i}`,
      text,
      authorName: `LinkedIn User ${Math.floor(Math.random() * 1000)}`,
      authorUrl: 'https://linkedin.com/in/user',
      authorFollowers: Math.floor(Math.random() * 2000),
      companyId,
      mediaUrl: Math.random() > 0.5 ? 'https://example.com/mock-linkedin-image.jpg' : null,
      hashtags,
      mentions: [],
      createdAt: new Date()
    });
  }
  
  return posts;
};

exports.getPollStatus = (eventId) => {
  try {
    const isActive = activePolls.has(eventId);
    
    if (!isActive) {
      return {
        isActive: false,
        message: 'No active LinkedIn polling'
      };
    }
    
    const activePoll = activePolls.get(eventId);
    
    return {
      isActive: true,
      startTime: activePoll.startTime,
      runtime: getPollRuntime(activePoll.startTime),
      lastPollTime: activePoll.lastPollTime,
      companyId: activePoll.companyId,
      lastResults: activePoll.lastResults,
      message: 'LinkedIn polling is active'
    };
  } catch (error) {
    logger.error(`Get LinkedIn poll status error: ${error.message}`, { error, eventId });
    return {
      isActive: false,
      error: error.message
    };
  }
};

exports.searchCompanyPosts = async (searchParams) => {
  try {
    const { companyId, keywords, eventId, maxResults = 20 } = searchParams;
    
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    

    const trackingTerms = keywords || [];
    const mockPosts = generateMockLinkedInPosts(companyId, trackingTerms, Math.min(maxResults, 20));
    

    if (eventId) {
      const processPromises = mockPosts.map(post => processLinkedInPost(post, eventId));
      await Promise.all(processPromises);
    }
    
    return {
      success: true,
      results: mockPosts,
      meta: {
        count: mockPosts.length,
        timestamp: new Date()
      }
    };
  } catch (error) {
    logger.error(`Search LinkedIn posts error: ${error.message}`, { error, searchParams });
    throw error;
  }
};

const getPollRuntime = (startTime) => {
  if (!startTime) return 'unknown';
  
  const runtime = Math.floor((new Date() - startTime) / 1000);
  
  if (runtime < 60) {
    return `${runtime} seconds`;
  } else if (runtime < 3600) {
    return `${Math.floor(runtime / 60)} minutes`;
  } else {
    const hours = Math.floor(runtime / 3600);
    const minutes = Math.floor((runtime % 3600) / 60);
    return `${hours} hours ${minutes} minutes`;
  }
};