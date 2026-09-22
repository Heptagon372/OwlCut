// WebGL이 없는 기기용 근사치: 프리셋 파라미터 → CSS filter 문자열 (순수 함수).
// 커브·스플릿 토닝·그레인·피부보정 등은 표현 불가 → 밝기/대비/채도/흑백/세피아만 반영.
import type { FilterParams } from "@/types/filter";

const round = (v: number) => Math.round(v * 1000) / 1000;

export function paramsToCss(params: FilterParams, intensity = 1): string {
  const k = Math.min(Math.max(intensity, 0), 1);
  const lerp = (neutral: number, value: number) => neutral + (value - neutral) * k;

  const brightness = lerp(1, 2 ** (params.exposure ?? 0) * (1 + (params.brightness ?? 0)) + (params.fade ?? 0) * 0.3);
  const contrast = lerp(1, (params.contrast ?? 1) * (1 - (params.fade ?? 0) * 0.8));
  const saturate = lerp(1, (params.saturation ?? 1) * (1 + (params.vibrance ?? 0) * 0.3));
  const grayscale = lerp(0, params.bw ?? 0);
  const temp = params.temperature ?? 0;
  const sepia = lerp(0, Math.min(1, (params.sepia ?? 0) + Math.max(temp, 0) * 0.25));
  const hue = lerp(0, temp < 0 ? temp * 12 : 0);

  const parts: string[] = [];
  if (brightness !== 1) parts.push(`brightness(${round(brightness)})`);
  if (contrast !== 1) parts.push(`contrast(${round(contrast)})`);
  if (saturate !== 1) parts.push(`saturate(${round(saturate)})`);
  if (grayscale > 0) parts.push(`grayscale(${round(grayscale)})`);
  if (sepia > 0) parts.push(`sepia(${round(sepia)})`);
  if (hue !== 0) parts.push(`hue-rotate(${round(hue)}deg)`);
  return parts.length ? parts.join(" ") : "none";
}
