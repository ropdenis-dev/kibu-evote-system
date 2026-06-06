/**
 * Validation Middleware
 * Validates incoming requests
 */

const { validationResult } = require('express-validator');

/**
 * Check for validation errors
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Sanitize input data
 */
exports.sanitize = (req, res, next) => {
  // Remove any potentially dangerous fields
  const dangerousFields = ['__proto__', 'constructor', 'prototype'];
  
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (dangerousFields.includes(key)) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);

  next();
};

/**
 * Validate registration number format
 */
exports.validateRegNumber = (regNumber) => {
  const regRegex = /^[A-Z]+\/\d{4}\/\d{2}$/;
  return regRegex.test(regNumber);
};

/**
 * Validate wallet address
 */
exports.validateWalletAddress = (address) => {
  const walletRegex = /^0x[a-fA-F0-9]{40}$/;
  return walletRegex.test(address);
};

/**
 * Validate email
 */
exports.validateEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone (Kenyan)
 */
exports.validatePhone = (phone) => {
  const phoneRegex = /^\+254\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate year of study
 */
exports.validateYear = (year) => {
  return year >= 1 && year <= 6;
};

/**
 * Validate position ID
 */
exports.validatePositionId = (positionId) => {
  return positionId >= 0 && positionId <= 12;
};

/**
 * Validate transaction hash
 */
exports.validateTxHash = (hash) => {
  const txRegex = /^0x[a-fA-F0-9]{64}$/;
  return txRegex.test(hash);
};