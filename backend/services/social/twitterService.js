const { TwitterApi } = require('twitter-api-v2');
const Event = require('../../models/Event');
const Feedback = require('../../models/Feedback');
const sentimentAnalyzer = require('../nlp/sentimentAnalyzer');
const alertGenerator = require('../alert/alertGenerator');
const socketHandler = require('../realtime/socketHandler');
const logger = require('../../utils/logger');

let activeStreams = new Map();

/**
 * Get authenticated Twitter client
 * @returns {TwitterApi} Authenticated Twitter client
 */
const getTwitterClient = () => {
  const requiredEnvVars = [
    'TWITTER_API_KEY',
    'TWITTER_API_SECRET',
    'TWITTER_ACCESS_TOKEN',
    'TWITTER_ACCESS_TOKEN_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} not configured in environment variables`);
    }
  }

  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });
};

const calculateMockScore = (text) => {
  if (text.toLowerCase().includes('hate') || text.toLowerCase().includes('disrespect')) return -5;
  if (text.toLowerCase().includes('amazing') || text.toLowerCase().includes('king')) return 2;
  if (text.toLowerCase().includes('happy') || text.toLowerCase().includes('great')) return 3;
  if (text.toLowerCase().includes('love')) return 5;
  return 0;
};

const mapScoreToEmotion = (score) => {
  if (score <= -5) return 'angry';
  if (score > 0 && score <= 2) return 'positive';
  if (score > 2) return 'happy';
  return 'neutral';
};

exports.searchTweets = async (eventId, query) => {
  try {
    console.log(`Searching tweets for event: ${eventId}`);
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const searchQuery = query && typeof query === 'string'
      ? query
      : event.socialTracking.hashtags.length
        ? event.socialTracking.hashtags.join(' OR ')
        : null;


    const client = getTwitterClient();
    console.log(`Using query: ${searchQuery}`);

    const response = await client.v2.search(searchQuery, {
      'tweet.fields': ['text', 'created_at', 'author_id', 'public_metrics'],
      'user.fields': ['username'],
      'expansions': ['author_id'],
      max_results: 20
    });

    const tweets = response.data.data || [];
    console.log(`Found ${tweets.length} tweets`);

    const detailed = tweets.map(tweet => {
      const score = calculateMockScore(tweet.text);
      const emotion = mapScoreToEmotion(score);
      return {
        text: tweet.text,
        score,
        emotion
      };
    });

    const summary = {
      neutral: detailed.filter(d => d.emotion === 'neutral').length,
      angry: detailed.filter(d => d.emotion === 'angry').length,
      positive: detailed.filter(d => d.emotion === 'positive').length,
      happy: detailed.filter(d => d.emotion === 'happy').length
    };

    const feedbackPromises = detailed.map(async (entry) => {
      const tweet = tweets.find(t => t.text === entry.text);
      const user = response.data.includes.users.find(u => u.id === tweet.author_id);
      const feedback = {
        event: eventId,
        source: 'twitter',
        sourceId: tweet.id,
        text: entry.text,
        sentiment: entry.score,
        metadata: {
          username: user?.username,
          emotion: entry.emotion,
          hashtag: searchQuery,
          createdAt: tweet.created_at,
          publicMetrics: tweet.public_metrics
        }
      };
      return Feedback.findOneAndUpdate(
        { sourceId: tweet.id, event: eventId },
        feedback,
        { upsert: true, new: true }
      );
    });

    await Promise.all(feedbackPromises);

    return {
      query: searchQuery,
      totalPosts: tweets.length,
      summary,
      detailed
    };
  } catch (error) {
    logger.error(`Search tweets error: ${error.message}`, { error, eventId });
    if (error.code === 429) {
      const resetTime = error.rateLimit?.reset ? new Date(error.rateLimit.reset * 1000).toLocaleString() : 'unknown';
      return {
        success: false,
        message: `Rate limit exceeded. Try again after ${resetTime}`,
        error: `Request failed with code 429 ${resetTime}`
      };
    }
    throw error;
  }
};

const processTweet = async (tweetData, eventId) => {
  try {
    const tweet = tweetData.data;
    const user = tweetData.includes?.users?.find(u => u.id === tweet.author_id);
    const score = calculateMockScore(tweet.text);
    const emotion = mapScoreToEmotion(score);

    const feedback = {
      event: eventId,
      source: 'twitter',
      sourceId: tweet.id,
      text: tweet.text,
      sentiment: score,
      metadata: {
        username: user?.username,
        emotion,
        hashtag: (await Event.findById(eventId)).socialTracking.hashtags.find(h => tweet.text.includes(h)),
        createdAt: tweet.created_at,
        publicMetrics: tweet.public_metrics
      }
    };

    const savedFeedback = await Feedback.findOneAndUpdate(
      { sourceId: tweet.id, event: eventId },
      feedback,
      { upsert: true, new: true }
    );

    const io = global.io;
    if (io) {
      socketHandler.broadcastFeedback(io, savedFeedback);
    }

    return savedFeedback;
  } catch (error) {
    logger.error(`Process tweet error: ${error.message}`, { error, tweetId: tweetData?.data?.id });
    return null;
  }
};

/**
 * Start streaming tweets for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Stream status
 */
exports.startEventStream = async (eventId) => {
  try {
    if (activeStreams.has(eventId)) {
      return {
        success: true,
        message: 'Stream already running',
        isActive: true
      };
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }
    
    const trackingTerms = [
      ...event.socialTracking.hashtags,
      ...event.socialTracking.mentions,
      ...event.socialTracking.keywords
    ];
    
    if (trackingTerms.length === 0) {
      throw new Error('No tracking terms configured for event');
    }
    
    // Check if we have Twitter API configuration
    if (process.env.TWITTER_BEARER_TOKEN) {
      // REAL API IMPLEMENTATION
      const client = getTwitterClient();
      
      const rules = trackingTerms.map(term => ({
        value: term,
        tag: `event:${eventId}`
      }));
      
      const streamClient = client.readOnly;
      
      await streamClient.v2.updateStreamRules({
        delete: { ids: await getStreamRuleIds(streamClient) }
      });
      
      await streamClient.v2.updateStreamRules({
        add: rules
      });
      
      logger.info(`Starting Twitter stream for event ${eventId} with rules:`, { rules });
      
      const stream = await streamClient.v2.searchStream({
        'tweet.fields': ['created_at', 'author_id', 'public_metrics', 'entities'],
        'user.fields': ['username', 'name', 'profile_image_url', 'public_metrics'],
        'expansions': ['author_id', 'referenced_tweets.id']
      });
      
      activeStreams.set(eventId, {
        stream,
        rules,
        startTime: new Date(),
        isMock: false
      });
      
      stream.on('data', async (tweet) => {
        try {
          await processTweet(tweet, eventId);
        } catch (error) {
          logger.error(`Error processing tweet: ${error.message}`, { error, tweet });
        }
      });
      
      stream.on('error', (error) => {
        logger.error(`Twitter stream error: ${error.message}`, { error, eventId });
      });
      
      return {
        success: true,
        message: 'Twitter stream started successfully',
        isActive: true,
        trackingTerms,
        isMock: false
      };
    } else {
      // MOCK IMPLEMENTATION WHEN API KEYS ARE NOT AVAILABLE
      logger.info(`Starting mock Twitter stream for event ${eventId} with terms:`, { trackingTerms });
      
      // Set up a mock stream that generates synthetic tweets every 30 seconds
      const mockInterval = setInterval(async () => {
        try {
          const mockTweets = generateMockTweets(trackingTerms, 1); // Generate 1 mock tweet at a time
          for (const tweet of mockTweets) {
            await processTweet(tweet, eventId);
          }
        } catch (error) {
          logger.error(`Error generating mock tweets: ${error.message}`, { error, eventId });
        }
      }, 30000); // Every 30 seconds
      
      activeStreams.set(eventId, {
        mockInterval,
        startTime: new Date(),
        trackingTerms,
        isMock: true
      });
      
      // Generate initial batch of mock tweets
      const initialTweets = generateMockTweets(trackingTerms, 3);
      for (const tweet of initialTweets) {
        await processTweet(tweet, eventId);
      }
      
      return {
        success: true,
        message: 'Mock Twitter stream started successfully',
        isActive: true,
        trackingTerms,
        isMock: true
      };
    }
  } catch (error) {
    logger.error(`Start Twitter stream error: ${error.message}`, { error, eventId });
    
    if (activeStreams.has(eventId)) {
      const activeStream = activeStreams.get(eventId);
      if (activeStream.stream) {
        activeStream.stream.destroy();
      } else if (activeStream.mockInterval) {
        clearInterval(activeStream.mockInterval);
      }
      activeStreams.delete(eventId);
    }
    
    throw error;
  }
};

/**
 * Stop Twitter stream for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Stream status
 */
exports.stopEventStream = async (eventId) => {
  try {
    if (!activeStreams.has(eventId)) {
      return {
        success: true,
        message: 'No active stream found',
        isActive: false
      };
    }
    
    const activeStream = activeStreams.get(eventId);
    
    if (activeStream.isMock) {
      // Clean up mock stream
      clearInterval(activeStream.mockInterval);
    } else {
      // Clean up real stream
      activeStream.stream.destroy();
      
      try {
        const client = getTwitterClient();
        const streamClient = client.readOnly;
        await streamClient.v2.updateStreamRules({
          delete: { ids: await getStreamRuleIds(streamClient) }
        });
      } catch (cleanupError) {
        logger.warn(`Error cleaning up Twitter stream rules: ${cleanupError.message}`, { cleanupError });
      }
    }
    
    activeStreams.delete(eventId);
    
    return {
      success: true,
      message: 'Twitter stream stopped successfully',
      isActive: false,
      runTime: getStreamRuntime(activeStream.startTime),
      isMock: activeStream.isMock
    };
  } catch (error) {
    logger.error(`Stop Twitter stream error: ${error.message}`, { error, eventId });
    throw error;
  }
};

/**
 * Get status of a Twitter stream
 * @param {string} eventId - Event ID
 * @returns {Object} Stream status
 */
exports.getStreamStatus = (eventId) => {
  try {
    const isActive = activeStreams.has(eventId);
    
    if (!isActive) {
      return {
        isActive: false,
        message: 'No active stream'
      };
    }
    
    const activeStream = activeStreams.get(eventId);
    
    return {
      isActive: true,
      startTime: activeStream.startTime,
      runTime: getStreamRuntime(activeStream.startTime),
      rules: activeStream.rules || activeStream.trackingTerms,
      message: 'Stream is active',
      isMock: activeStream.isMock
    };
  } catch (error) {
    logger.error(`Get stream status error: ${error.message}`, { error, eventId });
    return {
      isActive: false,
      error: error.message
    };
  }
};

/**
 * Get IDs of current stream rules
 * @param {Object} streamClient - Twitter stream client
 * @returns {Promise<Array>} Rule IDs
 */
const getStreamRuleIds = async (streamClient) => {
  try {
    const rules = await streamClient.v2.streamRules();
    return rules.data?.map(rule => rule.id) || [];
  } catch (error) {
    logger.error(`Get stream rule IDs error: ${error.message}`, { error });
    return [];
  }
};

/**
 * Calculate running time of a stream
 * @param {Date} startTime - Stream start time
 * @returns {string} Formatted runtime
 */
const getStreamRuntime = (startTime) => {
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

/**
 * Generate mock tweets for testing
 * @param {Array} trackingTerms - Hashtags, mentions, and keywords to include
 * @param {number} count - Number of mock tweets to generate
 * @returns {Array} Mock tweets
 */
// const generateMockTweets = (trackingTerms, count = 5) => {
//   const tweets = [];
  
//   const sentiments = [
//     { text: 'Loving this event! The speakers are fantastic! #awesome', sentiment: 'positive' },
//     { text: 'The line for registration is way too long. Been waiting for 30 minutes! #frustrated', sentiment: 'negative' },
//     { text: 'Audio issues in the main hall making it hard to hear the presenters #techproblems', sentiment: 'negative' },
//     { text: 'Just attended an incredible session about AI. Mind blown! #inspired', sentiment: 'positive' },
//     { text: 'Cannot see the slides from the back of the room. Need bigger screens! #visibility', sentiment: 'negative' },
//     { text: 'Wifi keeps dropping during the presentations #internetissues', sentiment: 'negative' },
//     { text: 'The food at this conference is amazing! Great job organizers! #foodie', sentiment: 'positive' },
//     { text: 'Room is too cold, everyone is shivering #temperature', sentiment: 'negative' },
//     { text: 'Pretty average presentation, nothing special #meh', sentiment: 'neutral' }
//   ];
  
//   for (let i = 0; i < count; i++) {
//     const randomTerm = trackingTerms[Math.floor(Math.random() * trackingTerms.length)] || '#event';
//     const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    
//     // Create mock tweet with the random sentiment and tracking term
//     const tweetText = `${randomSentiment.text} ${randomTerm}`;
    
//     // Extract hashtags from the tweet text
//     const hashtagMatches = [...tweetText.matchAll(/#(\w+)/g)];
//     const hashtags = hashtagMatches.map(match => ({
//       tag: match[1]
//     }));
    
//     // Extract mentions from the tweet text
//     const mentionMatches = [...tweetText.matchAll(/@(\w+)/g)];
//     const mentions = mentionMatches.map(match => ({
//       username: match[1]
//     }));
    
//     tweets.push({
//       data: {
//         id: `mock_tweet_${Date.now()}_${i}`,
//         text: tweetText,
//         created_at: new Date().toISOString(),
//         entities: {
//           hashtags,
//           mentions
//         }
//       },
//       includes: {
//         users: [{
//           id: `user_${Math.floor(Math.random() * 1000)}`,
//           username: `user${Math.floor(Math.random() * 1000)}`,
//           name: `User ${Math.floor(Math.random() * 1000)}`,
//           profile_image_url: 'https://placehold.co/100x100',
//           public_metrics: {
//             followers_count: Math.floor(Math.random() * 5000),
//             following_count: Math.floor(Math.random() * 1000),
//             tweet_count: Math.floor(Math.random() * 10000)
//           }
//         }]
//       }
//     });
//   }
  
//   return tweets;
// };

/**
 * Test tweet processing manually
 * @param {string} eventId - Event ID
 * @param {string} tweetText - Tweet text
 * @returns {Promise<Object>} Processed feedback
 */
// exports.testProcessTweet = async (eventId, tweetText) => {
//   try {
//     if (!eventId) {
//       throw new Error('Event ID is required');
//     }
    
//     const mockTweet = {
//       data: {
//         id: `test_tweet_${Date.now()}`,
//         text: tweetText || 'This is a test tweet for event feedback processing. #test',
//         created_at: new Date().toISOString(),
//         entities: {
//           hashtags: [{ tag: 'test' }],
//           mentions: []
//         }
//       },
//       includes: {
//         users: [{
//           id: 'test_user_123',
//           username: 'testuser',
//           name: 'Test User',
//           profile_image_url: 'https://placehold.co/100x100',
//           public_metrics: {
//             followers_count: 100,
//             following_count: 50,
//             tweet_count: 500
//           }
//         }]
//       }
//     };
    
//     const result = await processTweet(mockTweet, eventId);
//     return result;
//   } catch (error) {
//     logger.error(`Test process tweet error: ${error.message}`, { error, eventId });
//     throw error;
//   }
// };