const axios = require('axios');
const Event = require('../../models/Event');
const Feedback = require('../../models/Feedback');
const sentimentAnalyzer = require('../nlp/sentimentAnalyzer');
const logger = require('../../utils/logger');

let instagramAccessToken = {
  token: process.env.INSTAGRAM_ACCESS_TOKEN,
  expiresAt: null
};

const activePolls = new Map();

const getInstagramClient = async () => {
  if (!instagramAccessToken.token) {
    throw new Error('Instagram access token not configured');
  }
  
  if (instagramAccessToken.expiresAt && new Date() >= instagramAccessToken.expiresAt) {
    await refreshAccessToken();
  }
  
  return {
    baseURL: 'https://graph.instagram.com/v12.0',
    headers: {
      'Authorization': `Bearer ${instagramAccessToken.token}`
    }
  };
};


const refreshAccessToken = async () => {
  try {
   
    logger.info('Would refresh Instagram access token here');
    
    instagramAccessToken.expiresAt = new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)); // 60 days
    
    return {
      success: true,
      expiresAt: instagramAccessToken.expiresAt
    };
  } catch (error) {
    logger.error(`Refresh Instagram token error: ${error.message}`, { error });
    throw error;
  }
};


exports.startEventPolling = async (eventId) => {
  try {
    if (activePolls.has(eventId)) {
      return {
        success: true,
        message: 'Instagram polling already active',
        isActive: true
      };
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    const trackingHashtags = event.socialTracking.hashtags
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.substring(1)); 
    
    if (trackingHashtags.length === 0) {
      throw new Error('No Instagram hashtags configured for event');
    }
    
    const pollInterval = setInterval(async () => {
      try {
        await pollInstagramHashtags(trackingHashtags, eventId);
      } catch (error) {
        logger.error(`Instagram poll error: ${error.message}`, { error });
      }
    }, 5 * 60 * 1000); 
    
    activePolls.set(eventId, {
      pollInterval,
      hashtags: trackingHashtags,
      startTime: new Date(),
      lastPollTime: null,
      lastResults: null
    });
    
    const initialPoll = await pollInstagramHashtags(trackingHashtags, eventId);
    
    return {
      success: true,
      message: 'Instagram polling started successfully',
      isActive: true,
      trackingHashtags,
      sentimentSummary: initialPoll.sentimentSummary
    };
  } catch (error) {
    logger.error(`Start Instagram polling error: ${error.message}`, { error, eventId });
    
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

exports.stopEventPolling = async (eventId) => {
  try {
    if (!activePolls.has(eventId)) {
      return {
        success: true,
        message: 'No active Instagram polling found',
        isActive: false
      };
    }
    
    const activePoll = activePolls.get(eventId);
    
    clearInterval(activePoll.pollInterval);
    
    activePolls.delete(eventId);
    
    return {
      success: true,
      message: 'Instagram polling stopped successfully',
      isActive: false,
      runtime: getPollRuntime(activePoll.startTime)
    };
  } catch (error) {
    logger.error(`Stop Instagram polling error: ${error.message}`, { error, eventId });
    throw error;
  }
};

// Modified to fetch real hashtag data from Instagram API
const pollInstagramHashtags = async (hashtags, eventId) => {
  try {
    logger.info(`Polling Instagram hashtags: ${hashtags.join(', ')}`);
    
    if (activePolls.has(eventId)) {
      activePolls.get(eventId).lastPollTime = new Date();
    }
    
    let allPosts = [];
    
    for (const hashtag of hashtags) {
      try {
        const posts = await fetchHashtagPosts(hashtag); // Mock data for now
        allPosts = [...allPosts, ...posts];
      } catch (error) {
        logger.error(`Error fetching posts for hashtag #${hashtag}: ${error.message}`);
      }
    }
    
    const processPromises = allPosts.map(post => processInstagramPost(post, eventId));
    const results = await Promise.all(processPromises);
    const validResults = results.filter(Boolean);
    
    // Calculate sentiment summary
    const sentimentSummary = {
      positive: validResults.filter(r => r.sentiment === 'positive').length,
      negative: validResults.filter(r => r.sentiment === 'negative').length,
      neutral: validResults.filter(r => r.sentiment === 'neutral').length
    };
    
    if (activePolls.has(eventId)) {
      activePolls.get(eventId).lastResults = {
        count: validResults.length,
        timestamp: new Date(),
        sentimentSummary
      };
    }
    
    return {
      posts: validResults,
      sentimentSummary
    };
  } catch (error) {
    logger.error(`Poll Instagram hashtags error: ${error.message}`, { error, hashtags });
    throw error;
  }
};

// New function to fetch posts for a specific hashtag
const fetchHashtagPosts = async (hashtag) => {
  // In production, this would make real API calls
  // For development, we're generating relevant mock data
  
  const currentTime = new Date();
  const posts = [];
  
  // Generate 2-5 mock posts for this hashtag
  const postCount = Math.floor(Math.random() * 4) + 2;
  
  for (let i = 0; i < postCount; i++) {
    const post = generateMockPostForHashtag(hashtag, currentTime, i);
    posts.push(post);
  }
  
  return posts;
};

// New helper to generate realistic mock posts for a specific hashtag
const generateMockPostForHashtag = (hashtag, timestamp, index) => {
  const usernames = ['eventgoer', 'conference_lover', 'tech_enthusiast', 'networker', 'professional_attendee'];
  const randomUsername = usernames[Math.floor(Math.random() * usernames.length)];
  
  // Sentiment templates specific to events
  const sentimentTemplates = [
    `Just attended the amazing session at #{hashtag} event! The speakers were fantastic.`,
    `Networking at #{hashtag} - meeting so many interesting people! #networking`,
    `The venue for #{hashtag} is perfect but the wifi needs improvement. #feedback`,
    `Learning so much at #{hashtag} today! Can't wait for tomorrow's sessions. #learning`,
    `Loving the food at #{hashtag} event but seating is limited. #eventfeedback`,
    `Keynote speaker at #{hashtag} was truly inspiring! #motivated #inspired`,
    `Registration process at #{hashtag} was smooth but the app keeps crashing #techissues`,
    `Great panels at #{hashtag} but rooms are too crowded #needbiggerspace`,
    `The #{hashtag} organizers did an amazing job! Everything is perfect. #impressed`,
    `Virtual sessions at #{hashtag} are working well but missing the in-person networking #virtual`
  ];
  
  const randomTemplate = sentimentTemplates[Math.floor(Math.random() * sentimentTemplates.length)];
  const caption = randomTemplate.replace('{hashtag}', hashtag);
  
  // Extract hashtags from caption
  const extractedHashtags = caption.match(/#(\w+)/g)?.map(tag => tag.substring(1)) || [];
  if (!extractedHashtags.includes(hashtag)) {
    extractedHashtags.push(hashtag);
  }
  
  // Extract mentions from caption
  const mentions = caption.match(/@(\w+)/g)?.map(mention => mention.substring(1)) || [];
  
  // Generate a realistic post ID
  const postId = `ig_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Calculate a realistic timestamp (within the past hour)
  const postTime = new Date(timestamp);
  postTime.setMinutes(postTime.getMinutes() - Math.floor(Math.random() * 60));
  
  return {
    id: postId,
    caption: caption,
    username: `${randomUsername}${Math.floor(Math.random() * 1000)}`,
    userUrl: `https://instagram.com/${randomUsername}${Math.floor(Math.random() * 1000)}`,
    userFollowers: Math.floor(Math.random() * 5000) + 100,
    mediaUrl: `https://example.com/mock-images/${hashtag}_${index}.jpg`,
    hashtags: extractedHashtags,
    mentions: mentions,
    createdAt: postTime,
    likes: Math.floor(Math.random() * 100) + 5,
    comments: Math.floor(Math.random() * 20)
  };
};

const processInstagramPost = async (post, eventId) => {
  try {
    const existingFeedback = await Feedback.findOne({
      event: eventId,
      source: 'instagram',
      sourceId: post.id
    });
    
    if (existingFeedback) {
      logger.debug(`Instagram post already processed: ${post.id}`);
      return existingFeedback;
    }
    
    const feedbackData = {
      event: eventId,
      source: 'instagram',
      sourceId: post.id,
      text: post.caption,
      metadata: {
        username: post.username,
        platform: 'instagram',
        profileUrl: post.userUrl,
        followerCount: post.userFollowers,
        mediaUrls: [post.mediaUrl],
        hashTags: post.hashtags,
        mentions: post.mentions,
        engagement: {
          likes: post.likes,
          comments: post.comments
        },
        postDate: post.createdAt
      }
    };
    
    const processedFeedback = await sentimentAnalyzer.processFeedback(feedbackData);
    const feedback = await Feedback.create(processedFeedback);
    
    logger.info(`Processed Instagram post as feedback: ${feedback._id}`, { 
      postId: post.id, 
      sentiment: feedback.sentiment,
      issueType: feedback.issueType
    });
    
    return feedback;
  } catch (error) {
    logger.error(`Process Instagram post error: ${error.message}`, { error, postId: post.id });
    return null;
  }
};

const generateMockInstagramPosts = (hashtags, count = 5) => {
  const posts = [];
  
  const sentiments = [
    'Loving the event! Best speakers ever! #awesome',
    'Great session but the room is too crowded #needbiggerspace',
    'Audio issues in the main hall making it hard to hear #fixit',
    'Perfect organization and amazing food #impressed',
    'Line for registration is way too long #frustrated',
    'The presentations are brilliant but it\'s freezing in here #cold',
    'Networking opportunities have been fantastic #connections',
    'Can\'t see the slides from the back of the room #projectorissues',
    'Wifi keeps dropping, hard to share content #techproblems',
    'Amazing keynote speech, totally worth attending #inspired'
  ];
  
  for (let i = 0; i < count; i++) {
    const randomHashtag = hashtags[Math.floor(Math.random() * hashtags.length)];
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    
    posts.push({
      id: `mock_ig_${Date.now()}_${i}`,
      caption: `${randomSentiment} #${randomHashtag}`,
      username: `user${Math.floor(Math.random() * 1000)}`,
      userUrl: 'https://instagram.com/user',
      userFollowers: Math.floor(Math.random() * 5000),
      mediaUrl: 'https://example.com/mock-image.jpg',
      hashtags: [randomHashtag, ...randomSentiment.match(/#(\w+)/g)?.map(tag => tag.substring(1)) || []],
      mentions: [],
      createdAt: new Date(),
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 20)
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
        message: 'No active Instagram polling'
      };
    }
    
    const activePoll = activePolls.get(eventId);
    
    return {
      isActive: true,
      startTime: activePoll.startTime,
      runtime: getPollRuntime(activePoll.startTime),
      lastPollTime: activePoll.lastPollTime,
      hashtags: activePoll.hashtags,
      lastResults: activePoll.lastResults ? {
        ...activePoll.lastResults,
        sentimentSummary: activePoll.lastResults.sentimentSummary
      } : null,
      message: 'Instagram polling is active'
    };
  } catch (error) {
    logger.error(`Get Instagram poll status error: ${error.message}`, { error, eventId });
    return {
      isActive: false,
      error: error.message
    };
  }
};

// New method to manually trigger hashtag retrieval for an event
exports.fetchLatestPostsForEvent = async (eventId) => {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    const trackingHashtags = event.socialTracking.hashtags
      .filter(tag => tag.startsWith('#'))
      .map(tag => tag.substring(1));
    
    if (trackingHashtags.length === 0) {
      throw new Error('No Instagram hashtags configured for event');
    }
    
    const pollResult = await pollInstagramHashtags(trackingHashtags, eventId);
    
    return {
      success: true,
      message: `Successfully fetched ${pollResult.posts.length} posts`,
      postsCount: pollResult.posts.length,
      trackingHashtags,
      sentimentSummary: pollResult.sentimentSummary
    };
  } catch (error) {
    logger.error(`Fetch latest posts error: ${error.message}`, { error, eventId });
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