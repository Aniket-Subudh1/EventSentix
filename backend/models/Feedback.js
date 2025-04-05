const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  source: {
    type: String,
    enum: ['direct', 'twitter', 'instagram', 'linkedin', 'manual', 'survey'],
    default: 'direct',
    required: true
  },
  sourceId: {
    type: String,
    default: null
  },
  user: {
    type: String,
    default: 'Anonymous',
    trim: true,
    maxlength: 100
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  text: {
    type: String,
    required: true,
    maxlength: [2000, 'Text cannot be more than 2000 characters']
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true
  },
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  issueType: {
    type: String,
    default: null
  },
  issueDetails: {
    location: { type: String, default: null },
    resolved: { type: Boolean, default: false },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    }
  },
  processed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

FeedbackSchema.index(
  { event: 1, source: 1, sourceId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Feedback', FeedbackSchema);
