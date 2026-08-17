require("dotenv").config();
const { ethers } = require("ethers");
const { runPolicyCycle, executeRecovery } = require("./policyEngine");

const VAULT_ADDRESS = "0xe4a540b45e734216c6Ce1b9E5CA61a9AAfdBA31e";
const VAULT_ABI = ["function state() view returns (uint8)"];
const STATE_NAMES = ["ACTIVE", "RESTRICTED", "FROZEN"];

const CYCLES = 5;
const CYCLE_DELAY_MS = 3000;
const RECOVERY_THRESHOLD = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readVaultState() {
  const provider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech/terigon");
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
  const state = await vault.state();
  return Number(state);
}

async function runLoop() {
  console.log(`Starting Arcaegis monitoring loop: ${CYCLES} cycles, ${CYCLE_DELAY_MS}ms apart`);
  console.log(`Auto-recovery armed: ${RECOVERY_THRESHOLD} consecutive SAFE cycles restores ACTIVE`);
  console.log("");

  let consecutiveSafe = 0;

  for (let i = 1; i <= CYCLES; i++) {
    console.log(`--- Cycle ${i}/${CYCLES} ---`);

    const beforeState = await readVaultState();
    console.log(`Vault state before cycle: ${STATE_NAMES[beforeState]} (${beforeState})`);

    const decision = await runPolicyCycle();

    if (decision.confirmedSeverity === "SAFE") {
      consecutiveSafe++;
    } else {
      consecutiveSafe = 0;
    }
    console.log(`Consecutive SAFE cycles: ${consecutiveSafe}/${RECOVERY_THRESHOLD}`);

    let afterState = await readVaultState();
    console.log(`Vault state after cycle: ${STATE_NAMES[afterState]} (${afterState})`);

    if (afterState !== beforeState) {
      console.log(`State changed: ${STATE_NAMES[beforeState]} -> ${STATE_NAMES[afterState]}`);
    }

    if (consecutiveSafe >= RECOVERY_THRESHOLD && afterState !== 0) {
      console.log(`Recovery threshold reached — restoring ACTIVE`);
      await executeRecovery();
      consecutiveSafe = 0;
      afterState = await readVaultState();
      console.log(`Vault state after recovery: ${STATE_NAMES[afterState]} (${afterState})`);
    }

    console.log("");

    if (i < CYCLES) {
      await sleep(CYCLE_DELAY_MS);
    }
  }

  console.log("Loop complete: all cycles finished, exiting.");
}

runLoop().catch(err => {
  console.error("Loop failed:", err);
  process.exit(1);
});