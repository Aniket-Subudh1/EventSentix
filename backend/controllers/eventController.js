const Event = require('../models/Event');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');


exports.getEvents = asyncHandler(async (req, res) => {
  const filter = {};
  

  if (req.query.owner === 'me') {
    filter.owner = req.user.id;
  } else if (req.query.owner) {
    filter.owner = req.query.owner;
  }
  

  if (req.query.organizer === 'me') {
    filter.organizers = req.user.id;
  } else if (req.query.organizer) {
    filter.organizers = req.query.organizer;
  }
  

  if (req.query.active) {
    filter.isActive = req.query.active === 'true';
  }
  
  if (req.query.startDate || req.query.endDate) {
    filter.$and = [];
    
    if (req.query.startDate) {
      filter.$and.push({ endDate: { $gte: new Date(req.query.startDate) } });
    }
    
    if (req.query.endDate) {
      filter.$and.push({ startDate: { $lte: new Date(req.query.endDate) } });
    }
  }
  

  if (req.user.role !== 'admin') {
    if (!filter.$or) {
      filter.$or = [];
    }
    
    filter.$or.push({ owner: req.user.id });
    filter.$or.push({ organizers: req.user.id });
  }
  
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  const query = Event.find(filter)
    .skip(startIndex)
    .limit(limit)
    .sort({ startDate: req.query.sort === 'desc' ? -1 : 1 });
  

  const events = await query;
  const total = await Event.countDocuments(filter);
  
  res.status(200).json({
    success: true,
    count: events.length,
    total,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    data: events
  });
});


exports.createEvent = asyncHandler(async (req, res) => {

  req.body.owner = req.user.id;
  

  const event = await Event.create(req.body);
  
  res.status(201).json({
    success: true,
    data: event
  });
});

exports.getEvent = asyncHandler(async (req, res) => {

  const event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: event
  });
});


exports.updateEvent = asyncHandler(async (req, res) => {

  let event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  

  if (req.body.owner) {
    delete req.body.owner;
  }
  

  event = await Event.findByIdAndUpdate(req.params.eventId, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: event
  });
});

exports.deleteEvent = asyncHandler(async (req, res) => {

  const event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  if (event.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only the event owner can delete an event'
    });
  }
  
  await event.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

exports.addOrganizer = asyncHandler(async (req, res) => {
  // Use the event from middleware or fetch it
  let event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email'
    });
  }
  
  const user = await User.findOne({ email });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  if (event.organizers.includes(user._id)) {
    return res.status(400).json({
      success: false,
      message: 'User is already an organizer'
    });
  }
  
  event.organizers.push(user._id);
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event
  });
});

exports.removeOrganizer = asyncHandler(async (req, res) => {

  let event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  const organizerId = req.params.organizerId;
  
  if (!event.organizers.includes(organizerId)) {
    return res.status(400).json({
      success: false,
      message: 'User is not an organizer'
    });
  }
  
  event.organizers = event.organizers.filter(
    id => id.toString() !== organizerId
  );
  
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event
  });
});


exports.updateSocialTracking = asyncHandler(async (req, res) => {
  let event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  const { hashtags, mentions, keywords } = req.body;
  
  if (hashtags) event.socialTracking.hashtags = hashtags;
  if (mentions) event.socialTracking.mentions = mentions;
  if (keywords) event.socialTracking.keywords = keywords;
  
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event.socialTracking
  });
});

exports.updateAlertSettings = asyncHandler(async (req, res) => {

  let event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  const { negativeSentimentThreshold, issueAlertThreshold, autoResolveTime } = req.body;
  

  if (negativeSentimentThreshold !== undefined) {
    event.alertSettings.negativeSentimentThreshold = negativeSentimentThreshold;
  }
  
  if (issueAlertThreshold !== undefined) {
    event.alertSettings.issueAlertThreshold = issueAlertThreshold;
  }
  
  if (autoResolveTime !== undefined) {
    event.alertSettings.autoResolveTime = autoResolveTime;
  }
  
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event.alertSettings
  });
});

exports.getLocationMap = asyncHandler(async (req, res) => {

  const event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: event.locationMap
  });
});


exports.updateLocationMap = asyncHandler(async (req, res) => {

  let event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  const { areas } = req.body;
  
  if (areas) {
    event.locationMap.areas = areas;
  }
  
  await event.save();
  
  res.status(200).json({
    success: true,
    data: event.locationMap
  });
});

exports.toggleEventActive = asyncHandler(async (req, res) => {
  // Use the event from middleware or fetch it
  let event = req.event || await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  event.isActive = !event.isActive;
  
  await event.save();
  
  res.status(200).json({
    success: true,
    data: {
      id: event._id,
      isActive: event.isActive
    }
  });
});