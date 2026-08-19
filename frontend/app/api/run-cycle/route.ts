import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json({
   ok: false,
   error: "Agent execution requires a local environment. Deploy your own instance to enable live cycle triggering."
  }, { status: 503 });
}
