/**
 * Admin Model
 * Represents election administrators
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  
  role: {
    type: String,
    enum: ['super_admin', 'election_admin', 'viewer'],
    default: 'election_admin'
  },
  
  permissions: {
    canCreateElections: { type: Boolean, default: true },
    canAddCandidates: { type: Boolean, default: true },
    canStartVoting: { type: Boolean, default: true },
    canEndVoting: { type: Boolean, default: true },
    canPublishResults: { type: Boolean, default: true },
    canManageAdmins: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: true }
  },
  
  department: String,
  
  // Blockchain
  walletAddress: {
    type: String,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address']
  },
  
  // Security
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  
  lastLogin: Date,
  lastLoginIp: String,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
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

// Encrypt password before saving
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
AdminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if has permission
AdminSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] || this.role === 'super_admin';
};

AdminSchema.index({ email: 1 });
AdminSchema.index({ role: 1 });

module.exports = mongoose.model('Admin', AdminSchema);