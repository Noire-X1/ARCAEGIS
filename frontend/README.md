# ARCAEGIS Frontend

AI risk oracle and safeguard vault UI for X Layer testnet (chain ID 1952).

## Getting started

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

## Wiring to real contracts

This UI has no mock data. It reads live from X Layer testnet the moment
contract addresses are set. Until then it shows an honest "not deployed
yet" state rather than fake numbers.

Fill in `.env.local`:

```
NEXT_PUBLIC_MOCK_GOLD_ADDRESS=0x...
NEXT_PUBLIC_MOCK_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
```

Restart the dev server after setting these. The price feed, frozen state,
and event log all start working immediately, no code changes needed.

## Structure

- `app/lib/chain.ts` — network config and contract addresses
- `app/lib/abi.ts` — minimal ABIs for MockGold, MockPriceOracle, Vault
- `app/lib/useVault.ts` — the one hook, read-only polling + wallet writes
- `app/components/` — Header, RiskStatus, DepositPanel, EventLog

## Design system

Dark theme, cyan accent, no purple, no emoji. Tokens live at the top of
`app/globals.css`. Space Grotesk for UI text, JetBrains Mono for
everything data-facing (numbers, addresses, log entries, status labels).
