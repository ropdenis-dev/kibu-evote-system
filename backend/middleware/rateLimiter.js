/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting request frequency
 */

const rateLimit = require('express-rate-limit');

// General API limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for auth routes
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again later'
  },
  skipSuccessfulRequests: true // Don't count successful logins
});

// Vote submission limiter
exports.voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1, // Limit each IP to 1 vote per hour
  message: {
    success: false,
    message: 'You can only vote once per hour'
  },
  keyGenerator: (req) => {
    // Use wallet address or user ID if available
    return req.user?.walletAddress || req.user?.id || req.ip;
  }
});

// Admin routes limiter
exports.adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 admin requests
  message: {
    success: false,
    message: 'Too many admin requests'
  }
});

// Candidate submission limiter (admin)
exports.candidateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit candidate additions
  message: {
    success: false,
    message: 'Too many candidate submissions'
  }
});