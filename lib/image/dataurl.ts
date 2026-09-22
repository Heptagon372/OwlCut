// 서버 전용: 업로드된 dataURL(base64) → 이미지 Buffer.
// 형식 이름(data:image/…)은 보낸 쪽이 마음대로 쓸 수 있으므로 믿지 않고, 파일 앞부분(시그니처)으로 PNG/JPEG 만 받는다.
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 1200x1800 PNG 는 보통 1~3MB

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const startsWith = (b: Buffer, sig: number[]) => b.length >= sig.length && sig.every((v, i) => b[i] === v);

export function decodeImage(dataUrl: unknown): { buffer: Buffer; contentType: "image/png" | "image/jpeg" } | null {
  if (typeof dataUrl !== "string" || dataUrl.length > Math.ceil(MAX_IMAGE_BYTES * 1.37) + 64) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0 || !/^data:image\/(png|jpeg|jpg);base64$/i.test(dataUrl.slice(0, comma))) return null;
  const buffer = Buffer.from(dataUrl.slice(comma + 1), "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) return null;
  if (startsWith(buffer, PNG)) return { buffer, contentType: "image/png" };
  if (startsWith(buffer, JPEG)) return { buffer, contentType: "image/jpeg" };
  return null;
}
