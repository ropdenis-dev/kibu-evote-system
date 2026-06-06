require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/NtizLW_rjx0-mdEfRrgE5",
      accounts: ["0x5520c7b5decd3de71d10a3426b39b80a19b311e485ec3f16999b155dffc42660"],
    },
  },
  etherscan: {
    apiKey: "JFZDZQGKBCSBXU6Y9FINBGZJ6IDDJB5RFPS",
  },
};