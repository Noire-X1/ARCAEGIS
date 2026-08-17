"use client";

export default function RiskStatus({
  price,
  isFrozen,
  configured,
}: {
  price: string | null;
  isFrozen: boolean | null;
  configured: boolean;
}) {
  const status = !configured
    ? "OFFLINE"
    : isFrozen === null
    ? "READING"
    : isFrozen
    ? "FROZEN"
    : "SAFE";

  const statusColor =
    status === "FROZEN" ? "var(--danger)" : status === "SAFE" ? "var(--safe)" : "var(--text-3)";

  return (
    <div className="rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <p className="font-mono text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "var(--text-3)" }}>
        Vault Status
      </p>

      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] mb-2" style={{ color: "var(--text-3)" }}>
            Collateral Price
          </p>
          <p className="font-mono text-3xl" style={{ color: "var(--text-1)" }}>
            {price ? `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs uppercase tracking-[0.15em] mb-2" style={{ color: "var(--text-3)" }}>
            Verdict
          </p>
          <p className="font-mono text-xl font-semibold" style={{ color: statusColor }}>
            {status}
          </p>
        </div>
      </div>

      <div
        className="h-px w-full mb-6"
        style={{ background: "var(--border)" }}
      />

      <p className="text-sm" style={{ color: "var(--text-2)" }}>
        {status === "FROZEN" &&
          "Withdrawals are disabled. The AI oracle flagged a critical risk score against the collateral price feed. The vault owner can override this manually."}
        {status === "SAFE" && "Collateral price is within normal bounds. Deposits and withdrawals are open."}
        {status === "READING" && "Connected to the contract, waiting on the first price and freeze state read."}
        {status === "OFFLINE" &&
          "Contract addresses are not configured yet. Set NEXT_PUBLIC_VAULT_ADDRESS and the oracle and token addresses once deployed."}
      </p>
    </div>
  );
}
