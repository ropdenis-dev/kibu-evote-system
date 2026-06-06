/**
 * Main Routes Index
 * Combines all route modules
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const voteRoutes = require('./voteRoutes');
const electionRoutes = require('./electionRoutes');
const candidateRoutes = require('./candidateRoutes');
const adminRoutes = require('./adminRoutes');

// API version prefix
const API_PREFIX = '/api/v1';

// Register routes
router.use(`${API_PREFIX}/auth`, authRoutes);
router.use(`${API_PREFIX}/votes`, voteRoutes);
router.use(`${API_PREFIX}/elections`, electionRoutes);
router.use(`${API_PREFIX}/candidates`, candidateRoutes);
router.use(`${API_PREFIX}/admin`, adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'KIBU eVote API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

module.exports = router;