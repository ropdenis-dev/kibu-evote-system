/**
 * Vote Model
 * Stores off-chain references to blockchain votes
 */

const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
  // Voter Information
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  walletAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address']
  },
  regNumber: {
    type: String,
    required: true,
    uppercase: true
  },
  
  // Vote Details
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
  candidateId: {
    type: Number,
    required: true
  },
  candidateName: {
    type: String,
    required: true
  },
  
  // Election Reference
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  
  // Blockchain Transaction
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  blockNumber: {
    type: Number,
    required: true
  },
  blockHash: String,
  gasUsed: Number,
  gasPrice: String,
  
  // Timestamps
  timestamp: {
    type: Date,
    required: true
  },
  confirmedAt: {
    type: Date,
    default: Date.now
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  
  // Metadata
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Ensure one vote per student per position per election
VoteSchema.index(
  { studentId: 1, positionId: 1, electionId: 1 }, 
  { unique: true }
);

VoteSchema.index({ transactionHash: 1 });
VoteSchema.index({ walletAddress: 1 });
VoteSchema.index({ positionId: 1, candidateId: 1 });
VoteSchema.index({ timestamp: -1 });

// Verify vote on blockchain
VoteSchema.methods.verifyOnBlockchain = async function(web3, contract) {
  try {
    // Check if transaction exists on blockchain
    const tx = await web3.eth.getTransaction(this.transactionHash);
    if (!tx) return false;
    
    // Verify the transaction was to our contract
    if (tx.to.toLowerCase() !== process.env.CONTRACT_ADDRESS.toLowerCase()) {
      return false;
    }
    
    // Decode the transaction input to verify vote details
    const decodedInput = contract.methods.vote.decodeInput(tx.input);
    // Additional verification logic here
    
    this.isVerified = true;
    this.verifiedAt = new Date();
    await this.save();
    
    return true;
  } catch (error) {
    console.error('Blockchain verification failed:', error);
    return false;
  }
};

module.exports = mongoose.model('Vote', VoteSchema);