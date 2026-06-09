/**
 * Election Model
 * Represents an election instance
 */

const mongoose = require('mongoose');

const ElectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Election title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    //required: [true, 'Election description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}\/\d{4}$/, 'Please use format YYYY/YYYY']
  },
  
  // Timeline
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  nominationStartDate: Date,
  nominationEndDate: Date,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'nomination', 'active', 'paused', 'ended', 'archived'],
    default: 'draft'
  },
  
  // Blockchain
  contractAddress: {
    type: String,
    match: [
      /^0x[a-fA-F0-9]{40}$/,
      'Please enter a valid Ethereum address'
    ]
  },
  contractDeployedAt: Date,
  transactionHash: String,
  
  // Statistics
  totalVoters: {
    type: Number,
    default: 0
  },
  totalVotesCast: {
    type: Number,
    default: 0
  },
  voterTurnout: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Configuration
  positions: [{
    positionId: Number,
    title: {
      type: String,
      required: true
    },
    description: String,
    maxCandidates: {
      type: Number,
      default: 10
    },
    minCandidates: {
      type: Number,
      default: 1
    }
  }],
  
  // Results
  resultsPublished: {
    type: Boolean,
    default: false
  },
  resultsPublishedAt: Date,
  results: [{
    positionId: Number,
    positionTitle: String,
    winner: {
      candidateId: Number,
      name: String,
      voteCount: Number
    },
    candidates: [{
      candidateId: Number,
      name: String,
      voteCount: Number,
      percentage: Number
    }]
  }],
  
  // Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Validate dates
ElectionSchema.pre('save', function(next) {
  if (this.startDate >= this.endDate) {
    next(new Error('End date must be after start date'));
  }
  if (this.nominationStartDate && this.nominationEndDate) {
    if (this.nominationStartDate >= this.nominationEndDate) {
      next(new Error('Nomination end date must be after start date'));
    }
    if (this.nominationEndDate >= this.startDate) {
      next(new Error('Nomination period must end before voting starts'));
    }
  }
  next();
});

// Calculate voter turnout
ElectionSchema.methods.calculateTurnout = async function() {
  const Student = mongoose.model('Student');
  const totalStudents = await Student.countDocuments({ isActive: true });
  this.totalVoters = totalStudents;
  this.voterTurnout = totalStudents > 0 
    ? (this.totalVotesCast / totalStudents) * 100 
    : 0;
  return this.voterTurnout;
};

// Check if election is active
ElectionSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.startDate && 
         now <= this.endDate;
};

// Check if election has ended
ElectionSchema.methods.hasEnded = function() {
  const now = new Date();
  return this.status === 'ended' || now > this.endDate;
};

// Get time remaining
ElectionSchema.virtual('timeRemaining').get(function() {
  if (!this.isActive()) return null;
  const now = new Date();
  const diff = this.endDate - now;
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
});

// Indexes
ElectionSchema.index({ status: 1 });
ElectionSchema.index({ startDate: 1, endDate: 1 });
ElectionSchema.index({ contractAddress: 1 });

module.exports = mongoose.model('Election', ElectionSchema);