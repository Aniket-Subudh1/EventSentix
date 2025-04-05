const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an event name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Please add a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please add an end date']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  organizers: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  socialTracking: {
    hashtags: {
      type: [String],
      default: []
    },
    mentions: {
      type: [String],
      default: []
    },
    keywords: {
      type: [String],
      default: []
    }
  },
  qrCode: { type: String },
  locationMap: {
    areas: [{
      name: String,
      description: String,
      keywords: [String] 
    }]
  },
  alertSettings: {
    negativeSentimentThreshold: {
      type: Number,
      default: -0.5, 
      min: -1,
      max: 0
    },
    issueAlertThreshold: {
      type: Number,
      default: 3,
      min: 1
    },
    autoResolveTime: {
      type: Number,
      default: 60, 
      min: 5
    }
  },
  integrations: {
    twitter: {
      enabled: { type: Boolean, default: true }
    },
    instagram: {
      enabled: { type: Boolean, default: false }
    },
    linkedin: {
      enabled: { type: Boolean, default: false }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

EventSchema.index({ owner: 1 });
EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ isActive: 1 });

// This method normalizes hashtags to include the # symbol if not present
EventSchema.pre('save', function(next) {
  // Validate dates
  if (this.startDate > this.endDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Normalize hashtags to ensure they have # prefix
  if (this.socialTracking && this.socialTracking.hashtags) {
    this.socialTracking.hashtags = this.socialTracking.hashtags.map(tag => {
      if (!tag.startsWith('#') && tag.trim() !== '') {
        return `#${tag}`;
      }
      return tag;
    });
  }
  
  next();
});

// Create a static method to find events by social tracking terms
EventSchema.statics.findByTrackingTerms = async function(terms = [], mentions = []) {
  // Normalize terms
  const normalizedTerms = terms.map(term => {
    // If term doesn't start with # and it's a hashtag, add the #
    if (!term.startsWith('#') && !term.startsWith('@')) {
      return `#${term}`;
    }
    return term;
  });
  
  // Create query conditions
  const conditions = [];
  
  if (normalizedTerms.length > 0) {
    conditions.push({ 'socialTracking.hashtags': { $in: normalizedTerms } });
    conditions.push({ 'socialTracking.keywords': { $in: terms } });
  }
  
  if (mentions.length > 0) {
    conditions.push({ 'socialTracking.mentions': { $in: mentions } });
  }
  
  // Only search active events
  return this.find({
    isActive: true,
    $or: conditions.length > 0 ? conditions : [{ _id: null }] // If no conditions, return no results
  });
};

module.exports = mongoose.model('Event', EventSchema);