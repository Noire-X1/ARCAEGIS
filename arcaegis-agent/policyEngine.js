const { ethers } = require("ethers");
require("dotenv").config();
const { assessRisk } = require("./riskEngine");
const { getAIReasoning } = require("./reasoningEngine");

const VAULT_ADDRESS = "0xe4a540b45e734216c6Ce1b9E5CA61a9AAfdBA31e";
const VAULT_ABI = [
  "function restrict() external",
  "function freeze() external",
  "function recover() external",
  "function state() view returns (uint8)"
];

const TIER_ORDER = ["SAFE", "WARNING", "HIGH", "CRITICAL"];

function lowerSeverity(a, b) {
  return TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b;
}

async function decidePolicy() {
  const risk = assessRisk();

  if (!risk.dataTrusted) {
    return {
      action: "MONITOR",
      reason: "Data untrusted (stale oracle) — action blocked regardless of severity",
      confirmedSeverity: null,
      risk,
      ai: null
    };
  }

  const ai = await getAIReasoning();
  const confirmedSeverity = lowerSeverity(risk.overall, ai.assessment);

  let action = "MONITOR";
  if (confirmedSeverity === "HIGH") action = "RESTRICT";
  if (confirmedSeverity === "CRITICAL") action = "FREEZE";

  return { action, confirmedSeverity, risk, ai };
}

async function executeAction(decision) {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech/terigon");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);

  if (decision.action === "MONITOR") {
    console.log("No action taken:", decision.reason || `confirmed severity ${decision.confirmedSeverity}`);
    return null;
  }

  let tx;
  if (decision.action === "RESTRICT") tx = await vault.restrict();
  if (decision.action === "FREEZE") tx = await vault.freeze();

  console.log(`Sent ${decision.action} tx: ${tx.hash}`);
  await tx.wait();
  console.log(`${decision.action} confirmed onchain.`);

  const newState = await vault.state();
  console.log("Vault state after action (0=ACTIVE, 1=RESTRICTED, 2=FROZEN):", newState);

  return tx.hash;
}

async function executeRecovery() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech/terigon");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);

  const tx = await vault.recover();
  console.log(`Sent RECOVER tx: ${tx.hash}`);
  await tx.wait();
  console.log("RECOVER confirmed onchain.");

  const newState = await vault.state();
  console.log("Vault state after recovery (0=ACTIVE, 1=RESTRICTED, 2=FROZEN):", newState);

  return tx.hash;
}

async function runPolicyCycle() {
  const decision = await decidePolicy();
  console.log("Policy decision:", JSON.stringify({
    action: decision.action,
    confirmedSeverity: decision.confirmedSeverity,
    rawOverall: decision.risk.overall,
    aiAssessment: decision.ai ? decision.ai.assessment : "not queried (data untrusted)",
    dataTrusted: decision.risk.dataTrusted
  }, null, 2));

  const txHash = await executeAction(decision);

  return { ...decision, txHash };
}
 
module.exports = { decidePolicy, executeAction, executeRecovery, runPolicyCycle };

if (require.main === module) {
  runPolicyCycle().catch(err => console.error("Policy cycle failed:", err));
}