export const X_LAYER_TESTNET = {
  chainId: 1952,
  chainIdHex: "0x7a0",
  name: "X Layer Testnet",
  rpcUrl: "https://testrpc.xlayer.tech/terigon",
  explorer: "https://www.okx.com/web3/explorer/xlayer-test",
  currency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
} as const;

// Filled in once each contract is deployed. Leave blank, do not stub with
// a placeholder address, an empty string fails loudly instead of quietly
// pointing at the zero address.
export const CONTRACTS = {
  mockGold: process.env.NEXT_PUBLIC_MOCK_GOLD_ADDRESS ?? "",
  mockPriceOracle: process.env.NEXT_PUBLIC_MOCK_ORACLE_ADDRESS ?? "",
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "",
} as const;

export function contractsConfigured() {
  return Boolean(
    CONTRACTS.mockGold && CONTRACTS.mockPriceOracle && CONTRACTS.vault
  );
}
