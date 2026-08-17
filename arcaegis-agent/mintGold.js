require("dotenv").config();
const { ethers } = require("ethers");

const MOCK_GOLD_ADDRESS = "0x39CffA857732640ECb9FC51B9c7Ce15D15da02Ec";
const MOCK_GOLD_ABI = [
  "function mint(uint256 amount) external",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const MINT_AMOUNT = ethers.parseUnits("1000", 18); // 1000 mGOLD

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech/terigon");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const gold = new ethers.Contract(MOCK_GOLD_ADDRESS, MOCK_GOLD_ABI, wallet);

  console.log(`Minting 1000 mGOLD to ${wallet.address}...`);
  const tx = await gold.mint(MINT_AMOUNT);
  console.log(`Sent mint tx: ${tx.hash}`);
  await tx.wait();
  console.log("Mint confirmed onchain.");

  const balance = await gold.balanceOf(wallet.address);
  console.log(`New mGOLD balance: ${ethers.formatUnits(balance, 18)}`);
}

main().catch(err => {
  console.error("Mint failed:", err);
  process.exit(1);
});
