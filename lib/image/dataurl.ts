// 서버 전용: dataURL(base64)을 Buffer로 디코드.
export function dataUrlToBuffer(dataUrl: string): {
  buffer: Buffer;
  contentType: string;
} {
  const m = /^data:(.+?);base64,([\s\S]*)$/.exec(dataUrl);
  if (!m) throw new Error("잘못된 dataURL 형식");
  return { buffer: Buffer.from(m[2], "base64"), contentType: m[1] };
}
