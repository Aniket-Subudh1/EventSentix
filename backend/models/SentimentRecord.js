const mongoose = require('mongoose');

const SentimentRecordSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.ObjectId,
    ref: 'Event',
    required: true
  },
  timeframe: {
    type: String,
    enum: ['minute', 'hour', 'day'],
    default: 'hour'
  },
  timestamp: {
    type: Date,
    required: true
  },
  data: {
    positive: {
      count: {
        type: Number,
        default: 0
      },
      avgScore: {
        type: Number,
        default: 0
      }
    },
    neutral: {
      count: {
        type: Number,
        default: 0
      },
      avgScore: {
        type: Number,
        default: 0
      }
    },
    negative: {
      count: {
        type: Number,
        default: 0
      },
      avgScore: {
        type: Number,
        default: 0
      }
    },
    total: {
      type: Number,
      default: 0
    }
  },
  sources: {
    twitter: {
      type: Number,
      default: 0
    },
    instagram: {
      type: Number,
      default: 0
    },
    linkedin: {
      type: Number,
      default: 0
    },
    app_chat: {
      type: Number,
      default: 0
    },
    survey: {
      type: Number,
      default: 0
    },
    direct: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    }
  },
  issues: {
    queue: {
      type: Number,
      default: 0
    },
    audio: {
      type: Number,
      default: 0
    },
    video: {
      type: Number,
      default: 0
    },
    crowding: {
      type: Number,
      default: 0
    },
    amenities: {
      type: Number,
      default: 0
    },
    content: {
      type: Number,
      default: 0
    },
    temperature: {
      type: Number,
      default: 0
    },
    safety: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SentimentRecordSchema.index({ event: 1, timeframe: 1, timestamp: -1 });
SentimentRecordSchema.index({ event: 1, timestamp: -1 });

SentimentRecordSchema.statics.aggregateEventSentiment = async function(eventId, timeframe = 'hour', startTime, endTime) {
  const query = { 
    event: mongoose.Types.ObjectId(eventId), 
    timeframe 
  };
  
  if (startTime || endTime) {
    query.timestamp = {};
    if (startTime) query.timestamp.$gte = new Date(startTime);
    if (endTime) query.timestamp.$lte = new Date(endTime);
  }
  
  const records = await this.find(query).sort({ timestamp: 1 });
  
  let result = {
    positive: { total: 0, avgScore: 0 },
    neutral: { total: 0, avgScore: 0 },
    negative: { total: 0, avgScore: 0 },
    total: 0,
    sources: {},
    issues: {},
    timeline: []
  };
  
  let positiveTotalScore = 0;
  let neutralTotalScore = 0;
  let negativeTotalScore = 0;
  
  records.forEach(record => {
    // Add to totals
    result.positive.total += record.data.positive.count;
    result.neutral.total += record.data.neutral.count;
    result.negative.total += record.data.negative.count;
    result.total += record.data.total;
    
    positiveTotalScore += record.data.positive.count * record.data.positive.avgScore;
    neutralTotalScore += record.data.neutral.count * record.data.neutral.avgScore;
    negativeTotalScore += record.data.negative.count * record.data.negative.avgScore;
    
    Object.keys(record.sources).forEach(source => {
      if (!result.sources[source]) result.sources[source] = 0;
      result.sources[source] += record.sources[source];
    });
    
    Object.keys(record.issues).forEach(issue => {
      if (!result.issues[issue]) result.issues[issue] = 0;
      result.issues[issue] += record.issues[issue];
    });
    
    // Add to timeline
    result.timeline.push({
      timestamp: record.timestamp,
      positive: record.data.positive.count,
      neutral: record.data.neutral.count,
      negative: record.data.negative.count,
      total: record.data.total
    });
  });
  
  if (result.positive.total > 0) {
    result.positive.avgScore = positiveTotalScore / result.positive.total;
  }
  
  if (result.neutral.total > 0) {
    result.neutral.avgScore = neutralTotalScore / result.neutral.total;
  }
  
  if (result.negative.total > 0) {
    result.negative.avgScore = negativeTotalScore / result.negative.total;
  }
  
  return result;
};

SentimentRecordSchema.statics.updateRecord = async function(eventId, timeframe, timestamp, feedbackData) {
  let roundedTimestamp = new Date(timestamp);
  if (timeframe === 'minute') {
    roundedTimestamp.setSeconds(0, 0);
  } else if (timeframe === 'hour') {
    roundedTimestamp.setMinutes(0, 0, 0);
  } else if (timeframe === 'day') {
    roundedTimestamp.setHours(0, 0, 0, 0);
  }
  
  let record = await this.findOne({
    event: eventId,
    timeframe,
    timestamp: roundedTimestamp
  });
  
  if (!record) {
    record = new this({
      event: eventId,
      timeframe,
      timestamp: roundedTimestamp
    });
  }
  
  const sentiment = feedbackData.sentiment;
  const source = feedbackData.source;
  const issueType = feedbackData.issueType || 'other';
  const sentimentScore = feedbackData.sentimentScore;
  
  record.data[sentiment].count += 1;
  
  const currentTotal = record.data[sentiment].count - 1; 
  const currentAvg = record.data[sentiment].avgScore;
  const newAvg = (currentTotal * currentAvg + sentimentScore) / record.data[sentiment].count;
  record.data[sentiment].avgScore = newAvg;
  
  record.data.total += 1;
  
  record.sources[source] += 1;
  
  if (sentiment === 'negative' && issueType) {
    record.issues[issueType] += 1;
  }
  
  await record.save();
  return record;
};

module.exports = mongoose.model('SentimentRecord', SentimentRecordSchema);