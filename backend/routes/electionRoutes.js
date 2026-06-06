/**
 * Election Routes
 * Handles election data and results
 */

const express = require('express');
const router = express.Router();
const {
  getCurrentElection,
  getElectionResults,
  getElectionTimeline,
  getElectionById
} = require('../controllers/electionController');

// Public routes
router.get('/current', getCurrentElection);
router.get('/results', getElectionResults);
router.get('/timeline', getElectionTimeline);
router.get('/:id', getElectionById);

module.exports = router;