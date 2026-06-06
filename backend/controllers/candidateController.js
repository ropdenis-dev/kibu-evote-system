/**
 * Candidate Controller
 * Handles candidate information
 */

const Candidate = require('../models/Candidate');
const Election = require('../models/Election');

/**
 * @desc    Get all candidates for current election
 * @route   GET /api/candidates
 * @access  Public
 */
exports.getAllCandidates = async (req, res) => {
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

    const candidates = await Candidate.find({ 
      electionId: election._id,
      isActive: true,
      isApproved: true
    }).sort({ positionId: 1, candidateId: 1 });

    // Group by position
    const groupedByPosition = {};
    
    election.positions.forEach(position => {
      groupedByPosition[position.positionId] = {
        positionId: position.positionId,
        title: position.title,
        description: position.description,
        candidates: []
      };
    });

    candidates.forEach(candidate => {
      if (groupedByPosition[candidate.positionId]) {
        groupedByPosition[candidate.positionId].candidates.push(candidate);
      }
    });

    res.status(200).json({
      success: true,
      data: Object.values(groupedByPosition)
    });

  } catch (error) {
    console.error('Get all candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get candidates by position
 * @route   GET /api/candidates/position/:positionId
 * @access  Public
 */
exports.getCandidatesByPosition = async (req, res) => {
  try {
    const { positionId } = req.params;

    const election = await Election.findOne({ 
      status: { $in: ['active', 'nomination'] } 
    });

    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'No active election found'
      });
    }

    const position = election.positions.find(p => p.positionId === parseInt(positionId));

    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }

    const candidates = await Candidate.find({ 
      electionId: election._id,
      positionId: parseInt(positionId),
      isActive: true,
      isApproved: true
    }).sort({ candidateId: 1 });

    res.status(200).json({
      success: true,
      data: {
        position,
        candidates
      }
    });

  } catch (error) {
    console.error('Get candidates by position error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * @desc    Get single candidate
 * @route   GET /api/candidates/:id
 * @access  Public
 */
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found'
      });
    }

    res.status(200).json({
      success: true,
      data: candidate
    });

  } catch (error) {
    console.error('Get candidate by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};