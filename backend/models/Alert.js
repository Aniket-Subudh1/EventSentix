const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: true
  },
  type: {
    type: String,
    enum: ['sentiment', 'issue', 'trend', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['queue', 'audio', 'video', 'crowding', 'amenities', 'content', 'temperature', 'safety', 'general', 'other'],
    default: 'general'
  },
  location: {
    type: String,
    default: null
  },
  relatedFeedback: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Feedback'
  }],
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'inProgress', 'resolved', 'ignored'],
    default: 'new'
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  metadata: {
    issueCount: Number,
    sentimentAverage: Number,
    detectionMethod: String,
    keywords: [String],
    autoResolveDue: Date
  },
  statusUpdates: [{
    status: {
      type: String,
      enum: ['new', 'acknowledged', 'inProgress', 'resolved', 'ignored'],
      required: true
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  notificationSent: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  }
});

AlertSchema.index({ event: 1, status: 1 });
AlertSchema.index({ event: 1, createdAt: -1 });
AlertSchema.index({ event: 1, severity: 1, status: 1 });
AlertSchema.index({ status: 1, notificationSent: 1 });

AlertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

AlertSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = Date.now();
  }
  next();
});

AlertSchema.statics.getActiveAlertCount = async function(eventId) {
  return this.countDocuments({
    event: eventId,
    status: { $in: ['new', 'acknowledged', 'inProgress'] }
  });
};

AlertSchema.statics.findSimilar = async function(eventId, category, timeWindow = 30) {
  const timeThreshold = new Date(Date.now() - timeWindow * 60 * 1000); // Convert minutes to ms
  
  return this.find({
    event: eventId,
    category: category,
    status: { $ne: 'resolved' },
    createdAt: { $gte: timeThreshold }
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Alert', AlertSchema);