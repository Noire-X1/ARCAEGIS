"use client";

import Hero from "./components/Hero";
import AgentActivity from "./components/AgentActivity";
import Header from "./components/Header";
import EventLog from "./components/EventLog";
import RiskStatus from "./components/RiskStatus";
import DepositPanel from "./components/DepositPanel";
import { useVault } from "./lib/useVault";

export default function Home() {
  const vault = useVault();

  return (
    <>
      <Hero />
      <div className="flex-1 flex flex-col relative z-[2]">
        <Header error={vault.error} />

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-14">
          <div className="mb-12">
            <p className="font-mono text-xs uppercase tracking-[0.2em] mb-4" style={{ color: "var(--text-3)" }}>
              Real-World-Asset Collateral · Automated Kill-Switch
            </p>
            <h1
              className="text-4xl md:text-5xl font-semibold tracking-tight mb-4"
              style={{ color: "var(--text-1)", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              An AI that watches your collateral so you don&apos;t have to.
            </h1>
            <p className="text-base max-w-2xl" style={{ color: "var(--text-2)" }}>
              ARCAEGIS reads the live price of your gold-backed collateral, scores the risk with an AI verdict,
              and freezes the vault the moment that risk turns critical. Nothing here is simulated. Every number
              below is read directly from X Layer testnet.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <RiskStatus price={vault.price} isFrozen={vault.isFrozen} configured={vault.configured} />
            </div>
            <div>
              <DepositPanel
                connected={vault.connected}
                address={vault.address}
                goldBalance={vault.goldBalance}
                vaultBalance={vault.vaultBalance}
                isFrozen={vault.isFrozen}
                configured={vault.configured}
                onConnect={vault.connect}
                onDeposit={vault.deposit}
                onWithdraw={vault.withdraw}
              />
            </div>
          </div>

          <EventLog events={vault.events} configured={vault.configured} />
          <AgentActivity />

          <footer className="mt-16 pt-6 border-t font-mono text-xs" style={{ borderColor: "var(--border)", color: "var(--text-3)" }}>
            X Layer AI Season · Chain ID 1952 · Built for the AI-RWA track
          </footer>
        </main>
      </div>
    </>
  );
}
