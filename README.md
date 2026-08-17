[README.md](https://github.com/user-attachments/files/31126577/README.md)
# ARCAEGIS

**An AI agent that watches your collateral so you don't have to.**

ARCAEGIS is an autonomous risk-detection system that protects an onchain vault holding gold-backed collateral. Built for OKX's **X Layer AI Season Hackathon** (AI-RWA track).

## The core idea

Most "AI agent" projects let a language model act directly. ARCAEGIS deliberately does not.

An AI reads live risk signals and returns a recommendation. A separate, fully deterministic **policy engine** — plain code, zero AI — decides whether anything actually happens onchain. The AI never touches the contract directly. If the underlying data can't be trusted (a stale oracle, for example), the system refuses to act at all, even if both the raw signals and the AI agree something is CRITICAL.

That's the whole architectural thesis: **you don't trust the AI, you trust the bounded system the AI operates inside.**

## The agent loop

```
OBSERVE → ANALYZE → REASON → DECIDE → ACT → VERIFY → MONITOR → RECOVER
```

- **Observe / Analyze** — four signals (price delta, volatility, collateral ratio, oracle freshness) scored into SAFE / WARNING / HIGH / CRITICAL
- **Reason** — a single LLM call (Gemini) returns a structured, schema-validated assessment — never trusted as free text
- **Decide** — the policy engine takes the *less severe* of the raw score and the AI's assessment as "confirmed severity," so a one-tier LLM wobble can't silently block a real demo, while still requiring genuine agreement before anything fires. A stale oracle blocks any action outright, checked before the AI is even queried.
- **Act** — the vault moves between three bounded states: `ACTIVE → RESTRICTED → FROZEN`
- **Verify** — every action reads the vault's onchain state back to confirm it actually matches what was intended
- **Recover** — enough consecutive SAFE cycles and the vault restores itself automatically

## Proof, not a promise

The restrict/freeze/recover mechanism has been tested end to end against real transactions on X Layer testnet:

| Action | Tx Hash |
|---|---|
| FREEZE | `0x1886988ff1a6019b42b26eee4ee0ce83cd0eb55941f6a1779de61ef267efd9aa` |
| RECOVER | `0xac47a448d9b8a81d581f8c08b9c3ec1dbb7a479686335738476969a6f5e4c4cc` |

The vault was later upgraded to accept ERC20 gold-token deposits instead of native OKB (see below) — the `restrict()` / `freeze()` / `recover()` logic itself is unchanged from the version proven above.

### Current deployed contracts (X Layer Testnet)

| Contract | Address |
|---|---|
| Vault | `0xe4a540b45e734216c6Ce1b9E5CA61a9AAfdBA31e` |
| MockGold (mGOLD) | `0x39CffA857732640ECb9FC51B9c7Ce15D15da02Ec` |
| MockOracle | `0x4dec891B3CD66ff3e9B15307cfe9cC3b2233244c` |

## Repo structure

```
contracts/       Hardhat project — Vault.sol, MockGold.sol, MockOracle.sol
arcaegis-agent/   The agent loop — riskEngine.js, reasoningEngine.js, policyEngine.js, loop.js
frontend/         Next.js dashboard — live vault status, agent activity log, deposit/withdraw
```

## Tech stack

- **Solidity** — Vault, mock ERC20 gold token, mock price oracle
- **Hardhat 3 + Ignition** — compilation and deployment
- **Node.js** — the risk engine, AI reasoning call, and policy engine run as standalone scripts, independent of the frontend
- **Gemini API** — the AI reasoning layer, structured JSON output only
- **Next.js + ethers.js** — the live dashboard, reading vault state directly from chain
- **X Layer** — OKX's zkEVM Layer 2

## Running it locally

```bash
# Contracts
cd contracts
npm install
npx hardhat compile

# Agent loop
cd ../arcaegis-agent
npm install
node applyScenario.js calm    # or crash, or staleOracle
node loop.js

# Frontend
cd ../frontend
npm install
npm run dev
```

Each folder needs its own `.env` — see `.env.example` / `.env.local.example` in each for the required variables.

## What's deliberately out of scope

Configurable protection profiles, a live production oracle beyond the mock, multi-asset support, and more than one adversarial test case were all cut on purpose to keep the core agent loop genuinely solid within the hackathon timeframe, rather than spreading thin across many half-built features.

## Hackathon

Built for OKX's **AI Season Hackathon** on X Layer.
