const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: true
  },
  source: {
    type: String,
    enum: ['twitter', 'instagram', 'linkedin', 'app_chat', 'survey', 'direct', 'other'],
    required: true
  },
  sourceId: {
    type: String, 
    sparse: true
  },
  text: {
    type: String,
    required: [true, 'Feedback text is required'],
    trim: true
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
  issueType: {
    type: String,
    enum: ['queue', 'audio', 'video', 'crowding', 'amenities', 'content', 'temperature', 'safety', 'other', null],
    default: null
  },
  issueDetails: {
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', null],
      default: null
    },
    location: {
      type: String,
      default: null
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  metadata: {
    username: String,
    platform: String,
    profileUrl: String,
    followerCount: Number,
    mediaUrls: [String],
    hashTags: [String],
    mentions: [String]
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

FeedbackSchema.index({ event: 1, createdAt: -1 });
FeedbackSchema.index({ event: 1, sentiment: 1 });
FeedbackSchema.index({ event: 1, issueType: 1 });
FeedbackSchema.index({ sourceId: 1 }, { sparse: true });
FeedbackSchema.index({ processed: 1 });

FeedbackSchema.statics.getTrendData = async function(eventId, timeframe = 'hour') {
  const event = await mongoose.model('Event').findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  let groupByFormat;
  let timeRange;

  switch (timeframe) {
    case 'minute':
      groupByFormat = { year: '$year', month: '$month', day: '$day', hour: '$hour', minute: '$minute' };
      timeRange = { $gte: new Date(Date.now() - 60 * 60 * 1000) }; // Last hour
      break;
    case 'hour':
      groupByFormat = { year: '$year', month: '$month', day: '$day', hour: '$hour' };
      timeRange = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }; // Last 24 hours
      break;
    case 'day':
      groupByFormat = { year: '$year', month: '$month', day: '$day' };
      timeRange = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }; // Last week
      break;
    default:
      groupByFormat = { year: '$year', month: '$month', day: '$day', hour: '$hour' };
      timeRange = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }; // Default to last 24 hours
  }

  const trendData = await this.aggregate([
    {
      $match: {
        event: mongoose.Types.ObjectId(eventId),
        createdAt: timeRange
      }
    },
    {
      $project: {
        sentiment: 1,
        sentimentScore: 1,
        issueType: 1,
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' },
        minute: { $minute: '$createdAt' }
      }
    },
    {
      $group: {
        _id: {
          timeGroup: groupByFormat,
          sentiment: '$sentiment'
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$sentimentScore' }
      }
    },
    {
      $sort: { '_id.timeGroup': 1 }
    }
  ]);

  return trendData;
};

module.exports = mongoose.model('Feedback', FeedbackSchema);