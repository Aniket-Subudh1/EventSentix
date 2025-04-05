const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  source: {
    type: String,
    enum: ['twitter', 'instagram', 'linkedin', 'manual', 'survey'],
    required: true
  },
  sourceId: {
    type: String,
    required: false
  },
  text: {
    type: String,
    required: true,
    maxlength: [2000, 'Text cannot be more than 2000 characters']
  },
  sentiment: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index to prevent duplicate entries from the same source
FeedbackSchema.index({ event: 1, source: 1, sourceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);

