/**
 * Student Model
 * Represents a student voter in the system
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const StudentSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  // University Information
  regNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [
      /^[A-Z]+\/\d{4}\/\d{2}$/,
      'Please enter a valid registration number (e.g., BIT/0025/23)'
    ]
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
  course: {
    type: String,
    required: [true, 'Course is required']
  },
  yearOfStudy: {
    type: Number,
    required: [true, 'Year of study is required'],
    min: [1, 'Year must be at least 1'],
    max: [5, 'Year cannot exceed 5']
  },
  
  // Contact Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Blockchain
  walletAddress: {
    type: String,
    lowercase: true,
    match: [
      /^0x[a-fA-F0-9]{40}$/,
      'Please enter a valid Ethereum address'
    ]
  },
  
  // Voting Status
  hasVoted: {
    type: Boolean,
    default: false
  },
  votesCast: {
    type: Number,
    default: 0,
    min: 0,
    max: 13
  },
  completedPositions: [{
    type: Number,
    min: 0,
    max: 12
  }],
  
  // Transaction History
  transactions: [{
    txHash: {
      type: String,
      required: true
    },
    positionId: Number,
    candidateId: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    blockNumber: Number
  }],
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
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
  timestamps: true, // Automatically manage createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
StudentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for initials
StudentSchema.virtual('initials').get(function() {
  return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
});

// Encrypt password before saving
StudentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.updatedAt = Date.now();
  next();
});

// Update timestamp on update
StudentSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

// Compare entered password with hashed password
StudentSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
StudentSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
StudentSchema.methods.incrementLoginAttempts = function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // Lock for 30 minutes
  }
  
  return this.updateOne(updates);
};

// Indexes for faster queries
StudentSchema.index({ regNumber: 1 });
StudentSchema.index({ email: 1 });
StudentSchema.index({ walletAddress: 1 });
StudentSchema.index({ faculty: 1 });
StudentSchema.index({ hasVoted: 1 });

module.exports = mongoose.model('Student', StudentSchema);