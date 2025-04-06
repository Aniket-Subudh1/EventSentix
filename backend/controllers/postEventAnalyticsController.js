const PostEventAnalyzer = require('../services/analytics/postEventAnalyzer');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * @desc    Generate post-event analysis report
 * @route   GET /api/analytics/post-event/:eventId
 * @access  Private (Event owners and admins)
 */
exports.generatePostEventReport = asyncHandler(async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Check if force parameter is provided (to generate report for active events)
    const force = req.query.force === 'true';
    
    const report = await PostEventAnalyzer.generatePostEventReport(eventId, { force });
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error(`Generate post-event report error: ${error.message}`, { error, eventId: req.params.eventId });
    
    res.status(error.message.includes('Cannot generate') ? 400 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Check if post-event report is available
 * @route   GET /api/analytics/post-event/:eventId/availability
 * @access  Private (Event owners and admins)
 */
exports.checkReportAvailability = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found'
    });
  }
  
  const now = new Date();
  const eventEndDate = new Date(event.endDate);
  
  // Report is available if event has ended or is within 24 hours of ending
  const eventEnded = now > eventEndDate;
  const nearEnd = Math.abs(now - eventEndDate) < 24 * 60 * 60 * 1000;
  
  res.status(200).json({
    success: true,
    data: {
      available: eventEnded || nearEnd,
      eventEnded,
      nearEnd,
      daysRemaining: eventEnded ? 0 : Math.ceil((eventEndDate - now) / (1000 * 60 * 60 * 24)),
      eventEndDate
    }
  });
});

/**
 * @desc    Get event improvement recommendations
 * @route   GET /api/analytics/post-event/:eventId/recommendations
 * @access  Private (Event owners and admins)
 */
exports.getImprovementRecommendations = asyncHandler(async (req, res) => {
  try {
    // Generate full report but only return the recommendations section
    const report = await PostEventAnalyzer.generatePostEventReport(req.params.eventId, {
      force: req.query.force === 'true'
    });
    
    res.status(200).json({
      success: true,
      data: {
        event: report.event,
        recommendations: report.improvement
      }
    });
  } catch (error) {
    logger.error(`Get improvement recommendations error: ${error.message}`, { 
      error, 
      eventId: req.params.eventId 
    });
    
    res.status(error.message.includes('Cannot generate') ? 400 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Get event insights
 * @route   GET /api/analytics/post-event/:eventId/insights
 * @access  Private (Event owners and admins)
 */
exports.getEventInsights = asyncHandler(async (req, res) => {
  try {
    // Generate full report but only return the insights section
    const report = await PostEventAnalyzer.generatePostEventReport(req.params.eventId, {
      force: req.query.force === 'true'
    });
    
    res.status(200).json({
      success: true,
      data: {
        event: report.event,
        insights: report.insights
      }
    });
  } catch (error) {
    logger.error(`Get event insights error: ${error.message}`, { 
      error, 
      eventId: req.params.eventId 
    });
    
    res.status(error.message.includes('Cannot generate') ? 400 : 500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Export post-event report (PDF, JSON)
 * @route   GET /api/analytics/post-event/:eventId/export
 * @access  Private (Event owners and admins)
 */
exports.exportPostEventReport = asyncHandler(async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    
    // Generate the report
    const report = await PostEventAnalyzer.generatePostEventReport(req.params.eventId, {
      force: req.query.force === 'true'
    });
    
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        data: report
      });
    }
    
    res.status(400).json({
      success: false,
      message: `Export format '${format}' is not supported yet. Please use 'json' format.`
    });
  } catch (error) {
    logger.error(`Export post-event report error: ${error.message}`, { 
      error, 
      eventId: req.params.eventId,
      format: req.query.format
    });
    
    res.status(error.message.includes('Cannot generate') ? 400 : 500).json({
      success: false,
      message: error.message
    });
  }
});