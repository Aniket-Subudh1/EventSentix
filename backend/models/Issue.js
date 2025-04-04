const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: true
  },
  type: {
    type: String,
    enum: ['queue', 'audio', 'video', 'crowding', 'amenities', 'content', 'temperature', 'safety', 'other'],
    required: true
  },
  subtype: {
    type: String,
    default: null
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
  location: {
    type: String,
    default: null
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['detected', 'confirmed', 'inProgress', 'resolved', 'falsePositive'],
    default: 'detected'
  },
  feedback: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Feedback'
  }],
  alerts: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Alert'
  }],
  metadata: {
    feedbackCount: {
      type: Number,
      default: 0
    },
    firstDetectedAt: {
      type: Date,
      default: Date.now
    },
    lastMentionedAt: {
      type: Date,
      default: Date.now
    },
    keywords: [String],
    sentimentAverage: Number
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  resolutionNotes: {
    type: String,
    default: null
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

IssueSchema.index({ event: 1, type: 1 });
IssueSchema.index({ event: 1, status: 1 });
IssueSchema.index({ event: 1, severity: 1 });
IssueSchema.index({ event: 1, createdAt: -1 });

IssueSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

IssueSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = Date.now();
  }
  next();
});

IssueSchema.methods.addFeedback = async function(feedbackId) {
  if (!this.feedback.includes(feedbackId)) {
    this.feedback.push(feedbackId);
    this.metadata.feedbackCount = this.feedback.length;
    this.metadata.lastMentionedAt = Date.now();
    await this.save();
  }
  return this;
};

IssueSchema.statics.findActiveByType = async function(eventId, type) {
  return this.find({
    event: eventId,
    type: type,
    status: { $in: ['detected', 'confirmed', 'inProgress'] }
  }).sort({ createdAt: -1 });
};

IssueSchema.statics.findOrCreate = async function(issueData) {
  const existingIssue = await this.findOne({
    event: issueData.event,
    type: issueData.type,
    location: issueData.location,
    status: { $in: ['detected', 'confirmed', 'inProgress'] }
  });

  if (existingIssue) {
    existingIssue.metadata.feedbackCount += 1;
    existingIssue.metadata.lastMentionedAt = Date.now();
    
    if (issueData.feedback && issueData.feedback.length > 0) {
      existingIssue.feedback = [...new Set([...existingIssue.feedback, ...issueData.feedback])];
    }
    
    await existingIssue.save();
    return existingIssue;
  } else {
    return this.create(issueData);
  }
};

module.exports = mongoose.model('Issue', IssueSchema);