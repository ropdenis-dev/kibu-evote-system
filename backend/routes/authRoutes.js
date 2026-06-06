/**
 * Authentication Routes
 * Handles student registration, login, and profile management
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  logout,
  getMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail
} = require('../controllers/authController');

// Validation rules
const registerValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('regNumber')
    .matches(/^[A-Z]+\/\d{4}\/\d{2}$/)
    .withMessage('Valid registration number required (e.g., BIT/0025/23)'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone')
    .matches(/^\+254\d{9}$/)
    .withMessage('Valid Kenyan phone number required (+254...)'),
  body('faculty').isIn([
    'School of Computing & Informatics',
    'School of Business & Economics',
    'School of Engineering',
    'School of Health Sciences',
    'School of Education',
    'School of Law'
  ]).withMessage('Valid faculty required'),
  body('course').notEmpty().withMessage('Course is required'),
  body('yearOfStudy').isInt({ min: 1, max: 6 }).withMessage('Year must be 1-6'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
];

const loginValidation = [
  body('regNumber').notEmpty().withMessage('Registration number required'),
  body('password').notEmpty().withMessage('Password required')
];

const passwordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/update-password', protect, passwordValidation, updatePassword);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.get('/verify-email/:verificationToken', verifyEmail);

module.exports = router;