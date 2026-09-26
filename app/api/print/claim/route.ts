import { NextResponse } from "next/server";
import { isStoreConfigured, STORE_NOT_CONFIGURED } from "@/lib/db";
import { PRINTER_NAME, verifyPrintToken } from "@/lib/printer/auth";
import { claimNextJob, recordHeartbeat } from "@/lib/printer/printQueue";

export const runtime = "nodejs";

// POST /api/print/claim — 로컬 프린트 서버 전용 (Bearer PRINT_SERVER_TOKEN).
// { printer } → 대기 작업 1건을 printing으로 바꿔 반환. 없으면 { job: null }. 호출 자체가 heartbeat.
export async function POST(req: Request) {
  if (!verifyPrintToken(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isStoreConfigured()) {
    return NextResponse.json({ error: STORE_NOT_CONFIGURED }, { status: 503 });
  }
  let body: { printer?: unknown; info?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const printer = typeof body.printer === "string" ? body.printer.trim() : "";
  if (!PRINTER_NAME.test(printer)) {
    return NextResponse.json({ error: "bad_printer" }, { status: 400 });
  }
  const info = body.info && typeof body.info === "object" ? (body.info as Record<string, unknown>) : undefined;

  try {
    await recordHeartbeat(printer, info);
    const job = await claimNextJob(printer);
    return NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
}
