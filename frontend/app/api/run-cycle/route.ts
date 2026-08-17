import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({
   ok: false,
   error: "Run Cycle is only available when running locally. For the live demo, run node loop.js from arcaegis-agent directly."
  }, { status: 503 });
}
