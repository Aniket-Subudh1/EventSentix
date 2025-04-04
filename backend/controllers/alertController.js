const Alert = require('../models/Alert');
const Event = require('../models/Event');
const alertGenerator = require('../services/alert/alertGenerator');
const socketHandler = require('../services/realtime/socketHandler');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

exports.getEventAlerts = asyncHandler(async (req, res) => {

  const query = {
    event: req.params.eventId
  };
  
  if (req.query.status) {
    if (Array.isArray(req.query.status)) {
      query.status = { $in: req.query.status };
    } else {
      query.status = req.query.status;
    }
  }
  
  if (req.query.type) {
    if (Array.isArray(req.query.type)) {
      query.type = { $in: req.query.type };
    } else {
      query.type = req.query.type;
    }
  }
  
  if (req.query.severity) {
    if (Array.isArray(req.query.severity)) {
      query.severity = { $in: req.query.severity };
    } else {
      query.severity = req.query.severity;
    }
  }
  
  if (req.query.category) {
    if (Array.isArray(req.query.category)) {
      query.category = { $in: req.query.category };
    } else {
      query.category = req.query.category;
    }
  }
  

  if (req.query.startDate || req.query.endDate) {
    query.createdAt = {};
    
    if (req.query.startDate) {
      query.createdAt.$gte = new Date(req.query.startDate);
    }
    
    if (req.query.endDate) {
      query.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  

  const total = await Alert.countDocuments(query);
  

  const select = req.query.select 
    ? req.query.select.split(',').join(' ') 
    : 'event type severity title category status location createdAt resolvedAt';
  
  const alerts = await Alert.find(query)
    .select(select)
    .skip(startIndex)
    .limit(limit)
    .sort({ createdAt: req.query.sort === 'asc' ? 1 : -1 });
  
  res.status(200).json({
    success: true,
    count: alerts.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: alerts
  });
});

exports.getActiveAlertCount = asyncHandler(async (req, res) => {

  const counts = {
    total: await Alert.countDocuments({
      event: req.params.eventId
    }),
    active: await Alert.countDocuments({
      event: req.params.eventId,
      status: { $in: ['new', 'acknowledged', 'inProgress'] }
    }),
    new: await Alert.countDocuments({
      event: req.params.eventId,
      status: 'new'
    }),
    acknowledged: await Alert.countDocuments({
      event: req.params.eventId,
      status: 'acknowledged'
    }),
    inProgress: await Alert.countDocuments({
      event: req.params.eventId,
      status: 'inProgress'
    }),
    resolved: await Alert.countDocuments({
      event: req.params.eventId,
      status: 'resolved'
    }),
    critical: await Alert.countDocuments({
      event: req.params.eventId,
      severity: 'critical',
      status: { $ne: 'resolved' }
    }),
    high: await Alert.countDocuments({
      event: req.params.eventId,
      severity: 'high',
      status: { $ne: 'resolved' }
    })
  };
  
  res.status(200).json({
    success: true,
    data: counts
  });
});

exports.getAlertById = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.alertId);
  
  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }
  

  const event = await Event.findById(alert.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }
  
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this alert'
    });
  }
  
  res.status(200).json({
    success: true,
    data: alert
  });
});

exports.updateAlertStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a status'
    });
  }
  
  let alert = await Alert.findById(req.params.alertId);
  
  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  const event = await Event.findById(alert.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }
  
 
  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this alert'
    });
  }

  alert.status = status;
  

  alert.statusUpdates.push({
    status,
    note: note || '',
    updatedBy: req.user.id,
    timestamp: new Date()
  });
  
  if (status === 'resolved' && !alert.resolvedAt) {
    alert.resolvedAt = new Date();
  }
  
  await alert.save();
  
  if (req.io) {
    socketHandler.broadcastAlert(req.io, alert);
  }
  
  res.status(200).json({
    success: true,
    data: alert
  });
});


exports.assignAlert = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  
  let alert = await Alert.findById(req.params.alertId);
  
  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  const event = await Event.findById(alert.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }
  

  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this alert'
    });
  }
  

  alert.assignedTo = userId || null;
  
  if (userId && alert.status === 'new') {
    alert.status = 'acknowledged';
    
    alert.statusUpdates.push({
      status: 'acknowledged',
      note: `Assigned to user ${userId}`,
      updatedBy: req.user.id,
      timestamp: new Date()
    });
  }
  
  await alert.save();
  

  if (req.io) {
    socketHandler.broadcastAlert(req.io, alert);
  }
  
  res.status(200).json({
    success: true,
    data: alert
  });
});


exports.addAlertNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  
  if (!note) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a note'
    });
  }
  
  let alert = await Alert.findById(req.params.alertId);
  
  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  const event = await Event.findById(alert.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this alert'
    });
  }
  
  alert.statusUpdates.push({
    status: alert.status,
    note,
    updatedBy: req.user.id,
    timestamp: new Date()
  });
  
  await alert.save();
  
  res.status(200).json({
    success: true,
    data: alert.statusUpdates
  });
});

exports.createAlert = asyncHandler(async (req, res) => {

  const event = await Event.findById(req.body.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to create alerts for this event'
    });
  }
  
  const alertData = {
    ...req.body,
    metadata: {
      ...req.body.metadata,
      detectionMethod: 'manual'
    }
  };
  
  const alert = await alertGenerator.createManualAlert(alertData);
  

  if (req.io) {
    socketHandler.broadcastAlert(req.io, alert);
  }
  
  res.status(201).json({
    success: true,
    data: alert
  });
});

exports.updateAlert = asyncHandler(async (req, res) => {
  let alert = await Alert.findById(req.params.alertId);
  
  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }

  const event = await Event.findById(alert.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id && 
    !event.organizers.map(org => org.toString()).includes(req.user.id)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this alert'
    });
  }

  const allowedUpdates = {
    title: req.body.title,
    description: req.body.description,
    severity: req.body.severity,
    category: req.body.category,
    location: req.body.location
  };
  
  const filteredUpdates = Object.entries(allowedUpdates)
    .filter(([_, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  
  alert = await Alert.findByIdAndUpdate(
    req.params.alertId,
    filteredUpdates,
    {
      new: true,
      runValidators: true
    }
  );

  if (req.io) {
    socketHandler.broadcastAlert(req.io, alert);
  }
  
  res.status(200).json({
    success: true,
    data: alert
  });
});

exports.deleteAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.alertId);
  
  if (!alert) {
    return res.status(404).json({
      success: false,
      message: 'Alert not found'
    });
  }
  

  const event = await Event.findById(alert.event);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Associated event not found'
    });
  }

  if (
    req.user.role !== 'admin' &&
    event.owner.toString() !== req.user.id
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this alert'
    });
  }
  
  await alert.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});


exports.getAlertTypes = asyncHandler(async (req, res) => {

  const types = [
    { id: 'sentiment', label: 'Sentiment', description: 'Alerts based on negative sentiment detection' },
    { id: 'issue', label: 'Issue', description: 'Alerts for specific identified issues' },
    { id: 'trend', label: 'Trend', description: 'Alerts for trending problems or sentiment changes' },
    { id: 'system', label: 'System', description: 'System-generated alerts' }
  ];

  const categories = [
    { id: 'queue', label: 'Queue/Waiting', description: 'Issues with lines or waiting times' },
    { id: 'audio', label: 'Audio Problems', description: 'Sound system or audio quality issues' },
    { id: 'video', label: 'Video/Display', description: 'Projection, screens or visibility issues' },
    { id: 'crowding', label: 'Overcrowding', description: 'Space or capacity problems' },
    { id: 'amenities', label: 'Amenities', description: 'Issues with facilities like food, bathrooms, etc.' },
    { id: 'content', label: 'Content', description: 'Issues with speakers, presentations or content' },
    { id: 'temperature', label: 'Temperature', description: 'Issues with room temperature or climate' },
    { id: 'safety', label: 'Safety', description: 'Safety or security concerns' },
    { id: 'general', label: 'General', description: 'General alerts not fitting other categories' },
    { id: 'other', label: 'Other', description: 'Miscellaneous issues' }
  ];


  const severities = [
    { id: 'low', label: 'Low', description: 'Minor issues with minimal impact' },
    { id: 'medium', label: 'Medium', description: 'Notable issues affecting some attendees' },
    { id: 'high', label: 'High', description: 'Significant issues affecting many attendees' },
    { id: 'critical', label: 'Critical', description: 'Major issues requiring immediate attention' }
  ];
  
  res.status(200).json({
    success: true,
    data: {
      types,
      categories,
      severities
    }
  });
});

exports.getAlertsBySeverity = asyncHandler(async (req, res) => {

  let eventFilter = {};
  
  if (req.user.role !== 'admin') {
    const events = await Event.find({
      $or: [
        { owner: req.user.id },
        { organizers: req.user.id }
      ]
    }).select('_id');
    
    eventFilter = { event: { $in: events.map(e => e._id) } };
  }
  
  const query = {
    ...eventFilter,
    severity: req.params.severity,
    status: { $in: ['new', 'acknowledged', 'inProgress'] }
  };
  

  const alerts = await Alert.find(query)
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('event', 'name');
  
  res.status(200).json({
    success: true,
    count: alerts.length,
    data: alerts
  });
});


exports.resolveMultipleAlerts = asyncHandler(async (req, res) => {
  const { alertIds, note } = req.body;
  
  if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of alert IDs'
    });
  }
  

  const alerts = await Alert.find({ _id: { $in: alertIds } });
  
 
  const authorizedAlerts = [];
  
  for (const alert of alerts) {
    const event = await Event.findById(alert.event);
    
    if (!event) {
      continue; 
    }

    if (
      req.user.role === 'admin' ||
      event.owner.toString() === req.user.id || 
      event.organizers.map(org => org.toString()).includes(req.user.id)
    ) {
      authorizedAlerts.push(alert);
    }
  }
  
  if (authorizedAlerts.length === 0) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update any of these alerts'
    });
  }
  
  const resolvedAlerts = [];
  const now = new Date();
  
  for (const alert of authorizedAlerts) {

    if (alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = now;
      
  
      alert.statusUpdates.push({
        status: 'resolved',
        note: note || 'Bulk resolution',
        updatedBy: req.user.id,
        timestamp: now
      });
      
      await alert.save();
      resolvedAlerts.push(alert);

      if (req.io) {
        socketHandler.broadcastAlert(req.io, alert);
      }
    }
  }
  
  res.status(200).json({
    success: true,
    message: `Resolved ${resolvedAlerts.length} alerts`,
    total: alertIds.length,
    resolved: resolvedAlerts.length,
    data: resolvedAlerts.map(a => a._id)
  });
});