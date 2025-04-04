const { body, param, query, validationResult } = require('express-validator');


exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  
  return res.status(400).json({
    success: false,
    errors: errors.array()
  });
};


exports.registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot be more than 50 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];


exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
];


exports.eventValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Event name is required')
    .isLength({ max: 100 })
    .withMessage('Event name cannot be more than 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot be more than 500 characters'),
  
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
];


exports.feedbackValidation = [
  body('event')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Event ID must be valid'),
  
  body('source')
    .trim()
    .notEmpty()
    .withMessage('Source is required')
    .isIn(['twitter', 'instagram', 'linkedin', 'app_chat', 'survey', 'direct', 'other'])
    .withMessage('Source must be valid'),
  
  body('text')
    .trim()
    .notEmpty()
    .withMessage('Feedback text is required')
];


exports.alertValidation = [
  body('event')
    .notEmpty()
    .withMessage('Event ID is required')
    .isMongoId()
    .withMessage('Event ID must be valid'),
  
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Alert type is required')
    .isIn(['sentiment', 'issue', 'trend', 'system'])
    .withMessage('Alert type must be valid'),
  
  body('severity')
    .trim()
    .notEmpty()
    .withMessage('Severity is required')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be valid'),
  
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
];


exports.objectIdValidation = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid ID`)
];


exports.eventIdValidation = [
  param('eventId')
    .isMongoId()
    .withMessage('Event ID must be a valid ID')
];


exports.dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];