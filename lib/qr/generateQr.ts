import QRCode from "qrcode";

const OPTIONS = { width: 512, margin: 2, errorCorrectionLevel: "M" as const };

// 클라이언트/서버 공용: QR을 dataURL(PNG)로
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, OPTIONS);
}

// 서버 전용: QR을 PNG Buffer로 (/api/qr 응답용)
export async function generateQrBuffer(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, { ...OPTIONS, type: "png" });
}
