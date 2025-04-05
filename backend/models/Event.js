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
    hashtags: [String],
    mentions: [String],
    keywords: [String]
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
      enabled: {
        type: Boolean,
        default: false
      },
      settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    instagram: {
      enabled: {
        type: Boolean,
        default: false
      },
      settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },
    linkedin: {
      enabled: {
        type: Boolean,
        default: false
      },
      settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);

// module.exports = mongoose.model('Event', EventSchema);

