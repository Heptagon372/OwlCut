import { NextResponse } from "next/server";
import { getStore, storeKind } from "@/lib/db";
import { LocalStore } from "@/lib/db/localStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/file?p=…&e=…&s=… — 이 PC 저장소의 서명 URL (Supabase 의 서명 URL 자리).
// 서명과 유효시간이 맞을 때만 파일을 내준다 (세션 id 를 아는 것만으로는 못 본다).
export async function GET(req: Request) {
  if (storeKind() !== "local") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const store = getStore();
  if (!(store instanceof LocalStore)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const file = await store.readSigned(new URL(req.url).searchParams);
  if (!file) {
    // 서명이 틀렸거나 유효시간이 지났거나 파일이 없음 — 이유는 알려 주지 않는다
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const headers: Record<string, string> = {
    "Content-Type": file.contentType,
    "Cache-Control": "private, no-store",
    "Content-Length": String(file.body.length),
  };
  if (file.downloadName) {
    headers["Content-Disposition"] = `attachment; filename="${file.downloadName.replace(/[^\w.\-]/g, "_")}"`;
  }
  return new NextResponse(new Uint8Array(file.body), { headers });
}
