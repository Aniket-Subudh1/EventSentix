const transformersService = require('./transformersService');
const textProcessing = require('../../utils/textProcessing');
const logger = require('../../utils/logger');
const natural = require('natural');
const classifier = new natural.BayesClassifier();

const issueKeywords = {
  'queue': ['queue', 'line', 'waiting', 'slow', 'long', 'entry', 'entrance', 'registration', 'check-in'],
  'audio': ['audio', 'sound', 'volume', 'mic', 'microphone', 'hear', 'loud', 'quiet', 'noise', 'echo', 'speaker'],
  'video': ['video', 'screen', 'projector', 'display', 'see', 'visible', 'visibility', 'projection', 'slides', 'presentation'],
  'crowding': ['crowd', 'crowded', 'full', 'packed', 'space', 'room', 'capacity', 'cramped', 'tight', 'busy', 'overcrowded'],
  'amenities': ['food', 'drink', 'water', 'coffee', 'bathroom', 'toilet', 'restroom', 'wifi', 'internet', 'chairs', 'seating'],
  'content': ['boring', 'interesting', 'speaker', 'talk', 'topic', 'session', 'presentation', 'content', 'information', 'relevance'],
  'temperature': ['hot', 'cold', 'temperature', 'air', 'conditioning', 'ac', 'heat', 'warm', 'freezing', 'stuffy', 'ventilation'],
  'safety': ['unsafe', 'dangerous', 'emergency', 'exit', 'security', 'safe', 'hazard', 'blocked', 'accident', 'incident']
};

const initializeClassifier = () => {
  Object.entries(issueKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      // Add various phrases containing the keyword
      classifier.addDocument(`The ${keyword} is really bad`, category);
      classifier.addDocument(`I have a problem with the ${keyword}`, category);
      classifier.addDocument(`${keyword} issues need to be fixed`, category);
      classifier.addDocument(`Poor ${keyword} quality`, category);
    });
  });
  
  classifier.train();
  
  logger.info('Issue classifier initialized');
};

initializeClassifier();


exports.classifyIssue = async (text) => {
  try {
    const transformersResult = await transformersService.detectIssueType(text);
    
    if (transformersResult.score > 0.7) {
      return {
        issueType: transformersResult.issueType,
        confidence: transformersResult.score,
        method: 'transformers'
      };
    }

    const cleanedText = textProcessing.cleanText(text);
    
    let highestMatchCount = 0;
    let bestMatchCategory = 'other';
    
    Object.entries(issueKeywords).forEach(([category, keywords]) => {
      const matchCount = keywords.filter(keyword => 
        cleanedText.toLowerCase().includes(keyword.toLowerCase())
      ).length;
      
      if (matchCount > highestMatchCount) {
        highestMatchCount = matchCount;
        bestMatchCategory = category;
      }
    });
    
    if (highestMatchCount > 0) {
      return {
        issueType: bestMatchCategory,
        confidence: Math.min(highestMatchCount / 3, 0.9), 
        method: 'keyword',
        matchCount: highestMatchCount
      };
    }
    
    const bayesResult = classifier.getClassifications(cleanedText);
    
    if (bayesResult.length > 0 && bayesResult[0].value > 0.3) {
      return {
        issueType: bayesResult[0].label,
        confidence: bayesResult[0].value,
        method: 'bayes'
      };
    }
    
    return {
      issueType: 'other',
      confidence: 0.3,
      method: 'fallback'
    };
  } catch (error) {
    logger.error(`Issue classification error: ${error.message}`, { error, text });
    
    return {
      issueType: 'other',
      confidence: 0,
      method: 'error',
      error: error.message
    };
  }
};

exports.detectSeverity = (text, sentimentScore) => {
  let severity = 'low';
  
  if (sentimentScore <= -0.7) {
    severity = 'high';
  } else if (sentimentScore <= -0.4) {
    severity = 'medium';
  }
  
  const urgentKeywords = [
    'urgent', 'immediately', 'emergency', 'dangerous', 'unsafe', 
    'broken', 'not working', 'serious', 'problem', 'help'
  ];
  
  const hasUrgentKeywords = urgentKeywords.some(keyword => 
    text.toLowerCase().includes(keyword)
  );
  
  if (hasUrgentKeywords && severity !== 'high') {
    severity = severity === 'medium' ? 'high' : 'medium';
  }
  
  return {
    severity,
    hasUrgentKeywords
  };
};


exports.extractLocation = (text, locationKeywords = []) => {
  try {
    if (!text) return null;
    
    const lowerText = text.toLowerCase();
    
    for (const location of locationKeywords) {
      if (lowerText.includes(location.toLowerCase())) {
        return location;
      }
    }
    
    const locationPatterns = [
      /in\s+(?:the\s+)?([a-zA-Z0-9\s]+(?:room|hall|area|section|building|floor|booth|stage|entrance|exit|gate))/i,
      /at\s+(?:the\s+)?([a-zA-Z0-9\s]+(?:room|hall|area|section|building|floor|booth|stage|entrance|exit|gate))/i,
      /(?:room|hall|area|section|building|floor|booth|stage|entrance|exit|gate)\s+([a-zA-Z0-9]+)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Location extraction error: ${error.message}`, { error, text });
    return null;
  }
};