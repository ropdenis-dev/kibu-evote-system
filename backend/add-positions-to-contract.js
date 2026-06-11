// add-positions-to-contract.js
const { Web3 } = require('web3');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Load contract ABI
let contractABI;
try {
  contractABI = require('./config/KIBUVotingABI.json');
  console.log(' Contract ABI loaded');
} catch (error) {
  console.error(' Failed to load ABI:', error.message);
  process.exit(1);
}

// Initialize Web3
const web3 = new Web3(process.env.SEPOLIA_RPC_URL);
const contractAddress = process.env.CONTRACT_ADDRESS;

if (!contractAddress) {
  console.error(' CONTRACT_ADDRESS not set in .env');
  process.exit(1);
}

const contract = new web3.eth.Contract(
  Array.isArray(contractABI) ? contractABI : contractABI.abi,
  contractAddress
);

const adminPrivateKey = process.env.PRIVATE_KEY;
if (!adminPrivateKey) {
  console.error(' PRIVATE_KEY not set in .env');
  process.exit(1);
}

const adminAccount = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);

const positions = [
  { title: "Chairperson", description: "Leads the student council" },
  { title: "Vice Chairperson", description: "Assists the chairperson" },
  { title: "Secretary General", description: "Manages records" },
  { title: "Treasurer", description: "Handles finances" },
  { title: "Academic Secretary", description: "Academic affairs" },
  { title: "Accommodation & Security Secretary", description: "Housing and safety" },
  { title: "Special Interests Secretary", description: "Special interest groups" },
  { title: "FASS Academic Nominee", description: "FASS representative" },
  { title: "FASS Female Nominee", description: "Women representative" },
  { title: "FASS Male Nominee", description: "Men representative" },
  { title: "Evening & Weekend Nominee", description: "Evening students" },
  { title: "Part-Time", description: "Part-time students" },
  { title: "Postgraduate", description: "Postgraduate students" }
];

async function addPositions() {
  console.log('\n Adding positions to smart contract...');
  console.log('========================================');
  console.log(` Admin account: ${adminAccount.address}`);
  console.log(` Contract address: ${contractAddress}`);
  console.log('========================================\n');
  
  web3.eth.accounts.wallet.add(adminAccount);
  
  for (let i = 0; i < positions.length; i++) {
    try {
      console.log(` Adding position ${i+1}/${positions.length}: ${positions[i].title}...`);
      
      // Estimate gas first
      const gasEstimate = await contract.methods.addPosition(
        positions[i].title, 
        positions[i].description
      ).estimateGas({ from: adminAccount.address });
      
      console.log(`   Gas estimate: ${gasEstimate}`);
      
      const tx = await contract.methods.addPosition(
        positions[i].title, 
        positions[i].description
      ).send({
        from: adminAccount.address,
        gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
      });
      
      console.log(` Added: ${positions[i].title}`);
      console.log(`   Tx: ${tx.transactionHash}`);
      console.log(`   Block: ${tx.blockNumber}\n`);
      
    } catch (error) {
      console.error(` Failed to add ${positions[i].title}:`, error.message);
      if (error.message.includes('already added')) {
        console.log('    Position might already exist, skipping...\n');
      } else {
        console.log('----------------------------------------\n');
      }
    }
  }
  
  console.log('========================================');
  console.log(' Finished adding positions!');
  
  // Verify positions were added
  try {
    const count = await contract.methods.POSITION_COUNT().call();
    console.log(` Total positions in contract: ${count}`);
  } catch (error) {
    console.log(' Could not verify position count');
  }
}

// Run the function
addPositions().catch(error => {
  console.error(' Script failed:', error);
  process.exit(1);
});