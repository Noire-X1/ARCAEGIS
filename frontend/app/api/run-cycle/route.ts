import { NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

export const runtime = "nodejs";

type CycleRecord = {
  id: string;
  timestamp: number;
  action: string;
  confirmedSeverity: string | null;
  rawOverall: string;
  aiAssessment: string;
  reasoning: string | null;
  txHash: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __arcaegisHistory: any[] | undefined;
}

function getHistory(): CycleRecord[] {
  if (!global.__arcaegisHistory) global.__arcaegisHistory = [];
  return global.__arcaegisHistory;
}

function runAgentScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    const agentDir = path.join(process.cwd(), "..", "arcaegis-agent");
    execFile(
      "node",
      ["runCycleForApi.js"],
      { cwd: agentDir, timeout: 30000 },
      (err, stdout, stderr) => {
        const lines = stdout.split("\n");
        const resultLine = lines.find((l) => l.startsWith("__CYCLE_RESULT__"));
        const errorLine = lines.find((l) => l.startsWith("__CYCLE_ERROR__"));

        if (resultLine) {
          try {
            resolve(JSON.parse(resultLine.replace("__CYCLE_RESULT__", "")));
          } catch {
            reject(new Error("Failed to parse cycle result: " + stdout));
          }
          return;
        }
        if (errorLine) {
          try {
            const parsed = JSON.parse(errorLine.replace("__CYCLE_ERROR__", ""));
            reject(new Error(parsed.message || "Cycle script reported an error"));
          } catch {
            reject(new Error(stderr || stdout || "Unknown agent script error"));
          }
          return;
        }
        reject(new Error(stderr || stdout || err?.message || "No result from agent script"));
      }
    );
  });
}

export async function POST() {
  try {
    const decision = await runAgentScript();

    const record: CycleRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      action: decision.action,
      confirmedSeverity: decision.confirmedSeverity,
      rawOverall: decision.risk?.overall ?? "UNKNOWN",
      aiAssessment: decision.ai?.assessment ?? "not queried (data untrusted)",
      reasoning: decision.ai?.reasoning ?? decision.reason ?? null,
      txHash: decision.txHash ?? null,
    };

    const history = getHistory();
    history.unshift(record);
    if (history.length > 50) history.length = 50;

    return NextResponse.json({ ok: true, decision: record });
  } catch (err: any) {
    console.error("run-cycle failed:", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
