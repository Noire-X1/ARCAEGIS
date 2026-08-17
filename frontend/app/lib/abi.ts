export const MOCK_GOLD_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(uint256 amount)",
];

export const MOCK_ORACLE_ABI = [
  "function price() view returns (uint256)",
  "function setPrice(uint256 newPrice)",
];

export const VAULT_ABI = [
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function restrict()",
  "function freeze()",
  "function recover()",
  "function state() view returns (uint8)",
  "function balances(address depositor) view returns (uint256)",
  "event Deposited(address indexed user, uint256 amount)",
  "event Withdrawn(address indexed user, uint256 amount)",
  "event Restricted()",
  "event Frozen()",
  "event Recovered()",
];
