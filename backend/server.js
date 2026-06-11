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
const { ethers } = require('ethers');

// ========== IMPORT YOUR ACTUAL MODELS ==========
const User = require('./models/User');
const Vote = require('./models/Vote');
const Student = require('./models/Student');
const Admin = require('./models/Admin');
const Election = require('./models/Election');
const Candidate = require('./models/Candidate');
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
console.log('Connecting to database...');
connectDB();

// Monitor database connection
mongoose.connection.on('connected', () => {
  console.log('MongoDB Connected Successfully');
  console.log('Database: ' + mongoose.connection.db.databaseName);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB Error: ' + err.message);
});

// Initialize blockchain connection
blockchain.initialize().catch(err => {
  console.warn('Blockchain not available: ' + err.message);
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
  'https://kibu-evote.onrender.com',
  'https://*.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.includes(allowed.replace('*', '')))) {
      return callback(null, true);
    }
    if (origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    callback(null, true);
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

// Get current user (me)
app.get('/api/auth/me', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    res.json({ success: true, data: { message: 'Authenticated' } });
});

// ========== CANDIDATE ENDPOINTS ==========
app.get('/api/candidates/all', async (req, res) => {
  console.log('/api/candidates/all called');
  
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

// ========== STUDENT AUTHENTICATION ENDPOINTS ==========
app.get('/api/results', async (req, res) => {
  try {
    const votes = await Vote.find({});
    const results = {};
    let totalVotes = 0;
    
    for (const vote of votes) {
      // Check if vote has the votes object (human-readable format)
      if (vote.votes && typeof vote.votes === 'object') {
        for (const [position, candidateName] of Object.entries(vote.votes)) {
          if (!results[position]) {
            results[position] = {};
          }
          results[position][candidateName] = (results[position][candidateName] || 0) + 1;
          totalVotes++;
        }
      } 
      // Fallback for old votes with candidateName array
      else if (vote.candidateName && vote.positionTitle === 'Multiple Positions') {
        // This is old format - skip or handle differently
        console.log('Old vote format found:', vote.candidateName);
      }
    }
    
    res.json({ success: true, results, totalVotes });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: error.message });
  }
});

// login endpoint
app.post('/api/auth/login', async (req, res) => {
    console.log('Login request:', req.body);
    
    try {
        const { regNumber, password } = req.body;
        
        const student = await Student.findOne({ 
            regNumber: regNumber.toUpperCase() 
        }).select('+password');
        
        if (!student) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid registration number or password' 
            });
        }
        
        const isMatch = await student.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid registration number or password' 
            });
        }
        
        student.lastLogin = new Date();
        await student.save();
        
        const studentResponse = student.toObject();
        delete studentResponse.password;
        
        res.json({ 
            success: true, 
            message: 'Login successful!',
            data: studentResponse,
            token: 'student_' + student._id + '_' + Date.now()
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Login failed' 
        });
    }
});

app.get('/api/auth/student/:regNumber', async (req, res) => {
    try {
        const student = await Student.findOne({ 
            regNumber: req.params.regNumber.toUpperCase() 
        });
        
        if (!student) {
            return res.status(404).json({ 
                success: false, 
                message: 'Student not found' 
            });
        }
        
        const studentResponse = student.toObject();
        delete studentResponse.password;
        
        res.json({ success: true, data: studentResponse });
        
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Check if student has voted in a SPECIFIC election 
app.get('/api/v1/votes/check/:regNumber/:electionId', async (req, res) => {
    try {
        const regNumber = req.params.regNumber.toUpperCase();
        const electionId = req.params.electionId;
        
        const vote = await Vote.findOne({ 
            regNumber: regNumber, 
            electionId: electionId 
        });
        
        if (vote) {
            res.json({ 
                hasVoted: true, 
                totalVotes: 1,
                voteData: {
                    votes: vote.votes,
                    transactionHash: vote.transactionHash,
                    timestamp: vote.timestamp,
                    blockNumber: vote.blockNumber
                }
            });
        } else {
            res.json({ hasVoted: false, totalVotes: 0, voteData: null });
        }
    } catch (error) {
        console.error('Check vote error:', error);
        res.json({ hasVoted: false, totalVotes: 0, voteData: null });
    }
});

// Endpoint for backward compatibility (check by regNumber only)
app.get('/api/v1/votes/check/:regNumber', async (req, res) => {
    try {
        const regNumber = req.params.regNumber.toUpperCase();
        const votes = await Vote.find({ regNumber: regNumber });
        res.json({ hasVoted: votes.length > 0, totalVotes: votes.length, votes: votes });
    } catch (error) {
        res.json({ hasVoted: false, totalVotes: 0 });
    }
});

// ========== RELAYER ENDPOINT ==========

// Initialize provider for Sepolia
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org');

// Admin wallet from .env
let adminWallet;
try {
    if (process.env.ADMIN_PRIVATE_KEY) {
        adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
        console.log('Admin wallet loaded: ' + adminWallet.address);
    } else {
        console.warn('ADMIN_PRIVATE_KEY not found in .env - relayer will not work');
    }
} catch (error) {
    console.error('Failed to load admin wallet:', error.message);
}

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

// Contract ABI for vote function
const CONTRACT_ABI_RELAYER = [
    {
        "inputs": [
            {
                "internalType": "uint256[]",
                "name": "positionIds",
                "type": "uint256[]"
            },
            {
                "internalType": "uint256[]",
                "name": "candidateIds",
                "type": "uint256[]"
            }
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Track which voters already submitted
const submittedVoters = new Set();

// Relayer endpoint - students send signatures, admin pays gas
app.post('/api/relay-vote', async (req, res) => {
    console.log('Relayer: Received vote signature');
    
    if (!adminWallet) {
        return res.status(500).json({ 
            success: false, 
            error: 'Relayer not configured. ADMIN_PRIVATE_KEY missing.' 
        });
    }
    
    try {
        const { signature, voteData, voterAddress, regNumber, humanReadableVotes } = req.body;
        
        // Validate required fields
        if (!signature || !voteData || !voterAddress) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }
        
        // Check if this voter already submitted
        if (submittedVoters.has(voterAddress)) {
            return res.status(400).json({ 
                success: false, 
                error: 'You have already voted!' 
            });
        }
        
        // Verify the signature
        const message = JSON.stringify(voteData);
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== voterAddress.toLowerCase()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid signature - address mismatch' 
            });
        }
        
        console.log('Signature verified for voter: ' + voterAddress);
        
        // Check if already voted in database
        const existingVote = await Vote.findOne({ 
            walletAddress: voterAddress.toLowerCase(),
            electionId: voteData.electionId
        });
        
        if (existingVote) {
            submittedVoters.add(voterAddress);
            return res.status(400).json({ 
                success: false, 
                error: 'Already voted in this election' 
            });
        }
        
        // Check admin balance
        const balance = await provider.getBalance(adminWallet.address);
        const balanceEth = ethers.formatEther(balance);
        if (parseFloat(balanceEth) < 0.01) {
            return res.status(500).json({ 
                success: false, 
                error: 'Admin wallet has insufficient funds. Please add Sepolia ETH.' 
            });
        }
        
        // ADMIN SUBMITS TRANSACTION (pays gas)
        console.log('Admin submitting transaction for ' + voterAddress + '...');
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI_RELAYER, adminWallet);
        
        const tx = await contract.vote(
            voteData.positionIds,
            voteData.candidateIds,
            {
                gasLimit: 500000,
                gasPrice: ethers.parseUnits('10', 'gwei')
            }
        );
        
        console.log('Transaction sent: ' + tx.hash);
        
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block ' + receipt.blockNumber);
        
        // Record the vote in database - SAVE HUMAN-READABLE VOTES
        const voteToSave = {
            studentId: regNumber ? await getStudentId(regNumber) : null,
            walletAddress: voterAddress.toLowerCase(),
            regNumber: regNumber || '',
            positionId: 0,
            positionTitle: 'Multiple Positions',
            candidateId: 0,
            candidateName: JSON.stringify(voteData.candidateIds),
            electionId: voteData.electionId,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            timestamp: new Date(),
            isVerified: true
        };
        
        // Save human-readable votes if provided
        if (humanReadableVotes) {
            voteToSave.votes = humanReadableVotes;
        } else if (voteData.votes) {
            voteToSave.votes = voteData.votes;
        }
        
        const newVote = new Vote(voteToSave);
        await newVote.save();
        
        // Mark as voted in students collection
        if (regNumber) {
            await Student.findOneAndUpdate(
                { regNumber: regNumber.toUpperCase() },
                { hasVoted: true, votesCast: voteData.positionIds.length }
            );
        }
        
        // Add to memory set
        submittedVoters.add(voterAddress);
        
        res.json({ 
            success: true, 
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            message: 'Vote recorded on blockchain! Admin paid the gas fee.'
        });
        
    } catch (error) {
        console.error('Relayer error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to submit vote' 
        });
    }
});

// Check if voter has already voted (by wallet address)
app.get('/api/v1/votes/check/:address', async (req, res) => {
    try {
        const address = req.params.address.toLowerCase();
        const vote = await Vote.findOne({ walletAddress: address });
        res.json({ 
            hasVoted: !!vote, 
            totalVotes: vote ? 1 : 0,
            voteData: vote || null
        });
    } catch (error) {
        console.error('Check vote error:', error);
        res.json({ hasVoted: false, totalVotes: 0 });
    }
});

// Helper function to get student ID from registration number
async function getStudentId(regNumber) {
    const student = await Student.findOne({ regNumber: regNumber.toUpperCase() });
    return student ? student._id : null;
}

// Get relayer status
app.get('/api/relayer/status', async (req, res) => {
    try {
        if (!adminWallet) {
            return res.json({
                success: false,
                error: 'Relayer not configured',
                adminAddress: null,
                balance: '0',
                hasFunds: false,
                votersProcessed: submittedVoters.size
            });
        }
        
        const balance = await provider.getBalance(adminWallet.address);
        const balanceEth = ethers.formatEther(balance);
        
        res.json({
            success: true,
            adminAddress: adminWallet.address,
            balance: balanceEth,
            hasFunds: parseFloat(balanceEth) > 0.01,
            votersProcessed: submittedVoters.size
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
  console.log('\nKIBU eVote Backend API');
  console.log('=================================');
  console.log('API Server: http://localhost:' + PORT);
  console.log('Database: MongoDB Connected');
  console.log('Health check: http://localhost:' + PORT + '/health');
  console.log('Relayer status: http://localhost:' + PORT + '/api/relayer/status');
  console.log('=================================\n');
});

module.exports = server;