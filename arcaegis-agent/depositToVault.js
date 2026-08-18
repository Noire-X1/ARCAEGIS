require("dotenv").config();
const { ethers } = require("ethers");

const VAULT_ADDRESS = "0xe4a540b45e734216c6Ce1b9E5CA61a9AAfdBA31e";
const MOCK_GOLD_ADDRESS = "0x39CffA857732640ECb9FC51B9c7Ce15D15da02Ec";

const MOCK_GOLD_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const VAULT_ABI = [
  "function deposit(uint256 amount)",
  "function balances(address depositor) view returns (uint256)",
  "function state() view returns (uint8)",
];

const DEPOSIT_AMOUNT = ethers.parseUnits("100", 18); // 100 mGOLD
const STATE_NAMES = ["ACTIVE", "RESTRICTED", "FROZEN"];

async function main() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech/terigon");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const gold = new ethers.Contract(MOCK_GOLD_ADDRESS, MOCK_GOLD_ABI, wallet);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);

  console.log(`Wallet: ${wallet.address}`);

  const vaultState = await vault.state();
  console.log(`Vault state: ${STATE_NAMES[Number(vaultState)]}`);

  if (Number(vaultState) === 2) {
    console.log("Vault is FROZEN — deposit will be rejected by contract. Run calm scenario first.");
    process.exit(1);
  }

  const goldBalance = await gold.balanceOf(wallet.address);
  console.log(`mGOLD balance: ${ethers.formatUnits(goldBalance, 18)}`);

  const vaultBalance = await vault.balances(wallet.address);
  console.log(`Currently deposited in vault: ${ethers.formatUnits(vaultBalance, 18)} mGOLD`);

  console.log(`\nApproving ${ethers.formatUnits(DEPOSIT_AMOUNT, 18)} mGOLD for vault...`);
  const approveTx = await gold.approve(VAULT_ADDRESS, DEPOSIT_AMOUNT, { gasLimit: 100000 });
  await approveTx.wait();
  console.log(`Approve confirmed: ${approveTx.hash}`);

  console.log(`Depositing ${ethers.formatUnits(DEPOSIT_AMOUNT, 18)} mGOLD into vault...`);
  const depositTx = await vault.deposit(DEPOSIT_AMOUNT, { gasLimit: 150000 });
  await depositTx.wait();
  console.log(`Deposit confirmed: ${depositTx.hash}`);
  console.log(`Explorer: https://web3.okx.com/explorer/x-layer-testnet/tx/${depositTx.hash}`);

  const newVaultBalance = await vault.balances(wallet.address);
  console.log(`\nNew vault balance: ${ethers.formatUnits(newVaultBalance, 18)} mGOLD`);
  console.log("Done — the dashboard will reflect this within 8 seconds.");
}

main().catch(err => {
  console.error("Deposit failed:", err?.reason || err?.message || err);
  process.exit(1);
});
