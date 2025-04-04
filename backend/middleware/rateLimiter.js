const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');


const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, 
    max = 100, 
    message = 'Too many requests from this IP, please try again later',
    path = '*'
  } = options;


  const store = process.env.MONGO_URI ? 
    new MongoStore({
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017/event-sentiment-monitor',
      collectionName: 'rate_limits',
      expireTimeMs: windowMs,
      errorHandler: console.error
    }) : 
    undefined;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true, 
    legacyHeaders: false, 
    store,
    skip: (req) => {

      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      
  
      if (req.path.includes('/api/feedback/webhook')) {
        return true;
      }
      
      return false;
    }
  });
};


module.exports = {
  apiLimiter: createRateLimiter(),
  
  authLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many authentication attempts, please try again later'
  }),
  
  feedbackLimiter: createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many feedback submissions, please try again later'
  }),
  

  createRateLimiter
};