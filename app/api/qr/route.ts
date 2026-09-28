import { generateQrBuffer } from "@/lib/qr/generateQr";
import { publicBaseUrl } from "@/lib/net/publicUrl";

export const runtime = "nodejs";

// GET /api/qr?session_id= — 다운로드 페이지 URL을 인코딩한 QR PNG 반환 (설계도 7-5)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return new Response("session_id 필수", { status: 400 });

  const appUrl = publicBaseUrl(req.url);
  const target = `${appUrl}/download/${sessionId}`;
  const buf = await generateQrBuffer(target);
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
  });
}
