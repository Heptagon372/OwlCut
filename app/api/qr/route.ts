import { generateQrBuffer } from "@/lib/qr/generateQr";

export const runtime = "nodejs";

// GET /api/qr?session_id= — 다운로드 페이지 URL을 인코딩한 QR PNG 반환 (설계도 7-5)
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return new Response("session_id 필수", { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
  const target = `${appUrl}/download/${sessionId}`;
  const buf = await generateQrBuffer(target);
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
