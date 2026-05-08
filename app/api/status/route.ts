import { NextResponse } from "next/server";
import { runStatusChecks } from "../../lib/statusChecks";
export type { ApiStatus, StatusResponse } from "../../lib/statusChecks";

export async function GET() {
  const body = await runStatusChecks();
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
