/**
 * Election Controller
 * Handles election data and results
 */

const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const Student = require('../models/Student');
const blockchain = require('../config/blockchain');

/**
 * @desc    Get current active election
 * @route   GET /api/elections/current
 * @access  Public
 */
exports.getCurrentElection = async (req, res) => {
  try {
    const election = await Election.findOne({ 
      status: { $in: ['active', 'nomination'] } 
    });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'No active election found'
      });
    }

    // Get positions with candidate counts
    const positionsWithStats = await Promise.all(
      election.positions.map(async (pos) => {
        const candidateCount = await Candidate.countDocuments({
          electionId: election._id,
          positionId: pos.positionId,
          isActive: true
        });

        return {
          ...pos.toObject(),
          candidateCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        ...election.toObject(),
        positions: positionsWithStats
      }
    });

  } catch (error) {
    console.error('Get current election error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get election results
 * @route   GET /api/elections/results
 * @access  Public
 */
exports.getElectionResults = async (req, res) => {
  try {
    const election = await Election.findOne({ 
      status: { $in: ['ended', 'archived'] } 
    }).sort({ endDate: -1 });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'No completed election found'
      });
    }

    // If results are already published, return them
    if (election.resultsPublished && election.results.length > 0) {
      return res.status(200).json({
        success: true,
        data: {
          election: {
            title: election.title,
            academicYear: election.academicYear,
            endDate: election.endDate,
            totalVotes: election.totalVotesCast,
            turnout: election.voterTurnout
          },
          results: election.results
        }
      });
    }

    // Calculate results from blockchain
    const contract = blockchain.getContract();
    
    const results = [];
    
    for (const position of election.positions) {
      // Get candidates for this position
      const candidates = await Candidate.find({
        electionId: election._id,
        positionId: position.positionId
      }).sort({ candidateId: 1 });

      // Get vote counts from blockchain
      const candidatesWithVotes = await Promise.all(
        candidates.map(async (candidate) => {
          // In a real implementation, you'd get voteCount from contract
          // const candidateData = await contract.methods.getCandidate(
          //   position.positionId, 
          //   candidate.candidateId
          // ).call();
          
          return {
            candidateId: candidate.candidateId,
            name: candidate.name,
            voteCount: candidate.voteCount, // From database (synced)
            percentage: 0 // Calculate after totals
          };
        })
      );

      // Calculate total votes for this position
      const totalVotes = candidatesWithVotes.reduce(
        (sum, c) => sum + c.voteCount, 0
      );

      // Calculate percentages
      candidatesWithVotes.forEach(c => {
        c.percentage = totalVotes > 0 ? (c.voteCount / totalVotes) * 100 : 0;
      });

      // Sort by vote count descending
      candidatesWithVotes.sort((a, b) => b.voteCount - a.voteCount);

      // Get winner
      const winner = candidatesWithVotes.length > 0 ? candidatesWithVotes[0] : null;

      results.push({
        positionId: position.positionId,
        positionTitle: position.title,
        totalVotes,
        winner,
        candidates: candidatesWithVotes
      });
    }

    res.status(200).json({
      success: true,
      data: {
        election: {
          title: election.title,
          academicYear: election.academicYear,
          endDate: election.endDate,
          totalVotes: election.totalVotesCast,
          turnout: election.voterTurnout
        },
        results
      }
    });

  } catch (error) {
    console.error('Get election results error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get election timeline
 * @route   GET /api/elections/timeline
 * @access  Public
 */
exports.getElectionTimeline = async (req, res) => {
  try {
    const elections = await Election.find({
      status: { $in: ['active', 'ended', 'archived'] }
    }).sort({ startDate: -1 });

    const timeline = elections.map(election => ({
      id: election._id,
      title: election.title,
      academicYear: election.academicYear,
      status: election.status,
      startDate: election.startDate,
      endDate: election.endDate,
      totalVotes: election.totalVotesCast,
      turnout: election.voterTurnout
    }));

    res.status(200).json({
      success: true,
      data: timeline
    });

  } catch (error) {
    console.error('Get election timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get election by ID
 * @route   GET /api/elections/:id
 * @access  Public
 */
exports.getElectionById = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    res.status(200).json({
      success: true,
      data: election
    });

  } catch (error) {
    console.error('Get election by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};