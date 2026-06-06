/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

/**
 * Protect routes - verify student JWT
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get student from database
      const student = await Student.findById(decoded.id);

      if (!student) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if student is active
      if (!student.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account deactivated'
        });
      }

      // Attach student to request
      req.user = student;
      next();

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Protect admin routes - verify admin JWT
 */
exports.protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const admin = await Admin.findById(decoded.id);

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }

      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Admin account deactivated'
        });
      }

      req.admin = admin;
      next();

    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Authorize based on permissions
 * @param {string} permission - Permission to check
 */
exports.authorize = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check specific permission
    if (!req.admin.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

/**
 * Optional auth - doesn't require token but attaches user if present
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const student = await Student.findById(decoded.id);
        if (student && student.isActive) {
          req.user = student;
        }
      } catch (jwtError) {
        // Ignore invalid token
      }
    }
    
    next();

  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};