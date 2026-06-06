/**
 * Vote Routes
 * Handles voting operations
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  submitVotes,
  getMyVotes,
  verifyVote,
  getVotingStats
} = require('../controllers/voteController');

// Validation rules
const voteValidation = [
  body('votes').isArray().withMessage('Votes must be an array'),
  body('votes.*.positionId').isInt({ min: 0, max: 12 }).withMessage('Valid position ID required'),
  body('votes.*.candidateId').isInt({ min: 0 }).withMessage('Valid candidate ID required'),
  body('votes.*.positionTitle').notEmpty().withMessage('Position title required'),
  body('transactionHash')
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Valid transaction hash required'),
  body('blockNumber').isInt().withMessage('Valid block number required')
];

// Routes
router.post('/submit', protect, voteValidation, submitVotes);
router.get('/my-votes', protect, getMyVotes);
router.get('/verify/:transactionHash', protect, verifyVote);
router.get('/stats', getVotingStats);

module.exports = router;