import { NextResponse } from "next/server";

export const runtime = "nodejs";

declare global {
  // eslint-disable-next-line no-var
  var __arcaegisHistory: any[] | undefined;
}

export async function GET() {
  const history = global.__arcaegisHistory ?? [];
  return NextResponse.json({ ok: true, cycles: history });
}