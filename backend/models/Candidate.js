/**
 * Candidate Model
 * Represents a candidate running for a position
 */

const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  // Academic Information
  regNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    uppercase: true,
    match: [
      /^[A-Z]+\/\d{4}\/\d{2}$/,
      'Please enter a valid registration number'
    ]
  },
  course: {
    type: String,
    required: [true, 'Course is required']
  },
  yearOfStudy: {
    type: Number,
    required: [true, 'Year of study is required'],
    min: 1,
    max: 6
  },
  faculty: {
    type: String,
    required: [true, 'Faculty is required'],
    enum: [
      'School of Computing & Informatics',
      'School of Business & Economics',
      'School of Engineering',
      'School of Health Sciences',
      'School of Education',
      'School of Law'
    ]
  },
  
  // Campaign Information
  manifesto: {
    type: String,
    required: [true, 'Manifesto is required'],
    maxlength: [1000, 'Manifesto cannot exceed 1000 characters']
  },
  achievements: [String],
  promises: [String],
  
  // Media
  photoUrl: {
    type: String,
    default: '/images/default-avatar.jpg'
  },
  videoUrl: String,
  
  // Position Reference
  positionId: {
    type: Number,
    required: true,
    min: 0,
    max: 12
  },
  positionTitle: {
    type: String,
    required: true
  },
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  
  // Blockchain
  candidateId: {
    type: Number,
    required: true
  },
  contractAddress: String,
  
  // Statistics
  voteCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  
  // Social Links
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for vote percentage
CandidateSchema.virtual('votePercentage').get(function() {
  // This would need total votes for the position
  // Will be calculated in controller
  return 0;
});

// Ensure candidateId is unique per election per position
CandidateSchema.index(
  { electionId: 1, positionId: 1, candidateId: 1 }, 
  { unique: true }
);

CandidateSchema.index({ electionId: 1, positionId: 1 });
CandidateSchema.index({ regNumber: 1 });
CandidateSchema.index({ isActive: 1 });

module.exports = mongoose.model('Candidate', CandidateSchema);