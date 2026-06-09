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

// ========== IMPORT YOUR ACTUAL MODELS (ONCE!) ==========
const User = require('./models/User');
const Vote = require('./models/Vote');
const Student = require('./models/Student');
const Admin = require('./models/Admin');
const Election = require('./models/Election');  // Your real Election model
const Candidate = require('./models/Candidate');  // Your real Candidate model
const AuditLog = require('./models/AuditLog');

// Import configurations
const connectDB = require('./config/db');
const blockchain = require('./config/blockchain');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { sanitize } = require('./middleware/validation');

// Initialize express
const app = express();

// ========== CONNECT TO DATABASE ==========
console.log('📡 Connecting to database...');
connectDB();

// Monitor database connection
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB Error: ${err.message}`);
});

// Initialize blockchain connection (optional, don't fail if not available)
blockchain.initialize().catch(err => {
  console.warn(`⚠️ Blockchain not available: ${err.message}`);
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

// CORS for frontend
const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'https://ropdenis-dev.github.io',
  'https://kibu-evote.onrender.com',  // Your frontend URL
  'https://*.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.includes(allowed.replace('*', '')))) {
      return callback(null, true);
    }
    // Allow any render.com subdomain for flexibility
    if (origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    callback(null, true); // Allow all in development
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Sanitize input
app.use(sanitize);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/ping', (req, res) => {
  res.json({ success: true, message: "pong" });
});

// ========== USER AUTHENTICATION ==========
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, regNumber, email, phone, password, faculty, course, yearOfStudy } = req.body;
    
    const existingUser = await Student.findOne({ 
      $or: [
        { regNumber: regNumber.toUpperCase() },
        { email: email.toLowerCase() }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Registration number or email already exists' });
    }
    
    const newUser = new Student({
      firstName,
      lastName,
      regNumber: regNumber.toUpperCase(),
      email: email.toLowerCase(),
      phone,
      password,
      faculty: faculty || 'School of Computing & Informatics',
      course: course || 'Computer Science',
      yearOfStudy: yearOfStudy || 1,
      isActive: true
    });
    
    await newUser.save();
    
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.json({ success: true, message: 'Registration successful', data: userResponse });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { regNumber, password } = req.body;
    
    const user = await Student.findOne({ regNumber: regNumber.toUpperCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid registration number or password' });
    }
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid registration number or password' });
    }
    
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      data: {
        _id: user._id,
        regNumber: user.regNumber,
        fullName: user.fullName,
        email: user.email,
        faculty: user.faculty,
        course: user.course,
        yearOfStudy: user.yearOfStudy,
        hasVoted: user.hasVoted,
        votesCast: user.votesCast
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CANDIDATE ENDPOINTS ==========
app.get('/api/candidates/all', async (req, res) => {
  console.log('📡 /api/candidates/all called');
  
  try {
    const now = new Date();
    let activeElection = await Election.findOne({ 
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now }
    });
    
    if (!activeElection) {
      activeElection = await Election.findOne().sort({ createdAt: -1 });
    }
    
    if (!activeElection) {
      return res.json({ success: true, data: [], message: 'No election found' });
    }
    
    const candidates = await Candidate.find({ 
      electionId: activeElection._id,
      isActive: true,
      isApproved: true
    });
    
    const transformedCandidates = candidates.map(c => ({
      _id: c._id,
      name: c.name,
      regNumber: c.regNumber,
      course: c.course || 'Not specified',
      faculty: c.faculty || 'General',
      yearOfStudy: c.yearOfStudy || 3,
      manifesto: c.manifesto || 'No manifesto provided',
      positionTitle: c.positionTitle,
      positionId: c.positionId,
      candidateId: c.candidateId,
      photoUrl: c.photoUrl || '/images/default-avatar.jpg',
      voteCount: c.voteCount || 0
    }));
    
    res.json({ success: true, data: transformedCandidates });
    
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ success: false, error: error.message, data: [] });
  }
});

// ========== ELECTION ENDPOINTS ==========
app.get('/api/v1/elections', async (req, res) => {
  try {
    const elections = await Election.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: elections });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.json({ success: true, data: [] });
  }
});

app.get('/api/v1/elections/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }
    res.json({ success: true, data: election });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/elections', async (req, res) => {
  try {
    const { title, academicYear, startDate, endDate, totalVoters, status } = req.body;
    const election = new Election({
      title,
      academicYear,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalVoters,
      status: status || 'draft'
    });
    await election.save();
    res.json({ success: true, data: election });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/v1/elections/:id', async (req, res) => {
  try {
    const election = await Election.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: election });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/v1/elections/:id', async (req, res) => {
  try {
    await Election.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== POSITION ENDPOINTS ==========
app.get('/api/v1/positions/election/:electionId', async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId);
    if (!election || !election.positions) {
      return res.json({ success: true, data: [] });
    }
    res.json({ success: true, data: election.positions });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

app.post('/api/v1/positions', async (req, res) => {
  try {
    const { electionId, title, order, description } = req.body;
    const election = await Election.findById(electionId);
    
    if (!election) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }
    
    const newPosition = {
      positionId: election.positions.length + 1,
      title,
      description: description || '',
      maxCandidates: 10,
      minCandidates: 1
    };
    
    election.positions.push(newPosition);
    await election.save();
    
    res.json({ success: true, data: newPosition });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/v1/positions/:id', async (req, res) => {
  try {
    // Find election containing this position
    const election = await Election.findOne({ 'positions._id': req.params.id });
    if (election) {
      election.positions = election.positions.filter(p => p._id.toString() !== req.params.id);
      await election.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== CANDIDATE CRUD ==========
app.get('/api/v1/candidates/election/:electionId', async (req, res) => {
  try {
    const candidates = await Candidate.find({ electionId: req.params.electionId });
    res.json({ success: true, data: candidates });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

app.post('/api/v1/candidates', async (req, res) => {
  try {
    const { electionId, positionId, name, regNumber, course, manifesto, positionTitle } = req.body;
    
    // Get the next candidate ID
    const existingCandidates = await Candidate.find({ electionId });
    const nextCandidateId = existingCandidates.length + 1;
    
    const candidate = new Candidate({
      electionId,
      positionId,
      positionTitle: positionTitle || 'Unknown',
      name,
      regNumber: regNumber.toUpperCase(),
      course: course || '',
      manifesto: manifesto || '',
      candidateId: nextCandidateId,
      isActive: true,
      isApproved: true
    });
    
    await candidate.save();
    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/v1/candidates/:id', async (req, res) => {
  try {
    await Candidate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== VOTE ENDPOINTS ==========
app.get('/api/votes/check/:regNumber', async (req, res) => {
  try {
    const votes = await Vote.find({ regNumber: req.params.regNumber.toUpperCase() });
    res.json({ hasVoted: votes.length > 0, totalVotes: votes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/votes', async (req, res) => {
  try {
    const newVote = new Vote(req.body);
    await newVote.save();
    res.json({ success: true, message: 'Vote recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/results', async (req, res) => {
  try {
    const votes = await Vote.find({});
    const results = {};
    
    votes.forEach(vote => {
      if (!results[vote.positionTitle]) {
        results[vote.positionTitle] = {};
      }
      results[vote.positionTitle][vote.candidateName] = (results[vote.positionTitle][vote.candidateName] || 0) + 1;
    });
    
    res.json({ success: true, results, totalVotes: votes.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

// Error handler
app.use(errorHandler);

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 KIBU eVote Backend API`);
  console.log(`=================================`);
  console.log(`📡 API Server: http://localhost:${PORT}`);
  console.log(`💾 Database: MongoDB Connected`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`=================================\n`);
});

module.exports = server;