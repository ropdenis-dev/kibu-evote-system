/**
 * Vote Controller
 * Handles voting operations and blockchain interaction
 */

const Student = require('../models/Student');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');
const blockchain = require('../config/blockchain');
const { validationResult } = require('express-validator');

/**
 * @desc    Submit votes to blockchain
 * @route   POST /api/votes/submit
 * @access  Private
 */
exports.submitVotes = async (req, res) => {
  try {
    const { votes, transactionHash, blockNumber } = req.body;
    
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Get student
    const student = await Student.findById(req.user.id);
    
    // Check if student has already voted
    if (student.hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election'
      });
    }

    // Get active election
    const election = await Election.findOne({ status: 'active' });
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'No active election found'
      });
    }

    // Verify transaction on blockchain
    const web3 = blockchain.getWeb3();
    const contract = blockchain.getContract();

    // Get transaction from blockchain
    const tx = await web3.eth.getTransaction(transactionHash);
    if (!tx) {
      return res.status(400).json({
        success: false,
        message: 'Transaction not found on blockchain'
      });
    }

    // Verify transaction is to our contract
    if (tx.to.toLowerCase() !== process.env.CONTRACT_ADDRESS.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contract address'
      });
    }

    // Verify sender is student's wallet
    if (tx.from.toLowerCase() !== student.walletAddress?.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: 'Transaction sender does not match your wallet'
      });
    }

    // Process each vote
    const voteRecords = [];
    
    for (const vote of votes) {
      // Get candidate
      const candidate = await Candidate.findOne({
        electionId: election._id,
        positionId: vote.positionId,
        candidateId: vote.candidateId
      });

      if (!candidate) {
        return res.status(400).json({
          success: false,
          message: `Candidate not found for position ${vote.positionId}`
        });
      }

      // Create vote record
      const voteRecord = await Vote.create({
        studentId: student._id,
        walletAddress: student.walletAddress,
        regNumber: student.regNumber,
        positionId: vote.positionId,
        positionTitle: vote.positionTitle,
        candidateId: vote.candidateId,
        candidateName: candidate.name,
        electionId: election._id,
        transactionHash,
        blockNumber,
        timestamp: new Date(),
        isVerified: true,
        verifiedAt: new Date()
      });

      voteRecords.push(voteRecord);

      // Update candidate vote count
      candidate.voteCount += 1;
      await candidate.save();
    }

    // Update student voting status
    student.hasVoted = true;
    student.votesCast = votes.length;
    student.completedPositions = votes.map(v => v.positionId);
    student.transactions.push({
      txHash: transactionHash,
      timestamp: new Date(),
      blockNumber
    });
    await student.save();

    // Update election stats
    election.totalVotesCast += votes.length;
    await election.save();

    // Log votes
    await AuditLog.create({
      action: 'VOTE_CAST',
      userId: student._id,
      userModel: 'Student',
      regNumber: student.regNumber,
      walletAddress: student.walletAddress,
      details: {
        votesCount: votes.length,
        transactionHash,
        blockNumber
      },
      transactionHash,
      blockNumber,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      message: 'Votes recorded successfully',
      data: {
        transactionHash,
        blockNumber,
        votes: voteRecords
      }
    });

  } catch (error) {
    console.error('Submit votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while submitting votes'
    });
  }
};

/**
 * @desc    Get student's votes
 * @route   GET /api/votes/my-votes
 * @access  Private
 */
exports.getMyVotes = async (req, res) => {
  try {
    const votes = await Vote.find({ 
      studentId: req.user.id 
    }).sort({ timestamp: -1 });

    // Get election info
    const election = await Election.findOne({ status: { $in: ['active', 'ended'] } });

    res.status(200).json({
      success: true,
      count: votes.length,
      data: {
        votes,
        election
      }
    });

  } catch (error) {
    console.error('Get my votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Verify a vote on blockchain
 * @route   GET /api/votes/verify/:transactionHash
 * @access  Private
 */
exports.verifyVote = async (req, res) => {
  try {
    const { transactionHash } = req.params;

    // Find vote in database
    const vote = await Vote.findOne({ transactionHash });
    
    if (!vote) {
      return res.status(404).json({
        success: false,
        message: 'Vote not found'
      });
    }

    // Verify on blockchain
    const web3 = blockchain.getWeb3();
    
    // Get transaction receipt
    const receipt = await web3.eth.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      return res.status(400).json({
        success: false,
        message: 'Transaction not found on blockchain',
        data: {
          databaseRecord: vote,
          blockchainStatus: 'not_found'
        }
      });
    }

    // Verify transaction status
    const isSuccessful = receipt.status === true;

    // Get transaction details
    const tx = await web3.eth.getTransaction(transactionHash);

    res.status(200).json({
      success: true,
      data: {
        databaseRecord: vote,
        blockchain: {
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          blockHash: receipt.blockHash,
          from: tx.from,
          to: tx.to,
          status: isSuccessful ? 'success' : 'failed',
          gasUsed: receipt.gasUsed,
          confirmations: await web3.eth.getBlockNumber() - receipt.blockNumber
        },
        isVerified: isSuccessful && tx.to.toLowerCase() === process.env.CONTRACT_ADDRESS.toLowerCase()
      }
    });

  } catch (error) {
    console.error('Verify vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

/**
 * @desc    Get voting statistics
 * @route   GET /api/votes/stats
 * @access  Public
 */
exports.getVotingStats = async (req, res) => {
  try {
    const election = await Election.findOne({ status: { $in: ['active', 'ended'] } });
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'No election found'
      });
    }

    // Get total students
    const totalStudents = await Student.countDocuments({ isActive: true });
    
    // Get votes by faculty
    const votesByFaculty = await Vote.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$student.faculty',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get votes by position
    const votesByPosition = await Vote.aggregate([
      {
        $group: {
          _id: '$positionId',
          title: { $first: '$positionTitle' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get recent votes
    const recentVotes = await Vote.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('studentId', 'firstName lastName faculty');

    res.status(200).json({
      success: true,
      data: {
        election: {
          title: election.title,
          status: election.status,
          startDate: election.startDate,
          endDate: election.endDate,
          totalVotes: election.totalVotesCast,
          voterTurnout: election.voterTurnout
        },
        statistics: {
          totalStudents,
          totalVoters: election.totalVotesCast,
          turnout: totalStudents > 0 ? (election.totalVotesCast / totalStudents) * 100 : 0,
          votesByFaculty,
          votesByPosition
        },
        recentVotes
      }
    });

  } catch (error) {
    console.error('Get voting stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};