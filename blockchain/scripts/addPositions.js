require('dotenv').config();
/**
 * Script to add all 13 positions to the contract
 * Run after deployment
 */

const hre = require("hardhat");

const POSITIONS = [
  { title: "Chairperson", description: "Leads the student council and represents students" },
  { title: "Vice Chairperson", description: "Assists the chairperson and oversees committees" },
  { title: "Secretary General", description: "Manages records and communications" },
  { title: "Treasurer", description: "Handles finances and budget" },
  { title: "Academic Secretary", description: "Coordinates academic affairs" },
  { title: "Accommodation & Security Secretary", description: "Oversees housing and safety" },
  { title: "Special Interests Secretary", description: "Represents special interest groups" },
  { title: "FASS – Academic Nominee", description: "Faculty of Arts and Social Sciences representative" },
  { title: "FASS – Female Nominee", description: "Women's representative in FASS" },
  { title: "FASS – Male Nominee", description: "Men's representative in FASS" },
  { title: "Evening & Weekend Nominee", description: "Represents evening and weekend students" },
  { title: "Part-Time", description: "Represents part-time students" },
  { title: "Postgraduate", description: "Represents postgraduate students" }
];

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.error("❌ Please set CONTRACT_ADDRESS in .env");
    process.exit(1);
  }

  console.log("📝 Adding 13 positions to contract...");
  console.log("=================================");

  const KIBUVoting = await hre.ethers.getContractFactory("KIBUVoting");
  const contract = await KIBUVoting.attach(contractAddress);

  for (let i = 0; i < POSITIONS.length; i++) {
    const position = POSITIONS[i];
    console.log(`\n📌 Adding position ${i + 1}/${POSITIONS.length}: ${position.title}`);
    try {
      const tx = await contract.addPosition(position.title, position.description);
      await tx.wait();
      console.log(`✅ Added: ${position.title} (Transaction: ${tx.hash})`);
    } catch (error) {
      console.error(`❌ Failed to add ${position.title}:`, error.message);
    }
  }

  const positionsCount = await contract.POSITION_COUNT();
  console.log(`\n📊 Total positions in contract: ${positionsCount}`);
  console.log("\n🎉 All positions added successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });