/**
 * Candidate Routes
 * Handles candidate information
 */

const express = require('express');
const router = express.Router();
const {
  getAllCandidates,
  getCandidatesByPosition,
  getCandidateById
} = require('../controllers/candidateController');

// Public routes
router.get('/', getAllCandidates);
router.get('/position/:positionId', getCandidatesByPosition);
router.get('/:id', getCandidateById);

module.exports = router;