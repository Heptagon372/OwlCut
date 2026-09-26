import { NextResponse } from "next/server";
import { isStoreConfigured, STORE_NOT_CONFIGURED } from "@/lib/db";
import { PRINTER_NAME, verifyPrintToken } from "@/lib/printer/auth";
import { PrintQueueError, reportJobResult } from "@/lib/printer/printQueue";

export const runtime = "nodejs";

// PATCH /api/print/[id] — 로컬 프린트 서버 전용. { printer, status: completed|failed, error? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyPrintToken(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isStoreConfigured()) {
    return NextResponse.json({ error: STORE_NOT_CONFIGURED }, { status: 503 });
  }
  const { id } = await params;
  let body: { printer?: unknown; status?: unknown; error?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const printer = typeof body.printer === "string" ? body.printer.trim() : "";
  const status = body.status;
  if (!PRINTER_NAME.test(printer) || (status !== "completed" && status !== "failed")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    await reportJobResult(id, printer, status, typeof body.error === "string" ? body.error : undefined);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PrintQueueError) return NextResponse.json({ error: e.code }, { status: 404 });
    return NextResponse.json({ error: "report_failed" }, { status: 500 });
  }
}
