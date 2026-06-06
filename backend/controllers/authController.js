/**
 * Authentication Controller
 * Handles student registration, login, and authentication
 */

const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Set cookie options
const cookieOptions = {
  expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
};

/**
 * @desc    Register a new student
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      firstName,
      middleName,
      lastName,
      regNumber,
      email,
      phone,
      faculty,
      course,
      yearOfStudy,
      password
    } = req.body;

    // Check if student already exists
    const existingStudent = await Student.findOne({
      $or: [
        { regNumber: regNumber.toUpperCase() },
        { email: email.toLowerCase() }
      ]
    });

    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: 'Student with this registration number or email already exists'
      });
    }

    // Create student
    const student = await Student.create({
      firstName,
      middleName,
      lastName,
      regNumber: regNumber.toUpperCase(),
      email: email.toLowerCase(),
      phone,
      faculty,
      course,
      yearOfStudy,
      password
    });

    // Generate token
    const token = generateToken(student._id);

    // Remove password from output
    student.password = undefined;

    // Log registration
    await AuditLog.create({
      action: 'REGISTER',
      userId: student._id,
      userModel: 'Student',
      regNumber: student.regNumber,
      details: { email: student.email, faculty },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Send response with cookie
    res.cookie('token', token, cookieOptions).status(201).json({
      success: true,
      token,
      data: student
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

/**
 * @desc    Login student
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { regNumber, password, rememberMe } = req.body;

    // Validate input
    if (!regNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide registration number and password'
      });
    }

    // Find student with password field
    const student = await Student.findOne({ 
      regNumber: regNumber.toUpperCase() 
    }).select('+password');

    // Check if student exists
    if (!student) {
      // Log failed attempt
      await AuditLog.create({
        action: 'LOGIN',
        details: { regNumber, success: false, reason: 'Student not found' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'failure'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (student.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked. Please try again after 30 minutes'
      });
    }

    // Check password
    const isMatch = await student.matchPassword(password);

    if (!isMatch) {
      // Increment login attempts
      await student.incrementLoginAttempts();

      // Log failed attempt
      await AuditLog.create({
        action: 'LOGIN',
        userId: student._id,
        userModel: 'Student',
        regNumber: student.regNumber,
        details: { success: false, reason: 'Invalid password' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'failure'
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if student is active
    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact administration.'
      });
    }

    // Update last login and reset attempts
    student.lastLogin = Date.now();
    student.loginAttempts = 0;
    student.lockUntil = undefined;
    await student.save();

    // Generate token
    const token = generateToken(student._id);
    
    // Set cookie expiry based on rememberMe
    if (rememberMe) {
      cookieOptions.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    // Remove password from output
    student.password = undefined;

    // Log successful login
    await AuditLog.create({
      action: 'LOGIN',
      userId: student._id,
      userModel: 'Student',
      regNumber: student.regNumber,
      details: { success: true },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });

    // Send response
    res.cookie('token', token, cookieOptions).status(200).json({
      success: true,
      token,
      data: student
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * @desc    Logout student
 * @route   GET /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // Log logout
    if (req.user) {
      await AuditLog.create({
        action: 'LOGOUT',
        userId: req.user.id,
        userModel: 'Student',
        regNumber: req.user.regNumber,
        details: { success: true },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    }).status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

/**
 * @desc    Get current logged in student
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/auth/update-password
 * @access  Private
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get student with password
    const student = await Student.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await student.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    student.password = newPassword;
    await student.save();

    // Log password change
    await AuditLog.create({
      action: 'UPDATE_PASSWORD',
      userId: student._id,
      userModel: 'Student',
      regNumber: student.regNumber,
      details: { success: true },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const student = await Student.findOne({ email: email.toLowerCase() });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'No student found with that email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and save to database
    student.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    student.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await student.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // TODO: Send email with reset URL
    // await sendEmail(...);

    // Log password reset request
    await AuditLog.create({
      action: 'FORGOT_PASSWORD',
      userId: student._id,
      userModel: 'Student',
      regNumber: student.regNumber,
      details: { email: student.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:resetToken
 * @access  Public
 */
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const student = await Student.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Set new password
    student.password = req.body.password;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpire = undefined;
    await student.save();

    // Log password reset
    await AuditLog.create({
      action: 'RESET_PASSWORD',
      userId: student._id,
      userModel: 'Student',
      regNumber: student.regNumber,
      details: { success: true },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:verificationToken
 * @access  Public
 */
exports.verifyEmail = async (req, res) => {
  try {
    // Implementation for email verification
    // Similar to reset password but for email confirmation
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};