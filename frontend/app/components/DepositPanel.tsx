"use client";

import { useState } from "react";

export default function DepositPanel({
  connected,
  address,
  goldBalance,
  vaultBalance,
  isFrozen,
  configured,
  onConnect,
  onDeposit,
  onWithdraw,
}: {
  connected: boolean;
  address: string | null;
  goldBalance: string | null;
  vaultBalance: string | null;
  isFrozen: boolean | null;
  configured: boolean;
  onConnect: () => void;
  onDeposit: (amount: string) => void;
  onWithdraw: (amount: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const disabled = !connected || !configured;
  const withdrawDisabled = disabled || isFrozen === true;

  return (
    <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="font-mono text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "#CBD5E1" }}>
        Deposit / Withdraw
      </p>

      {!connected ? (
        <button
          onClick={onConnect}
          className="w-full rounded-md py-3 font-mono text-sm uppercase tracking-[0.1em] transition-transform"
          style={{ background: "var(--accent)", color: "#0f0f11" }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between text-sm font-mono">
            <span style={{ color: "#CBD5E1" }}>Wallet</span>
            <span style={{ color: "var(--text-1)" }}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm font-mono">
            <span style={{ color: "#CBD5E1" }}>mGOLD balance</span>
            <span style={{ color: "var(--text-1)" }}>{goldBalance ?? "—"}</span>
          </div>
          <div className="flex justify-between text-sm font-mono mb-2">
            <span style={{ color: "#CBD5E1" }}>Deposited in vault</span>
            <span style={{ color: "var(--text-1)" }}>{vaultBalance ?? "—"}</span>
          </div>

          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md px-4 py-3 font-mono text-sm outline-none border"
            style={{
              background: "var(--surface-raised)",
              borderColor: "var(--border-bright)",
              color: "var(--text-1)",
            }}
          />

          <div className="flex gap-3">
            <button
              disabled={disabled || !amount}
              onClick={() => onDeposit(amount)}
              className="flex-1 rounded-md py-3 font-mono text-sm uppercase tracking-[0.1em] transition-transform disabled:opacity-40"
              style={{ background: "var(--accent)", color: "#0f0f11" }}
              onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              Assess &amp; Secure
            </button>
            <button
              disabled={withdrawDisabled || !amount}
              onClick={() => onWithdraw(amount)}
              className="flex-1 rounded-md py-3 font-mono text-sm uppercase tracking-[0.1em] border transition-transform disabled:opacity-40"
              style={{ borderColor: "var(--border-bright)", color: "var(--text-1)" }}
              onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = "scale(0.97)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              Withdraw
            </button>
          </div>

          {isFrozen === true && (
            <p className="text-xs font-mono" style={{ color: "var(--danger)" }}>
              Asset is frozen due to critical risk. Withdrawals are disabled until the owner unfreezes the vault.
            </p>
          )}
          {!configured && (
            <p className="text-xs font-mono" style={{ color: "#CBD5E1" }}>
              Vault contract not deployed yet. Actions are disabled until addresses are configured.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
