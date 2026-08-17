import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ArcaegisModule", (m) => {
  const gold = m.contract("MockGold");
  const oracle = m.contract("MockOracle", [200000n]); // 200000 at 2 decimals = $2,000.00
  const vault = m.contract("Vault", [gold]);
  return { gold, oracle, vault };
});