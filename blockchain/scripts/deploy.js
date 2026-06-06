/**
 * Deploy Script for KIBU Voting Contract
 * Run with: npx hardhat run scripts/deploy.js --network sepolia
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying KIBU Voting Contract...");
  console.log("=================================");

  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Get contract factory
  const KIBUVoting = await hre.ethers.getContractFactory("KIBUVoting");

  // Deploy contract
  const contract = await KIBUVoting.deploy();

  // ✅ FIX: Ethers v6 uses this
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log(`✅ Contract deployed to: ${address}`);

  // ❌ deployTransaction removed in v6 → use deploymentTransaction()
  const tx = contract.deploymentTransaction();
  console.log(`📦 Transaction hash: ${tx.hash}`);

  console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/address/${address}`);

  console.log("\n⏳ Waiting for block confirmations...");
  await tx.wait(5);

  console.log("📝 Verifying contract on Etherscan...");

  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
    console.log("✅ Contract verified on Etherscan!");
  } catch (error) {
    console.log("⚠️ Verification failed:", error.message);
    console.log(`https://sepolia.etherscan.io/verifyContract?a=${address}`);
  }

  console.log("\n📋 Add this to your .env file:");
  console.log(`CONTRACT_ADDRESS=${address}`);

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });