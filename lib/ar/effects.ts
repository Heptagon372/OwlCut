// AR 얼굴 효과 목록. 위치·크기 단위 = 얼굴 폭 (lib/ar/geometry.ts 의 얼굴 좌표계).
// offset: [눈 방향, 아래 방향]. 그림 모양은 lib/ar/assets.ts.
import type { ArEffect, EffectCategory } from "@/types/ar";

export const NO_EFFECT = "none";

export const EFFECT_CATEGORIES: { id: EffectCategory; label: string }[] = [
  { id: "animal", label: "동물" },
  { id: "lovely", label: "러블리" },
  { id: "funny", label: "펀" },
  { id: "fx", label: "얼굴 효과" },
];

const CHEEKS = ["cheekLeft", "cheekRight"] as const;

export const EFFECTS: ArEffect[] = [
  // ----- 동물 -----
  {
    id: "bunny",
    label: "토끼",
    category: "animal",
    parts: [
      { asset: "bunny-ears", at: "headTop", offset: [0, -0.4], size: 1.05 },
      { asset: "pink-nose", at: "nose", offset: [0, 0.01], size: 0.15 },
      { asset: "blush", at: [...CHEEKS], size: 0.32 },
    ],
  },
  {
    id: "cat",
    label: "고양이",
    category: "animal",
    parts: [
      { asset: "cat-ears", at: "headTop", offset: [0, -0.2], size: 1.15 },
      { asset: "whiskers", at: "nose", offset: [0, 0.03], size: 1.15 },
    ],
  },
  {
    id: "dog",
    label: "강아지",
    category: "animal",
    parts: [
      { asset: "dog-ears", at: "forehead", offset: [0, 0.3], size: 1.5 },
      { asset: "dog-nose", at: "nose", offset: [0, 0.08], size: 0.42 },
    ],
  },
  {
    id: "bear",
    label: "곰돌이",
    category: "animal",
    parts: [
      { asset: "bear-ears", at: "headTop", offset: [0, -0.12], size: 1.25 },
      { asset: "button-nose", at: "nose", size: 0.2 },
      { asset: "blush", at: [...CHEEKS], size: 0.28 },
    ],
  },
  {
    id: "mouse",
    label: "생쥐",
    category: "animal",
    parts: [
      { asset: "mouse-ears", at: "headTop", offset: [0, -0.16], size: 1.45 },
      { asset: "whiskers", at: "nose", offset: [0, 0.03], size: 1.0 },
    ],
  },
  {
    id: "fox",
    label: "여우",
    category: "animal",
    parts: [
      { asset: "fox-ears", at: "headTop", offset: [0, -0.24], size: 1.15 },
      { asset: "button-nose", at: "nose", size: 0.16 },
      { asset: "blush", at: [...CHEEKS], size: 0.26 },
    ],
  },
  {
    id: "pixel-cat",
    label: "도트 고양이",
    category: "animal",
    parts: [
      { asset: "pixel-cat-ears", at: "headTop", offset: [0, -0.16], size: 1.2 },
      { asset: "pixel-whiskers", at: "nose", offset: [0, 0.03], size: 1.05 },
    ],
  },
  {
    id: "panda",
    label: "판다 후드",
    category: "animal",
    parts: [{ asset: "panda-hood", at: "faceCenter", offset: [0, -0.18], size: 1.95 }],
  },

  // ----- 러블리 -----
  {
    id: "red-bow",
    label: "빨간 리본",
    category: "lovely",
    parts: [{ asset: "red-bow", at: "headTop", offset: [0.28, -0.06], size: 0.62, rotate: 14 }],
  },
  {
    id: "pink-bows",
    label: "핑크 리본",
    category: "lovely",
    parts: [
      { asset: "pink-bow", at: ["headTop", "headTop"], offset: [-0.4, 0.1], size: 0.38, rotate: -18, mirrorSecond: true },
      { asset: "blush", at: [...CHEEKS], size: 0.26 },
    ],
  },
  {
    id: "blue-ribbons",
    label: "파란 리본",
    category: "lovely",
    parts: [{ asset: "blue-ribbon", at: ["forehead", "forehead"], offset: [-0.54, 0.42], size: 0.34, mirrorSecond: true }],
  },
  {
    id: "heart-blush",
    label: "하트 볼터치",
    category: "lovely",
    parts: [{ asset: "heart-blush", at: [...CHEEKS], size: 0.36, mirrorSecond: true }],
  },
  {
    id: "strawberry",
    label: "딸기",
    category: "lovely",
    parts: [
      { asset: "strawberry", at: ["headTop", "headTop"], offset: [-0.3, -0.02], size: 0.26, rotate: -20, mirrorSecond: true },
      { asset: "blush", at: [...CHEEKS], size: 0.3 },
    ],
  },
  {
    id: "crown",
    label: "왕관",
    category: "lovely",
    parts: [{ asset: "crown", at: "headTop", offset: [0, -0.2], size: 0.7 }],
  },
  {
    id: "halo",
    label: "천사 링",
    category: "lovely",
    parts: [{ asset: "halo", at: "headTop", offset: [0, -0.34], size: 0.85 }],
  },
  {
    id: "hibiscus",
    label: "히비스커스",
    category: "lovely",
    parts: [{ asset: "hibiscus", at: "earRight", offset: [-0.02, -0.12], size: 0.46 }],
  },
  {
    id: "stars",
    label: "반짝 별",
    category: "lovely",
    parts: [{ asset: "stars", at: "faceCenter", offset: [0, -0.05], size: 2.0 }],
  },

  // ----- 펀 -----
  {
    id: "groucho",
    label: "코주부 안경",
    category: "funny",
    parts: [{ asset: "groucho", at: "eyes", offset: [0, 0.13], size: 1.1 }],
  },
  {
    id: "round-glasses",
    label: "동그란 안경",
    category: "funny",
    parts: [{ asset: "round-glasses", at: "eyes", size: 1.02 }],
  },
  {
    id: "sunglasses",
    label: "선글라스",
    category: "funny",
    parts: [{ asset: "sunglasses", at: "eyes", offset: [0, -0.03], size: 0.96 }],
  },
  {
    id: "devil",
    label: "악마 뿔",
    category: "funny",
    parts: [{ asset: "devil-horns", at: "headTop", offset: [0, -0.12], size: 0.9 }],
  },
  {
    id: "afro",
    label: "뽀글 머리",
    category: "funny",
    parts: [{ asset: "afro", at: "faceCenter", offset: [0, -0.24], size: 1.9 }],
  },

  // ----- 얼굴 효과 (셰이더) -----
  {
    id: "big-eyes",
    label: "왕눈이",
    category: "fx",
    parts: [],
    warps: [
      { at: "eyeLeft", radius: 0.24, strength: 0.4 },
      { at: "eyeRight", radius: 0.24, strength: 0.4 },
    ],
  },
  {
    id: "funny-face",
    label: "퍼니 페이스",
    category: "fx",
    parts: [],
    warps: [
      { at: "eyeLeft", radius: 0.28, strength: 0.55 },
      { at: "eyeRight", radius: 0.28, strength: 0.55 },
      { at: "mouth", radius: 0.34, strength: 0.5 },
    ],
  },
  {
    id: "chubby",
    label: "볼빵빵",
    category: "fx",
    parts: [],
    warps: [
      { at: "cheekLeft", radius: 0.32, strength: 0.4 },
      { at: "cheekRight", radius: 0.32, strength: 0.4 },
    ],
  },
  {
    id: "small-face",
    label: "작은 얼굴",
    category: "fx",
    parts: [],
    warps: [{ at: "mouth", radius: 0.8, strength: -0.25 }],
  },
  {
    id: "mosaic",
    label: "얼굴 모자이크",
    category: "fx",
    parts: [],
    mosaic: true,
  },
];

const byId = new Map(EFFECTS.map((e) => [e.id, e]));

/** 없는 id·"none" 은 null */
export function getEffect(id: string | null | undefined): ArEffect | null {
  return (id && byId.get(id)) || null;
}

export function isEffect(id: unknown): id is string {
  return typeof id === "string" && (id === NO_EFFECT || byId.has(id));
}

export function effectAssets(effect: ArEffect | null): string[] {
  return effect ? [...new Set(effect.parts.map((p) => p.asset))] : [];
}

/** 셰이더 처리(왜곡·모자이크)가 필요한 효과인지 */
export function needsShader(effect: ArEffect | null): boolean {
  return Boolean(effect && (effect.warps?.length || effect.mosaic));
}
