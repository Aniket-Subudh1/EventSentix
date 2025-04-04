let pipelineFunction;
try {
  pipelineFunction = require('@xenova/transformers').pipeline;
} catch (error) {
  console.warn(`Error importing @xenova/transformers: ${error.message}`);
}
const logger = require('../../utils/logger');

let sentimentPipeline = null;
let zeroShotClassificationPipeline = null;

exports.initializeNLP = async () => {
  try {
    logger.info('Initializing NLP pipelines...');
    
    // Skip initialization if env var is set or if transformers isn't available
    if (process.env.SKIP_NLP_MODELS === 'true' || !pipelineFunction) {
      logger.info('Skipping NLP model initialization (SKIP_NLP_MODELS=true or module not available)');
      return {
        sentimentPipeline: null,
        zeroShotClassificationPipeline: null,
        mockMode: true
      };
    }
    
    let sentimentPipelineInitialized = false;
    let zeroShotPipelineInitialized = false;
    
    if (!sentimentPipeline) {
      try {
        logger.info('Loading sentiment analysis model...');
        sentimentPipeline = await pipelineFunction('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        logger.info('Sentiment analysis model loaded successfully');
        sentimentPipelineInitialized = true;
      } catch (error) {
        logger.warn(`Failed to load sentiment model: ${error.message}`);
        sentimentPipeline = null;
      }
    } else {
      sentimentPipelineInitialized = true;
    }
    
    if (!zeroShotClassificationPipeline) {
      try {
        logger.info('Loading zero-shot classification model...');
        zeroShotClassificationPipeline = await pipelineFunction('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');
        logger.info('Zero-shot classification model loaded successfully');
        zeroShotPipelineInitialized = true;
      } catch (error) {
        logger.warn(`Failed to load zero-shot model: ${error.message}`);
        zeroShotClassificationPipeline = null;
      }
    } else {
      zeroShotPipelineInitialized = true;
    }
    
    return {
      sentimentPipeline,
      zeroShotClassificationPipeline,
      status: {
        sentimentReady: sentimentPipelineInitialized,
        zeroShotReady: zeroShotPipelineInitialized
      }
    };
  } catch (error) {
    logger.error(`Error initializing NLP pipelines: ${error.message}`, { error });
    // Return null pipelines instead of throwing error
    return {
      sentimentPipeline: null,
      zeroShotClassificationPipeline: null,
      error: error.message
    };
  }
};

/**
 * Analyze sentiment of text
 * @param {String} text - Text to analyze
 * @returns {Object} Sentiment analysis result
 */
exports.analyzeSentiment = async (text) => {
  try {
    // If no text, return neutral
    if (!text || text.trim() === '') {
      return { sentiment: 'neutral', score: 0 };
    }
    
    // Initialize pipeline if not already loaded
    if (!sentimentPipeline) {
      const init = await this.initializeNLP();
      
      // If still null after initialization, use fallback
      if (!init.sentimentPipeline) {
        logger.warn('Using fallback sentiment analysis (NLP models not available)');
        // Simple fallback using basic keyword matching
        const sentiment = text.match(/good|great|excellent|amazing|love|happy|positive/i) ? 'positive' :
                          text.match(/bad|terrible|awful|hate|poor|negative|issue|problem/i) ? 'negative' : 
                          'neutral';
        const score = sentiment === 'positive' ? 0.7 : 
                      sentiment === 'negative' ? -0.7 : 0;
        
        return { sentiment, score, method: 'fallback-keywords' };
      }
    }

    // Continue with transformer model if available
    if (sentimentPipeline) {
      try {
        const result = await sentimentPipeline(text);
        
        // Convert to our application's format
        let sentiment, score;
        
        if (result[0].label === 'POSITIVE') {
          sentiment = 'positive';
          score = result[0].score;
        } else if (result[0].label === 'NEGATIVE') {
          sentiment = 'negative';
          score = -result[0].score; // Convert to negative value for our scale
        } else {
          sentiment = 'neutral';
          score = 0;
        }
        
        // Normalize to -1 to 1 scale
        const normalizedScore = sentiment === 'negative' ? -result[0].score : result[0].score;
        
        return {
          sentiment,
          score: normalizedScore,
          method: 'transformers',
          original: result[0]
        };
      } catch (error) {
        logger.warn(`Sentiment analysis model error: ${error.message}, using fallback`);
        const sentiment = text.match(/good|great|excellent|amazing|love|happy|positive/i) ? 'positive' :
                          text.match(/bad|terrible|awful|hate|poor|negative|issue|problem/i) ? 'negative' : 
                          'neutral';
        const score = sentiment === 'positive' ? 0.7 : 
                      sentiment === 'negative' ? -0.7 : 0;
                          
        return { sentiment, score, method: 'fallback-after-error' };
      }
    } else {
      // Simple fallback using basic keyword matching
      const sentiment = text.match(/good|great|excellent|amazing|love|happy|positive/i) ? 'positive' :
                        text.match(/bad|terrible|awful|hate|poor|negative|issue|problem/i) ? 'negative' : 
                        'neutral';
      const score = sentiment === 'positive' ? 0.7 : 
                    sentiment === 'negative' ? -0.7 : 0;
      
      return { sentiment, score, method: 'fallback-keywords' };
    }
  } catch (error) {
    logger.error(`Sentiment analysis error: ${error.message}`, { error, text });
    // Return neutral sentiment on error
    return {
      sentiment: 'neutral',
      score: 0,
      error: error.message,
      method: 'error-fallback'
    };
  }
};

/**
 * Detect issue type from text
 * @param {String} text - Text to analyze
 * @returns {Object} Issue detection result
 */
exports.detectIssueType = async (text) => {
  try {
    // If no text, return 'other'
    if (!text || text.trim() === '') {
      return { issueType: 'other', score: 0 };
    }
    
    // Initialize pipeline if not already loaded
    if (!zeroShotClassificationPipeline) {
      const init = await this.initializeNLP();
      
      // If still null after initialization, use fallback
      if (!init.zeroShotClassificationPipeline) {
        logger.warn('Using fallback issue detection (NLP models not available)');
        return fallbackIssueDetection(text);
      }
    }

    // Continue with transformer model if available
    if (zeroShotClassificationPipeline) {
      try {
        // Define issue categories
        const issueCategories = [
          'queue', 'waiting in line', 
          'audio problems', 'sound issues',
          'video problems', 'display issues',
          'overcrowding', 'crowded space',
          'food and drink', 'bathroom facilities',
          'presentation content', 'speaker quality',
          'room temperature', 'air conditioning',
          'safety concerns'
        ];
        
        // Run zero-shot classification
        const result = await zeroShotClassificationPipeline(text, issueCategories);
        
        // Map results to our issue types
        const issueMap = {
          'queue': 'queue',
          'waiting in line': 'queue',
          'audio problems': 'audio',
          'sound issues': 'audio',
          'video problems': 'video',
          'display issues': 'video',
          'overcrowding': 'crowding',
          'crowded space': 'crowding',
          'food and drink': 'amenities',
          'bathroom facilities': 'amenities',
          'presentation content': 'content',
          'speaker quality': 'content',
          'room temperature': 'temperature',
          'air conditioning': 'temperature',
          'safety concerns': 'safety'
        };
        
        // Get the most likely issue
        const topIssue = result.labels[0];
        const topScore = result.scores[0];
        
        // Only return an issue if the score is above threshold
        if (topScore > 0.6) {
          return {
            issueType: issueMap[topIssue] || 'other',
            score: topScore,
            method: 'transformers',
            original: {
              label: topIssue,
              score: topScore
            }
          };
        }
        
        // If no strong match, use fallback
        return fallbackIssueDetection(text);
      } catch (error) {
        logger.warn(`Issue detection model error: ${error.message}, using fallback`);
        return fallbackIssueDetection(text);
      }
    } else {
      return fallbackIssueDetection(text);
    }
  } catch (error) {
    logger.error(`Issue detection error: ${error.message}`, { error, text });
    // Return 'other' on error
    return {
      issueType: 'other',
      score: 0,
      error: error.message,
      method: 'error-fallback'
    };
  }
};

// Fallback issue detection using keyword matching
function fallbackIssueDetection(text) {
  const lowerText = text.toLowerCase();
  
  const issuePatterns = {
    'queue': ['queue', 'line', 'wait', 'long', 'slow', 'entry', 'enter'],
    'audio': ['audio', 'sound', 'hear', 'loud', 'quiet', 'volume', 'mic', 'speaker'],
    'video': ['video', 'screen', 'see', 'visible', 'projection', 'display', 'slides'],
    'crowding': ['crowd', 'space', 'room', 'full', 'packed', 'cramped', 'busy'],
    'amenities': ['food', 'drink', 'bathroom', 'toilet', 'wifi', 'chair', 'seat'],
    'content': ['boring', 'presentation', 'speaker', 'talk', 'content', 'session'],
    'temperature': ['hot', 'cold', 'temp', 'air', 'ac', 'heat', 'warm', 'stuffy'],
    'safety': ['safe', 'danger', 'emergency', 'security', 'hazard', 'exit']
  };
  
  let bestMatch = 'other';
  let bestScore = 0;
  
  Object.entries(issuePatterns).forEach(([issue, keywords]) => {
    const matchCount = keywords.filter(kw => lowerText.includes(kw)).length;
    const score = matchCount / keywords.length;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = issue;
    }
  });
  
  return {
    issueType: bestScore > 0.1 ? bestMatch : 'other',
    score: bestScore,
    method: 'keyword-fallback'
  };
}