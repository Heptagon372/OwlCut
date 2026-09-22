// 계산된 배치대로 스티커 그림을 캔버스에 그린다 (미리보기 오버레이·합성·썸네일 공용).
import type { Placement } from "@/types/ar";
import { getAsset } from "./assets";

export function drawPlacements(ctx: CanvasRenderingContext2D, list: Placement[]) {
  for (const p of list) {
    const img = getAsset(p.asset);
    if (!img || !img.naturalWidth || p.w <= 0) continue; // 아직 로드 전이면 이번 프레임은 건너뜀
    const h = (p.w * img.naturalHeight) / img.naturalWidth;
    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(p.angle);
    if (p.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -p.w / 2, -h / 2, p.w, h);
    ctx.restore();
  }
}
