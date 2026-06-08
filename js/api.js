/*
 * KIBU eVote API Integration
 * Handles all backend API calls
 */

const API = {
  baseURL: 'https://kibu-evote-backend.onrender.com/api/v1',
  token: localStorage.getItem('token') || sessionStorage.getItem('token'),

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token ? `Bearer ${this.token}` : ''
    };
  },

  async handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        this.token = null;
        const isPublicPage = window.location.pathname.includes('login.html') || 
                             window.location.pathname.includes('signup.html') ||
                             window.location.pathname.includes('index.html') ||
                             window.location.pathname === '/' ||
                             window.location.pathname === '';
        if (!isPublicPage) {
          window.location.href = '/login.html';
          throw new Error('Session expired. Please login again.');
        }
      }
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },

  async register(userData) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await this.handleResponse(response);
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
    }
    return data;
  },

  async login(regNumber, password, rememberMe) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regNumber, password, rememberMe })
    });
    const data = await this.handleResponse(response);
    if (data.token) {
      this.token = data.token;
      if (rememberMe) localStorage.setItem('token', data.token);
      else sessionStorage.setItem('token', data.token);
    }
    return data;
  },

  async logout() {
    const response = await fetch(`${this.baseURL}/auth/logout`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    this.token = null;
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    return this.handleResponse(response);
  },

  async getCurrentUser() {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async getCurrentElection() {
    const response = await fetch(`${this.baseURL}/elections/current`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async getElectionResults() {
    const response = await fetch(`${this.baseURL}/elections/results`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async getAllCandidates() {
    const response = await fetch(`${this.baseURL}/candidates`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async getCandidatesByPosition(positionId) {
    const response = await fetch(`${this.baseURL}/candidates/position/${positionId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async submitVotes(votes, transactionHash, blockNumber) {
    const response = await fetch(`${this.baseURL}/votes/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ votes, transactionHash, blockNumber })
    });
    return this.handleResponse(response);
  },

  async getMyVotes() {
    const response = await fetch(`${this.baseURL}/votes/my-votes`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async verifyVote(transactionHash) {
    const response = await fetch(`${this.baseURL}/votes/verify/${transactionHash}`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async getVotingStats() {
    const response = await fetch(`${this.baseURL}/votes/stats`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  },

  async connectWallet() {
    if (typeof window.ethereum === 'undefined') throw new Error('MetaMask not installed');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: { name: 'SepoliaETH', symbol: 'SepoliaETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        }
      }
      return { success: true, account };
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  },

  async sendVoteTransaction(contractAddress, abi, positionIds, candidateIds) {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    
    // DEBUG: Check what we received
    console.log('🔍 DEBUG: contractAddress =', contractAddress);
    console.log('🔍 DEBUG: abi type =', typeof abi);
    console.log('🔍 DEBUG: abi is array?', Array.isArray(abi));
    console.log('🔍 DEBUG: abi length =', abi ? abi.length : 'undefined');
    console.log('🔍 DEBUG: window.CONTRACT_ABI =', window.CONTRACT_ABI ? window.CONTRACT_ABI.length : 'not set');
    
    // Use window.CONTRACT_ABI if the passed abi is invalid
    let finalABI = abi;
    if (!finalABI || !Array.isArray(finalABI) || finalABI.length === 0) {
        if (window.CONTRACT_ABI && Array.isArray(window.CONTRACT_ABI)) {
            console.log('✅ Using window.CONTRACT_ABI as fallback');
            finalABI = window.CONTRACT_ABI;
        }
    }
    
    if (!finalABI || finalABI.length === 0) {
        throw new Error('Contract ABI not available. Please refresh the page.');
    }
    
    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(finalABI, contractAddress);
    const accounts = await web3.eth.getAccounts();
    
    // Check if vote method exists
    console.log('📝 Contract methods available:', Object.keys(contract.methods).slice(0, 10));
    console.log('📝 vote method exists?', typeof contract.methods.vote);
    
    try {
        const tx = await contract.methods.vote(positionIds, candidateIds).send({
            from: accounts[0],
            gas: 3000000
        });
        return { transactionHash: tx.transactionHash, blockNumber: tx.blockNumber };
    } catch (error) {
        console.error('❌ Vote transaction error:', error);
        throw error;
    }
  }
};

// Auto-load – skip validation on public pages
document.addEventListener('DOMContentLoaded', async () => {
  // List of public pages that don't require authentication
  const isPublicPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('signup.html') ||
                       window.location.pathname.includes('index.html') ||
                       window.location.pathname === '/' ||
                       window.location.pathname === '';
  
  if (isPublicPage) return;
  
  if (!API.token) {
    window.location.href = '/login.html';
    return;
  }
  
  try {
    const userData = await API.getCurrentUser();
    window.currentUser = userData.data;
  } catch (error) {
    console.error('Failed to get user:', error);
    API.token = null;
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    window.location.href = '/login.html';
  }
});