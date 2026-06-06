/**
 * Admin Controller
 * Handles admin operations for election management
 */

const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const AuditLog = require('../models/AuditLog');
const blockchain = require('../config/blockchain');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT Token for admin
const generateToken = (id) => {
  return jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '1d'
  });
};

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated'
      });
    }

    admin.lastLogin = Date.now();
    await admin.save();

    const token = generateToken(admin._id);

    await AuditLog.create({
      action: 'ADMIN_LOGIN',
      userId: admin._id,
      userModel: 'Admin',
      details: { email: admin.email, role: admin.role },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      token,
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Create new election
 * @route   POST /api/admin/elections
 * @access  Private (Admin)
 */
exports.createElection = async (req, res) => {
  try {
    const {
      title,
      description,
      academicYear,
      startDate,
      endDate,
      nominationStartDate,
      nominationEndDate,
      positions
    } = req.body;

    // Check if there's already an active election
    const activeElection = await Election.findOne({ status: 'active' });
    if (activeElection && req.body.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'There is already an active election'
      });
    }

    const election = await Election.create({
      title,
      description,
      academicYear,
      startDate,
      endDate,
      nominationStartDate,
      nominationEndDate,
      positions,
      status: 'draft',
      createdBy: req.admin.id
    });

    await AuditLog.create({
      action: 'ELECTION_CREATED',
      userId: req.admin.id,
      userModel: 'Admin',
      details: { electionId: election._id, title: election.title },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: election
    });

  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Update election
 * @route   PUT /api/admin/elections/:id
 * @access  Private (Admin)
 */
exports.updateElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Prevent updating certain fields if election is active
    if (election.status === 'active') {
      delete req.body.startDate;
      delete req.body.endDate;
      delete req.body.positions;
    }

    const updatedElection = await Election.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    await AuditLog.create({
      action: 'ELECTION_UPDATED',
      userId: req.admin.id,
      userModel: 'Admin',
      details: { 
        electionId: election._id, 
        changes: Object.keys(req.body) 
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      data: updatedElection
    });

  } catch (error) {
    console.error('Update election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Add candidate
 * @route   POST /api/admin/candidates
 * @access  Private (Admin)
 */
exports.addCandidate = async (req, res) => {
  try {
    const {
      name,
      regNumber,
      course,
      yearOfStudy,
      faculty,
      manifesto,
      positionId,
      positionTitle,
      electionId,
      photoUrl
    } = req.body;

    // Check if election exists and is in nomination period
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    if (election.status !== 'nomination' && election.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add candidates at this stage'
      });
    }

    // Check if student exists
    const student = await Student.findOne({ regNumber: regNumber.toUpperCase() });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found in database'
      });
    }

    // Get next candidate ID for this position
    const lastCandidate = await Candidate.findOne({
      electionId,
      positionId
    }).sort({ candidateId: -1 });

    const candidateId = lastCandidate ? lastCandidate.candidateId + 1 : 0;

    // Interact with blockchain
    const contract = blockchain.getContract();
    
    try {
      // Add candidate to blockchain
      const txData = contract.methods.addCandidate(
        positionId,
        name,
        manifesto,
        course,
        yearOfStudy
      );
      
      const tx = await blockchain.sendTransaction(txData);
      
      // Create candidate in database
      const candidate = await Candidate.create({
        name,
        regNumber: regNumber.toUpperCase(),
        course,
        yearOfStudy,
        faculty,
        manifesto,
        positionId,
        positionTitle,
        electionId,
        candidateId,
        photoUrl: photoUrl || '/images/default-avatar.jpg',
        isApproved: true,
        approvedBy: req.admin.id,
        approvedAt: new Date(),
        contractAddress: process.env.CONTRACT_ADDRESS,
        transactionHash: tx.transactionHash
      });

      await AuditLog.create({
        action: 'CANDIDATE_ADDED',
        userId: req.admin.id,
        userModel: 'Admin',
        details: {
          candidateId,
          name,
          positionId,
          positionTitle,
          transactionHash: tx.transactionHash
        },
        transactionHash: tx.transactionHash,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        success: true,
        data: candidate,
        transaction: {
          hash: tx.transactionHash,
          blockNumber: tx.blockNumber
        }
      });

    } catch (blockchainError) {
      console.error('Blockchain error:', blockchainError);
      
      // Still create in database but mark as not on chain
      const candidate = await Candidate.create({
        name,
        regNumber: regNumber.toUpperCase(),
        course,
        yearOfStudy,
        faculty,
        manifesto,
        positionId,
        positionTitle,
        electionId,
        candidateId,
        photoUrl: photoUrl || '/images/default-avatar.jpg',
        isApproved: true,
        approvedBy: req.admin.id,
        approvedAt: new Date()
      });

      res.status(201).json({
        success: true,
        data: candidate,
        warning: 'Candidate added to database but blockchain transaction failed',
        blockchainError: blockchainError.message
      });
    }

  } catch (error) {
    console.error('Add candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Start voting
 * @route   POST /api/admin/start-voting/:electionId
 * @access  Private (Admin)
 */
exports.startVoting = async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    if (election.status !== 'draft' && election.status !== 'nomination') {
      return res.status(400).json({
        success: false,
        message: 'Election cannot be started'
      });
    }

    // Verify all positions have candidates
    for (const position of election.positions) {
      const candidateCount = await Candidate.countDocuments({
        electionId: election._id,
        positionId: position.positionId,
        isActive: true,
        isApproved: true
      });

      if (candidateCount === 0) {
        return res.status(400).json({
          success: false,
          message: `Position ${position.title} has no candidates`
        });
      }
    }

    // Interact with blockchain
    const contract = blockchain.getContract();
    
    try {
      // Calculate duration in days
      const durationDays = Math.ceil(
        (election.endDate - election.startDate) / (1000 * 60 * 60 * 24)
      );

      const txData = contract.methods.startVoting(durationDays);
      const tx = await blockchain.sendTransaction(txData);

      // Update election status
      election.status = 'active';
      election.contractDeployedAt = new Date();
      election.transactionHash = tx.transactionHash;
      await election.save();

      await AuditLog.create({
        action: 'ELECTION_STARTED',
        userId: req.admin.id,
        userModel: 'Admin',
        details: {
          electionId: election._id,
          title: election.title,
          transactionHash: tx.transactionHash
        },
        transactionHash: tx.transactionHash,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Voting started successfully',
        data: {
          election,
          transaction: {
            hash: tx.transactionHash,
            blockNumber: tx.blockNumber
          }
        }
      });

    } catch (blockchainError) {
      console.error('Blockchain error starting voting:', blockchainError);
      
      // Still update status in database
      election.status = 'active';
      await election.save();

      res.status(200).json({
        success: true,
        message: 'Voting started in database but blockchain transaction failed',
        data: election,
        blockchainError: blockchainError.message
      });
    }

  } catch (error) {
    console.error('Start voting error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    End voting
 * @route   POST /api/admin/end-voting/:electionId
 * @access  Private (Admin)
 */
exports.endVoting = async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    if (election.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Election is not active'
      });
    }

    // Interact with blockchain
    const contract = blockchain.getContract();
    
    try {
      const txData = contract.methods.endVoting();
      const tx = await blockchain.sendTransaction(txData);

      // Update election status
      election.status = 'ended';
      await election.save();

      await AuditLog.create({
        action: 'ELECTION_ENDED',
        userId: req.admin.id,
        userModel: 'Admin',
        details: {
          electionId: election._id,
          title: election.title,
          transactionHash: tx.transactionHash
        },
        transactionHash: tx.transactionHash,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Voting ended successfully',
        data: {
          election,
          transaction: {
            hash: tx.transactionHash,
            blockNumber: tx.blockNumber
          }
        }
      });

    } catch (blockchainError) {
      console.error('Blockchain error ending voting:', blockchainError);
      
      election.status = 'ended';
      await election.save();

      res.status(200).json({
        success: true,
        message: 'Voting ended in database but blockchain transaction failed',
        data: election,
        blockchainError: blockchainError.message
      });
    }

  } catch (error) {
    console.error('End voting error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get all students (admin)
 * @route   GET /api/admin/students
 * @access  Private (Admin)
 */
exports.getAllStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const students = await Student.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Student.countDocuments();

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get dashboard stats (admin)
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
exports.getAdminStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const votedStudents = await Student.countDocuments({ hasVoted: true });
    const activeElection = await Election.findOne({ status: 'active' });
    const totalCandidates = await Candidate.countDocuments({ isActive: true });

    const recentVotes = await Vote.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('studentId', 'firstName lastName regNumber faculty');

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalStudents,
          votedStudents,
          turnout: totalStudents > 0 ? (votedStudents / totalStudents) * 100 : 0,
          totalCandidates
        },
        election: activeElection ? {
          id: activeElection._id,
          title: activeElection.title,
          startDate: activeElection.startDate,
          endDate: activeElection.endDate,
          timeRemaining: activeElection.timeRemaining
        } : null,
        recentActivity: recentVotes
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};