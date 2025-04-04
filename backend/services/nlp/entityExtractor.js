const compromise = require('compromise');
const logger = require('../../utils/logger');
const textProcessing = require('../../utils/textProcessing');

exports.extractPeople = (text) => {
  try {
    if (!text) return [];
    
    const doc = compromise(text);
    const people = doc.people().out('array');
    
    return people;
  } catch (error) {
    logger.error(`People extraction error: ${error.message}`, { error, text });
    return [];
  }
};


exports.extractPlaces = (text) => {
  try {
    if (!text) return [];
    
    const doc = compromise(text);
    const places = doc.places().out('array');
    
    return places;
  } catch (error) {
    logger.error(`Place extraction error: ${error.message}`, { error, text });
    return [];
  }
};


exports.extractOrganizations = (text) => {
  try {
    if (!text) return [];
    
    const doc = compromise(text);
    const organizations = doc.organizations().out('array');
    
    return organizations;
  } catch (error) {
    logger.error(`Organization extraction error: ${error.message}`, { error, text });
    return [];
  }
};

exports.extractAllEntities = (text) => {
  try {
    const cleanedText = textProcessing.cleanText(text);
    
    const people = this.extractPeople(cleanedText);
    const places = this.extractPlaces(cleanedText);
    const organizations = this.extractOrganizations(cleanedText);
    const hashtags = textProcessing.extractHashtags(text);
    const mentions = textProcessing.extractMentions(text);
    
    return {
      people,
      places,
      organizations,
      hashtags,
      mentions
    };
  } catch (error) {
    logger.error(`Entity extraction error: ${error.message}`, { error, text });
    return {
      people: [],
      places: [],
      organizations: [],
      hashtags: [],
      mentions: []
    };
  }
};


exports.extractDates = (text) => {
  try {
    if (!text) return [];
    
    const doc = compromise(text);
    const dates = doc.dates().out('array');
    const times = doc.times().out('array');
    
    return [...dates, ...times];
  } catch (error) {
    logger.error(`Date/time extraction error: ${error.message}`, { error, text });
    return [];
  }
};


exports.extractNumbers = (text) => {
  try {
    if (!text) return [];
    
    const doc = compromise(text);
    const numbers = doc.numbers().out('array');
    
    return numbers;
  } catch (error) {
    logger.error(`Number extraction error: ${error.message}`, { error, text });
    return [];
  }
};


exports.extractLocations = (text, knownLocations = []) => {
  try {
    if (!text) return [];
    
    // Look for exact matches of known locations
    const extractedLocations = [];
    const lowerText = text.toLowerCase();
    
    for (const location of knownLocations) {
      if (lowerText.includes(location.toLowerCase())) {
        extractedLocations.push(location);
      }
    }
    
    const locationPatterns = [
      /(?:in|at)\s+(?:the\s+)?([a-zA-Z0-9\s]+(?:room|hall|area|section|building|floor|booth|stage|entrance|exit|gate))/i,
      /(?:room|hall|area|section|building|floor|booth|stage|entrance|exit|gate)\s+([a-zA-Z0-9]+)/i
    ];
    
    for (const pattern of locationPatterns) {
      const matches = text.match(pattern);
      if (matches && matches[1]) {
        extractedLocations.push(matches[1].trim());
      }
    }
    
    return [...new Set(extractedLocations)];
  } catch (error) {
    logger.error(`Location extraction error: ${error.message}`, { error, text });
    return [];
  }
};