"use client";

import { VaultEvent } from "../lib/useVault";

const KIND_COLOR: Record<VaultEvent["kind"], string> = {
  Deposited: "var(--accent)",
  Withdrawn: "var(--text-2)",
  Restricted: "#FBBF24",
  Frozen: "var(--danger)",
  Recovered: "var(--safe)",
};

function timeLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export default function EventLog({ events, configured }: { events: VaultEvent[]; configured: boolean }) {
  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ background: configured ? "var(--accent)" : "var(--text-3)" }}
          />
          <span className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
            Onchain Event Log
          </span>
        </div>
        <span className="font-mono text-xs" style={{ color: "var(--text-3)" }}>
          {configured ? "live" : "awaiting deployment"}
        </span>
      </div>

      <div className="h-80 overflow-y-auto px-5 py-4 font-mono text-sm">
        {events.length === 0 && (
          <p style={{ color: "var(--text-3)" }}>
            {configured
              ? "Listening for onchain activity. Nothing has happened yet."
              : "Vault contract address is not configured. This log will populate the moment it is deployed and the address is set."}
          </p>
        )}
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="rise-in flex gap-3 items-baseline">
              <span style={{ color: "var(--text-3)" }}>{timeLabel(e.timestamp)}</span>
              <span style={{ color: KIND_COLOR[e.kind] }}>{e.kind}</span>
              <span style={{ color: "var(--text-2)" }}>{e.detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
