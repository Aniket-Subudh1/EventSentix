const natural = require('natural');
const stopwords = require('stopwords').english;

const tokenizer = new natural.WordTokenizer();

const stemmer = natural.PorterStemmer;

exports.tokenize = (text) => {
  if (!text) return [];
  
  const lowerText = text.toLowerCase();
  
  return tokenizer.tokenize(lowerText);
};

exports.removeStopwords = (tokens) => {
  if (!tokens || !tokens.length) return [];
  
  return tokens.filter(token => !stopwords.includes(token));
};

exports.stemTokens = (tokens) => {
  if (!tokens || !tokens.length) return [];
  
  return tokens.map(token => stemmer.stem(token));
};


exports.extractHashtags = (text) => {
  if (!text) return [];
  
  const hashtags = [];
  const regex = /#[\w\u00C0-\u017F]+/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    hashtags.push(match[0].substring(1).toLowerCase());
  }
  
  return hashtags;
};


exports.extractMentions = (text) => {
  if (!text) return [];
  
  const mentions = [];
  const regex = /@[\w\u00C0-\u017F]+/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[0].substring(1).toLowerCase());
  }
  
  return mentions;
};

exports.extractKeywords = (text, count = 5) => {
  if (!text) return [];
  
  const tokens = this.tokenize(text);
  
  const filteredTokens = this.removeStopwords(tokens);
  
  const tokenFreq = {};
  filteredTokens.forEach(token => {
    if (token.length < 3) return;
    
    if (!tokenFreq[token]) {
      tokenFreq[token] = 1;
    } else {
      tokenFreq[token]++;
    }
  });
  
  const sortedTokens = Object.entries(tokenFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(entry => entry[0]);
  
  return sortedTokens;
};


exports.cleanText = (text) => {
  if (!text) return '';
  
  let cleanedText = text.replace(/https?:\/\/\S+/g, '');
  
  cleanedText = cleanedText.replace(/@[\w\u00C0-\u017F]+/g, '');
  cleanedText = cleanedText.replace(/#[\w\u00C0-\u017F]+/g, '');
  
  cleanedText = cleanedText.replace(/[^\w\s]/g, ' ');
  
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  
  return cleanedText;
};


exports.detectLanguage = (text) => {
  if (!text) return 'en';
  
  try {
    const languageDetector = new natural.LanguageDetect();
    const detections = languageDetector.detect(text, 1);
    
    if (detections.length > 0) {
      return detections[0][0];
    }
  } catch (error) {
    console.error('Language detection error:', error);
  }
  
  return 'en'; 
};