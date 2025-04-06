// server/models/Alert.js
const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  // Common fields for both systems
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: true
  },
  type: {
    type: String,
    enum: ['sos', 'sentiment', 'issue', 'trend', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'acknowledged', 'inProgress', 'resolved', 'ignored'],
    default: 'new'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // SOS-specific fields
  userName: {
    type: String,
    default: 'Anonymous User'
  },
  location: {
    latitude: { type: Number, required: false },
    longitude: { type: Number, required: false },
    accuracy: Number,
  },
  message: {
    type: String
  },

  // Existing system fields
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event'
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['queue', 'audio', 'video', 'crowding', 'amenities', 'content', 'temperature', 'safety', 'general', 'other', 'emergency'],
    default: 'general'
  },
  relatedFeedback: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Feedback'
  }],
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  metadata: {
    issueCount: Number,
    sentimentAverage: Number,
    detectionMethod: String,
    keywords: [String],
    autoResolveDue: Date
  },
  statusUpdates: [{
    status: String,
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
  resolvedAt: {
    type: Date
  }
});

// Indexes and pre-save hooks remain the same
AlertSchema.index({ event: 1, status: 1 });
AlertSchema.index({ event: 1, createdAt: -1 });
AlertSchema.index({ status: 1, notificationSent: 1 });

AlertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('Alert', AlertSchema);