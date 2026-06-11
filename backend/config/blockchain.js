/**
 * Blockchain Configuration
 * Handles connection to Ethereum network and smart contract
 */

const { Web3 } = require('web3'); 
const contractABI = require('./KIBUVotingABI.json'); // You'll get this from compiling the contract

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.adminAccount = null;
    this.connected = false;
  }

  /**
   * Initialize connection to blockchain
   */
  async initialize() {
    try {
      // Connect to Sepolia via Infura
      this.web3 = new Web3(process.env.SEPOLIA_RPC_URL);
      
      // Check connection
      const networkId = await this.web3.eth.net.getId();
      console.log(` Connected to network ID: ${networkId}`.green);

      // Set up admin account from private key
      if (process.env.PRIVATE_KEY) {
        const account = this.web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
        this.web3.eth.accounts.wallet.add(account);
        this.adminAccount = account.address;
        console.log(` Admin account: ${this.adminAccount}`.green);
      }

      // Initialize contract
      if (process.env.CONTRACT_ADDRESS && contractABI) {
        this.contract = new this.web3.eth.Contract(
          contractABI,
          process.env.CONTRACT_ADDRESS
        );
        console.log(`Contract initialized at: ${process.env.CONTRACT_ADDRESS}`.green);
        
        // Verify contract is accessible
        const version = await this.contract.methods.getVersion().call();
        console.log(` Contract version: ${version}`.cyan);
        
        this.connected = true;
      }

      return true;
    } catch (error) {
      console.error(` Blockchain initialization failed: ${error.message}`.red);
      this.connected = false;
      return false;
    }
  }

  /**
   * Get contract instance
   */
  getContract() {
    if (!this.connected) {
      throw new Error('Blockchain not connected');
    }
    return this.contract;
  }

  /**
   * Get web3 instance
   */
  getWeb3() {
    return this.web3;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get admin account address
   */
  getAdminAccount() {
    return this.adminAccount;
  }

  /**
   * Send transaction from admin
   */
  async sendTransaction(txData) {
    try {
      const gas = await txData.estimateGas({ from: this.adminAccount });
      const gasPrice = await this.web3.eth.getGasPrice();
      
      const tx = await txData.send({
        from: this.adminAccount,
        gas: Math.floor(gas * 1.2), // Add 20% buffer
        gasPrice: gasPrice
      });
      
      return tx;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Listen to contract events
   */
  subscribeToEvents(callbacks) {
    if (!this.contract) return;

    // VoteCast events
    this.contract.events.VoteCast({
      fromBlock: 'latest'
    })
    .on('data', (event) => {
      console.log(' VoteCast event:', event.returnValues);
      if (callbacks.onVoteCast) {
        callbacks.onVoteCast(event.returnValues);
      }
    })
    .on('error', console.error);

    // CandidateAdded events
    this.contract.events.CandidateAdded({
      fromBlock: 'latest'
    })
    .on('data', (event) => {
      console.log(' CandidateAdded event:', event.returnValues);
      if (callbacks.onCandidateAdded) {
        callbacks.onCandidateAdded(event.returnValues);
      }
    })
    .on('error', console.error);

    // PositionAdded events
    this.contract.events.PositionAdded({
      fromBlock: 'latest'
    })
    .on('data', (event) => {
      console.log(' PositionAdded event:', event.returnValues);
      if (callbacks.onPositionAdded) {
        callbacks.onPositionAdded(event.returnValues);
      }
    })
    .on('error', console.error);

    // VotingStarted/Ended events
    this.contract.events.VotingStarted({
      fromBlock: 'latest'
    })
    .on('data', (event) => {
      console.log(' VotingStarted event');
      if (callbacks.onVotingStarted) {
        callbacks.onVotingStarted(event.returnValues);
      }
    });

    this.contract.events.VotingEnded({
      fromBlock: 'latest'
    })
    .on('data', (event) => {
      console.log(' VotingEnded event');
      if (callbacks.onVotingEnded) {
        callbacks.onVotingEnded(event.returnValues);
      }
    });
  }
}

module.exports = new BlockchainService();