"use client";

export default function Header({ error }: { error: string | null }) {
  return (
    <header
      className="border-b px-6 py-5 flex items-center justify-between sticky top-0 z-10"
      style={{ borderColor: "var(--border)", background: "rgba(15,15,17,0.85)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded flex items-center justify-center font-mono text-sm font-bold"
          style={{ background: "var(--accent)", color: "#0f0f11" }}
        >
          A
        </div>
        <div>
          <p className="font-mono text-sm font-semibold tracking-wide" style={{ color: "var(--text-1)" }}>
            ARCAEGIS
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--text-3)" }}>
            X Layer Testnet
          </p>
        </div>
      </div>
      {error && (
        <p className="font-mono text-xs px-3 py-1.5 rounded border" style={{ color: "var(--danger)", borderColor: "var(--danger-dim)" }}>
          {error}
        </p>
      )}
    </header>
  );
}
