
const express = require("express");
const { ethers } = require("ethers");
const bodyParser = require("body-parser");
const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(bodyParser.json());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = "1365112136795291719"; // Your Discord server ID

const NFT_CONTRACTS = [
  {
    address: "0x6741e2C84Be72C2e45562B2c93ffc956c7c5E8eA",
    type: "ERC1155",
    thresholds: [
      { min: 10, role: "1388952301934350467" },
      { min: 3, role: "1388952301934350467" },
      { min: 1, role: "1388952217066930247" },
    ],
  },
  {
    address: "0x5D25F33151a5b222E2Cf4Cd1626A80285119f297",
    tokenId: 0,
    type: "ERC1155",
    thresholds: [
      { min: 1, role: "1388952217066930247" }
    ],
  },
];

const provider = new ethers.JsonRpcProvider("https://node.monad.xyz");

client.once("ready", () => {
  console.log(`✅ Deadbot logged in as ${client.user.tag}`);
});

async function getNFTBalance(contractAddress, userAddress, tokenId = 0) {
  const abi = [
    "function balanceOf(address account, uint256 id) view returns (uint256)"
  ];
  const contract = new ethers.Contract(contractAddress, abi, provider);
  try {
    const balance = await contract.balanceOf(userAddress, tokenId);
    return balance.toNumber();
  } catch (error) {
    console.error("Error fetching balance:", error);
    return 0;
  }
}

async function assignRole(discordId, roleId) {
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(discordId);
  if (!member.roles.cache.has(roleId)) {
    await member.roles.add(roleId);
    console.log(`✅ Gave role ${roleId} to ${discordId}`);
  }
}

app.post("/verify", async (req, res) => {
  const { discordId, address } = req.body;
  console.log("Incoming verification request:", req.body);

  let totalBalance = 0;
  let rolesToAssign = new Set();

  for (const config of NFT_CONTRACTS) {
    const tokenId = config.tokenId || 0;
    const balance = await getNFTBalance(config.address, address, tokenId);
    totalBalance += balance;

    for (const threshold of config.thresholds) {
      if (balance >= threshold.min) {
        rolesToAssign.add(threshold.role);
      }
    }
  }

  try {
    for (const roleId of rolesToAssign) {
      await assignRole(discordId, roleId);
    }

    res.json({ success: true, totalBalance });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

app.listen(port, () => {
  console.log(`✅ Deadbot API running on port ${port}`);
});

client.login(DISCORD_BOT_TOKEN);
