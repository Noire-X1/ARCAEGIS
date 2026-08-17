"use client";

import { useCallback, useEffect, useState } from "react";

type Cycle = {
  id: string;
  timestamp: number;
  action: string;
  confirmedSeverity: string | null;
  rawOverall: string;
  aiAssessment: string;
  reasoning: string | null;
  txHash: string | null;
};

const SEVERITY_COLOR: Record<string, string> = {
  SAFE: "var(--safe)",
  WARNING: "#FBBF24",
  HIGH: "#FB923C",
  CRITICAL: "var(--danger)",
};

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
}

export default function AgentActivity() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch("/api/cycles");
      const data = await res.json();
      if (data.ok) setCycles(data.cycles);
    } catch {
      // ignore, keep whatever is currently shown
    }
  }, []);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  async function runCycle() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/run-cycle", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Cycle failed");
      await fetchCycles();
    } catch (err: any) {
      setError(err?.message ?? "Cycle failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border mt-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <span className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: "#CBD5E1" }}>
          Agent Activity
        </span>
        <button
          onClick={runCycle}
          disabled={running}
          className="font-mono text-xs uppercase tracking-[0.15em] px-3 py-1.5 rounded border"
          style={{ borderColor: "var(--accent)", color: "var(--accent)", opacity: running ? 0.5 : 1 }}
        >
          {running ? "Running..." : "Run Cycle"}
        </button>
      </div>

      {error && (
        <p className="px-5 pt-3 text-sm" style={{ color: "var(--danger)" }}>{error}</p>
      )}

      <div className="px-5 py-4 font-mono text-sm">
        {cycles.length === 0 && (
          <p style={{ color: "#CBD5E1" }}>No cycles run yet. Click Run Cycle to trigger one.</p>
        )}
        <ul className="space-y-2">
          {cycles.map((c) => {
            const isOpen = expandedId === c.id;
            const color = SEVERITY_COLOR[c.confirmedSeverity ?? ""] ?? "var(--text-3)";
            return (
              <li key={c.id} className="border rounded" style={{ borderColor: "var(--border)" }}>
                <button
                  className="w-full flex gap-3 items-baseline px-3 py-2 text-left"
                  onClick={() => setExpandedId(isOpen ? null : c.id)}
                >
                  <span style={{ color: "#CBD5E1" }}>{timeLabel(c.timestamp)}</span>
                  <span style={{ color }}>{c.action}</span>
                  <span style={{ color: "var(--text-2)" }}>
                    {c.confirmedSeverity ?? "data untrusted"}
                  </span>
                  <span className="ml-auto text-[13px]" style={{ color: "#CBD5E1" }}>
                    {isOpen ? "hide" : "why?"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 text-xs space-y-1" style={{ color: "#E2E8F0" }}>
                    <p>Raw signal score: {c.rawOverall}</p>
                    <p>AI assessment: {c.aiAssessment}</p>
                    {c.reasoning && <p>Reasoning: {c.reasoning}</p>}
                    {c.txHash && (
                      <p>
                        Tx:{" "}
                        <a
                          href={`https://web3.okx.com/explorer/x-layer-testnet/tx/${c.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--accent)" }}
                        >
                          {c.txHash.slice(0, 10)}...{c.txHash.slice(-6)}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}