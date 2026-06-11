/**
 * Admin Routes
 * Handles all admin-related operations
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

// Middleware
const { protectAdmin, authorize } = require('../middleware/auth');

// Controllers
const {
  adminLogin,
  createElection,
  updateElection,
  addCandidate,
  startVoting,
  endVoting,
  getAllStudents,
  getAdminStats
} = require('../controllers/adminController');

/* =============================
   VALIDATION RULES
============================= */

// Election validation
const validateElection = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('academicYear')
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage('Academic year must be in format YYYY/YYYY'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  body('positions').isArray().withMessage('Positions must be an array')
];

// Candidate validation
const validateCandidate = [
  body('name').notEmpty().withMessage('Name is required'),
  body('regNumber')
    .matches(/^[A-Z]+\/\d{4}\/\d{2}$/)
    .withMessage('Registration number format invalid'),
  body('course').notEmpty().withMessage('Course is required'),
  body('yearOfStudy')
    .isInt({ min: 1, max: 6 })
    .withMessage('Year of study must be between 1 and 6'),
  body('faculty').notEmpty().withMessage('Faculty is required'),
  body('manifesto').notEmpty().withMessage('Manifesto is required'),
  body('positionId')
    .isInt({ min: 0, max: 12 })
    .withMessage('Valid position ID required'),
  body('positionTitle').notEmpty().withMessage('Position title is required'),
  body('electionId').isMongoId().withMessage('Valid election ID required')
];


// Admin Login
router.post('/login', adminLogin);


// Apply admin authentication to all routes below
router.use(protectAdmin);


router.post(
  '/elections',
  authorize('canCreateElections'),
  validateElection,
  createElection
);

router.put(
  '/elections/:id',
  authorize('canCreateElections'),
  updateElection
);

router.post(
  '/start-voting/:electionId',
  authorize('canStartVoting'),
  startVoting
);

router.post(
  '/end-voting/:electionId',
  authorize('canEndVoting'),
  endVoting
);

/* =============================
   CANDIDATE ROUTES
============================= */

router.post(
  '/candidates',
  authorize('canAddCandidates'),
  validateCandidate,
  addCandidate
);

/* =============================
   ANALYTICS ROUTES
============================= */

router.get(
  '/students',
  authorize('canViewAnalytics'),
  getAllStudents
);

router.get(
  '/stats',
  authorize('canViewAnalytics'),
  getAdminStats
);

module.exports = router;