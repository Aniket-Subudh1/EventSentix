const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { protect } = require('../../middleware/auth');
const { authLimiter } = require('../../middleware/rateLimiter');

router.use(authLimiter);

router.post('/register', authController.register);

router.post('/login', authController.login);

router.get('/me', protect, authController.getMe);

router.get('/logout', authController.logout);

router.post('/forgot-password', authController.forgotPassword);

router.put('/reset-password/:resetToken', authController.resetPassword);

router.put('/update-details', protect, authController.updateDetails);

router.put('/update-password', protect, authController.updatePassword);

router.put('/alert-preferences', protect, authController.updateAlertPreferences);

module.exports = router;