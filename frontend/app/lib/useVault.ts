"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, ethers, formatUnits } from "ethers";
import { CONTRACTS, X_LAYER_TESTNET, contractsConfigured } from "./chain";
import { MOCK_GOLD_ABI, MOCK_ORACLE_ABI, VAULT_ABI } from "./abi";

export type VaultEvent = {
  id: string;
  kind: "Deposited" | "Withdrawn" | "Restricted" | "Frozen" | "Recovered";
  detail: string;
  timestamp: number;
};

type VaultState = {
  connected: boolean;
  address: string | null;
  goldBalance: string | null;
  vaultBalance: string | null;
  price: string | null;
  isFrozen: boolean | null;
  events: VaultEvent[];
  configured: boolean;
  error: string | null;
  connect: () => Promise<void>;
  deposit: (amount: string) => Promise<void>;
  withdraw: (amount: string) => Promise<void>;
};

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
    okxwallet?: EIP1193Provider;
  }
}

interface EIP1193Provider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
}

export function useVault(): VaultState {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [goldBalance, setGoldBalance] = useState<string | null>(null);
  const [vaultBalance, setVaultBalance] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState<boolean | null>(null);
  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const readProviderRef = useRef<JsonRpcProvider | null>(null);
  const signerProviderRef = useRef<BrowserProvider | null>(null);
  const lastScannedBlockRef = useRef<number | null>(null);

  const configured = contractsConfigured();

  const pushEvent = useCallback((e: Omit<VaultEvent, "id" | "timestamp">) => {
    setEvents((prev) => [
      { ...e, id: `${e.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: Date.now() },
      ...prev,
    ].slice(0, 50));
  }, []);

  // Read-only polling loop against public RPC, works with no wallet connected.
  // Uses queryFilter (eth_getLogs) instead of live .on() listeners, since
  // X Layer's public testnet RPC has eth_newFilter disabled ("rpc method
  // is not whitelisted") — polling for past logs on an interval sidesteps
  // that entirely.
  useEffect(() => {
    if (!configured) return;

    readProviderRef.current = new JsonRpcProvider(X_LAYER_TESTNET.rpcUrl, X_LAYER_TESTNET.chainId);
    const provider = readProviderRef.current;

    const oracle = new Contract(CONTRACTS.mockPriceOracle, MOCK_ORACLE_ABI, provider);
    const vault = new Contract(CONTRACTS.vault, VAULT_ABI, provider);

    let cancelled = false;

    async function pollPriceAndState() {
      try {
        const [p, state] = await Promise.all([oracle.price(), vault.state()]);
        if (cancelled) return;
        setPrice(formatUnits(p, 2));
        setIsFrozen(Number(state) === 2); // 0=ACTIVE, 1=RESTRICTED, 2=FROZEN
        setError(null);
      } catch (err) {
        if (!cancelled) setError("Could not reach X Layer testnet RPC.");
      }
    }

    async function pollEvents() {
      try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = lastScannedBlockRef.current ?? currentBlock;
        if (currentBlock < fromBlock) return;

        const [deposits, withdrawals, restricts, freezes, recovers] = await Promise.all([
          vault.queryFilter(vault.filters.Deposited(), fromBlock, currentBlock),
          vault.queryFilter(vault.filters.Withdrawn(), fromBlock, currentBlock),
          vault.queryFilter(vault.filters.Restricted(), fromBlock, currentBlock),
          vault.queryFilter(vault.filters.Frozen(), fromBlock, currentBlock),
          vault.queryFilter(vault.filters.Recovered(), fromBlock, currentBlock),
        ]);
        if (cancelled) return;

        for (const ev of deposits) {
          const args = (ev as any).args;
          pushEvent({ kind: "Deposited", detail: `${formatUnits(args[1], 18)} mGOLD from ${short(args[0])}` });
        }
        for (const ev of withdrawals) {
          const args = (ev as any).args;
          pushEvent({ kind: "Withdrawn", detail: `${formatUnits(args[1], 18)} mGOLD to ${short(args[0])}` });
        }
        for (const _ of restricts) pushEvent({ kind: "Restricted", detail: "vault restricted by policy engine" });
        for (const _ of freezes) pushEvent({ kind: "Frozen", detail: "vault frozen by policy engine" });
        for (const _ of recovers) pushEvent({ kind: "Recovered", detail: "vault recovered by policy engine" });

        lastScannedBlockRef.current = currentBlock + 1;
      } catch {
        // ignore transient polling errors, next interval will retry
      }
    }

    pollPriceAndState();
    pollEvents();
    const interval = setInterval(() => {
      pollPriceAndState();
      pollEvents();
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [configured, pushEvent]);

  const refreshBalances = useCallback(async (addr: string) => {
    if (!configured || !readProviderRef.current) return;
    const provider = readProviderRef.current;
    const gold = new Contract(CONTRACTS.mockGold, MOCK_GOLD_ABI, provider);
    const vault = new Contract(CONTRACTS.vault, VAULT_ABI, provider);
    try {
      const [bal, vbal] = await Promise.all([gold.balanceOf(addr), vault.balances(addr)]);
      setGoldBalance(formatUnits(bal, 18));
      setVaultBalance(formatUnits(vbal, 18));
    } catch {
      // contracts not deployed yet or address not funded, leave as null
    }
  }, [configured]);

  const connect = useCallback(async () => {
    const injected = typeof window !== "undefined" ? (window.okxwallet ?? window.ethereum) : undefined;
    if (!injected) {
      setError("No wallet extension found. Install OKX Wallet or MetaMask.");
      return;
    }
    try {
      const provider = new BrowserProvider(injected as any);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== X_LAYER_TESTNET.chainId) {
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: X_LAYER_TESTNET.chainIdHex }]);
        } catch {
          await provider.send("wallet_addEthereumChain", [{
            chainId: X_LAYER_TESTNET.chainIdHex,
            chainName: X_LAYER_TESTNET.name,
            rpcUrls: [X_LAYER_TESTNET.rpcUrl],
            nativeCurrency: X_LAYER_TESTNET.currency,
            blockExplorerUrls: [X_LAYER_TESTNET.explorer],
          }]);
        }
      }
      signerProviderRef.current = provider;
      setAddress(accounts[0]);
      setConnected(true);
      setError(null);
      if (configured) await refreshBalances(accounts[0]);
    } catch (err) {
      setError("Wallet connection was rejected or failed.");
    }
  }, [configured, refreshBalances]);

  const deposit = useCallback(async (amount: string) => {
    console.log("deposit called", { amount, connected, address, configured, hasSigner: !!signerProviderRef.current });

    if (!signerProviderRef.current || !address) {
      console.log("deposit blocked: no signer or address");
      setError("Connect your wallet first.");
      return;
    }
    if (!configured) {
      console.log("deposit blocked: not configured");
      setError("Vault contract is not deployed yet.");
      return;
    }
    try {
      const okxProvider = typeof window !== "undefined"
        ? (window.okxwallet ?? window.ethereum)
        : undefined;
      if (!okxProvider) throw new Error("No wallet provider found");

      const decimals = 18;
      const value = parseUnitsSafe(amount, decimals);

      // Check allowance using read provider
      const readProvider = readProviderRef.current;
      if (!readProvider) throw new Error("No read provider");
      const goldRead = new Contract(CONTRACTS.mockGold, MOCK_GOLD_ABI, readProvider);
      const allowance = await goldRead.allowance(address, CONTRACTS.vault);

      // If allowance insufficient, send approve via native OKX provider request
      if (allowance < value) {
        const approveTx = await okxProvider.request({
          method: "eth_sendTransaction",
          params: [{
            from: address,
            to: CONTRACTS.mockGold,
            data: new ethers.Interface([
              "function approve(address spender, uint256 amount) returns (bool)"
            ]).encodeFunctionData("approve", [CONTRACTS.vault, value]),
            gas: "0x186A0",
          }],
        });
        // Wait for approve to confirm
        await readProvider.waitForTransaction(approveTx);
      }

      // Send deposit via native OKX provider request
      const depositTx = await okxProvider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: CONTRACTS.vault,
          data: new ethers.Interface([
            "function deposit(uint256 amount)"
          ]).encodeFunctionData("deposit", [value]),
          gas: "0x249F0",
        }],
      });
      await readProvider.waitForTransaction(depositTx);
      await refreshBalances(address);
      setError(null);
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(`Deposit failed: ${err?.reason || err?.message || "unknown error"}`);
    }
  }, [address, configured, connected, refreshBalances]);

  const withdraw = useCallback(async (amount: string) => {
    if (!signerProviderRef.current || !address) {
      setError("Connect your wallet first.");
      return;
    }
    if (!configured) {
      setError("Vault contract is not deployed yet.");
      return;
    }
    try {
      const okxProvider = typeof window !== "undefined"
        ? (window.okxwallet ?? window.ethereum)
        : undefined;
      if (!okxProvider) throw new Error("No wallet provider found");

      const value = parseUnitsSafe(amount, 18);
      const readProvider = readProviderRef.current;
      if (!readProvider) throw new Error("No read provider");

      const withdrawTx = await okxProvider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: CONTRACTS.vault,
          data: new ethers.Interface([
            "function withdraw(uint256 amount)"
          ]).encodeFunctionData("withdraw", [value]),
          gas: "0x249F0",
        }],
      });
      await readProvider.waitForTransaction(withdrawTx);
      await refreshBalances(address);
      setError(null);
    } catch (err: any) {
      console.error("Withdraw error:", err);
      setError(`Withdrawal failed: ${err?.reason || err?.message || "unknown error"}`);
    }
  }, [address, configured, refreshBalances]);

  return {
    connected,
    address,
    goldBalance,
    vaultBalance,
    price,
    isFrozen,
    events,
    configured,
    error,
    connect,
    deposit,
    withdraw,
  };
}

function short(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function parseUnitsSafe(amount: string, decimals: bigint | number) {
  const d = Number(decimals);
  const [whole, frac = ""] = amount.split(".");
  const paddedFrac = (frac + "0".repeat(d)).slice(0, d);
  const ten = BigInt(10);
  let scale = BigInt(1);
  for (let i = 0; i < d; i++) scale = scale * ten;
  return BigInt(whole || "0") * scale + BigInt(paddedFrac || "0");
}
