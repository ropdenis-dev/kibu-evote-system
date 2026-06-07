/**
 * KIBU eVote Backend Server - API Only
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const colors = require('colors');
const User = require('./models/User');

// Import models
const Vote = require('./models/Vote');

// Import configurations
const connectDB = require('./config/db');
const blockchain = require('./config/blockchain');

// Import middleware
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { sanitize } = require('./middleware/validation');

// Import routes
const routes = require('./routes');

// Initialize express
const app = express();

// Connect to database
connectDB();

// Initialize blockchain connection
blockchain.initialize().then(() => {
  console.log('✅ Blockchain connected'.green);
}).catch(err => {
  console.error(`❌ Blockchain connection failed: ${err.message}`.red);
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS for Live Server frontend
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'https://ropdenis-dev.github.io'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Sanitize input
app.use(sanitize);

// Test route
app.get('/ping', (req, res) => {
  res.json({ success: true, message: "pong" });
});

// User Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, regNumber, email, phone, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ regNumber: regNumber.toUpperCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Registration number already exists' });
    }
    
    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      regNumber: regNumber.toUpperCase(),
      email,
      phone,
      password
    });
    
    await newUser.save();
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// User Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { regNumber, password } = req.body;
    
    const user = await User.findOne({ regNumber: regNumber.toUpperCase() });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid registration number or password' });
    }
    
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Invalid registration number or password' });
    }
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      data: {
        regNumber: user.regNumber,
        fullName: `${user.firstName} ${user.lastName}`,
        _id: user._id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// JWT Authentication Middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// route to fetch election results
app.get('/api/results', async (req, res) => {
  try {
    const votes = await Vote.find({});
    
    const results = {};
    let totalVotes = 0;
    
    votes.forEach(vote => {
      totalVotes++;
      if (vote.votes) {
        for (const [position, candidate] of Object.entries(vote.votes)) {
          if (!results[position]) {
            results[position] = {};
          }
          if (!results[position][candidate]) {
            results[position][candidate] = 0;
          }
          results[position][candidate]++;
        }
      }
    });
    
    res.json({
      success: true,
      results: results,
      totalVotes: totalVotes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check if student has already voted
app.get('/api/votes/check/:regNumber', async (req, res) => {
  try {
    const { regNumber } = req.params;
    const existingVote = await Vote.findOne({ regNumber: regNumber.toUpperCase() });
    
    if (existingVote) {
      res.json({ 
        hasVoted: true, 
        voteDate: existingVote.timestamp,
        totalVotes: await Vote.countDocuments({ regNumber: regNumber.toUpperCase() })
      });
    } else {
      res.json({ hasVoted: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save vote
app.post('/api/votes', async (req, res) => {
  try {
    const {
      studentId,
      walletAddress,
      regNumber,
      positionId,
      positionTitle,
      candidateId,
      candidateName,
      electionId,
      transactionHash,
      blockNumber,
      timestamp,
      ipAddress,
      userAgent
    } = req.body;
    
    // Check if already voted for this position
    const existingVote = await Vote.findOne({ 
      regNumber: regNumber.toUpperCase(), 
      positionId: positionId 
    });
    
    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted for this position' });
    }
    
    const newVote = new Vote({
      studentId,
      walletAddress,
      regNumber: regNumber.toUpperCase(),
      positionId,
      positionTitle,
      candidateId,
      candidateName,
      electionId,
      transactionHash,
      blockNumber,
      timestamp,
      ipAddress,
      userAgent,
      confirmedAt: new Date()
    });
    
    await newVote.save();
    res.json({ success: true, message: 'Vote recorded successfully', vote: newVote });
    
  } catch (error) {
    console.error('Save vote error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all votes for results
app.get('/api/votes/results', authenticate, async (req, res) => {
  try {
    const votes = await Vote.find({}).sort({ timestamp: -1 });
    
    const results = {};
    votes.forEach(vote => {
      if (!results[vote.positionTitle]) {
        results[vote.positionTitle] = {};
      }
      if (!results[vote.positionTitle][vote.candidateName]) {
        results[vote.positionTitle][vote.candidateName] = 0;
      }
      results[vote.positionTitle][vote.candidateName]++;
    });
    
    res.json({ 
      success: true, 
      results: results, 
      totalVotes: votes.length,
      votes: votes 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use routes
app.use('/', routes);

// ========== 404 HANDLER (LAST) ==========
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found.'
  });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 KIBU eVote Backend API`.yellow.bold);
  console.log(`=================================`.gray);
  console.log(`📡 API Server:`.cyan, `http://localhost:${PORT}`.green);
  console.log(`💾 Database:`.cyan, `MongoDB Connected`.green);
  console.log(`=================================\n`.gray);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = server;