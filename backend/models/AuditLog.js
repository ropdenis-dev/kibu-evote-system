/**
 * Audit Log Model
 * Tracks all important actions for security
 */

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'REGISTER',
      'VOTE_CAST', 'VOTE_VERIFIED',
      'ELECTION_CREATED', 'ELECTION_STARTED', 'ELECTION_ENDED',
      'CANDIDATE_ADDED', 'CANDIDATE_UPDATED', 'CANDIDATE_REMOVED',
      'POSITION_ADDED',
      'ADMIN_LOGIN', 'ADMIN_ACTION',
      'CONTRACT_DEPLOYED', 'CONTRACT_INTERACTION'
    ]
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    enum: ['Student', 'Admin']
  },
  walletAddress: String,
  regNumber: String,
  
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Blockchain related
  transactionHash: String,
  blockNumber: Number,
  
  // Request info
  ipAddress: String,
  userAgent: String,
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  
  errorMessage: String,
  
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for quick searching
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ walletAddress: 1 });
AuditLogSchema.index({ transactionHash: 1 });
AuditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);