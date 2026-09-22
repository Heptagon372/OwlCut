// AR 얼굴 효과 목록. 위치·크기 단위 = 얼굴 폭 (lib/ar/geometry.ts 의 얼굴 좌표계).
// offset: [눈 방향, 아래 방향]. 그림 모양은 lib/ar/assets.ts.
import type { ArEffect, EffectCategory, WarpSpec } from "@/types/ar";

export const NO_EFFECT = "none";

export const EFFECT_CATEGORIES: { id: EffectCategory; label: string }[] = [
  { id: "animal", label: "동물" },
  { id: "lovely", label: "러블리" },
  { id: "funny", label: "펀" },
  { id: "fx", label: "얼굴 효과" },
];

const CHEEKS = ["cheekLeft", "cheekRight"] as const;

// 일본 스티커 사진기(프리쿠라) 보정: 큰 눈 + 갸름한 얼굴
const PURIKURA: WarpSpec[] = [
  { at: "eyeLeft", radius: 0.26, strength: 0.42 },
  { at: "eyeRight", radius: 0.26, strength: 0.42 },
  { at: "mouth", radius: 0.8, strength: -0.18 },
];

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
  {
    id: "white-dog",
    label: "흰 강아지",
    category: "animal",
    parts: [
      { asset: "white-dog-ears", at: "forehead", offset: [0, 0.3], size: 1.5 },
      { asset: "dog-nose", at: "nose", offset: [0, 0.08], size: 0.42 },
    ],
  },
  {
    id: "yellow-cat",
    label: "노란 고양이",
    category: "animal",
    parts: [
      { asset: "yellow-cat-ears", at: "headTop", offset: [0, -0.2], size: 1.15 },
      { asset: "whiskers", at: "nose", offset: [0, 0.03], size: 1.15 },
    ],
  },
  {
    id: "pink-bunny",
    label: "핑크 토끼",
    category: "animal",
    parts: [
      { asset: "pink-bunny-ears", at: "headTop", offset: [0, -0.4], size: 1.05 },
      { asset: "pink-nose", at: "nose", offset: [0, 0.01], size: 0.15 },
      { asset: "blush", at: [...CHEEKS], size: 0.32 },
    ],
  },
  {
    id: "pixel-bunny",
    label: "도트 토끼",
    category: "animal",
    parts: [
      { asset: "pixel-bunny-ears", at: "headTop", offset: [0, -0.36], size: 0.95 },
      { asset: "pixel-whiskers", at: "nose", offset: [0, 0.03], size: 1.05 },
    ],
  },
  {
    id: "hamster",
    label: "햄스터",
    category: "animal",
    parts: [
      { asset: "hamster-ears", at: "headTop", offset: [0, -0.04], size: 1.1 },
      { asset: "buck-teeth", at: "mouth", offset: [0, 0.03], size: 0.15 },
      { asset: "blush", at: [...CHEEKS], size: 0.3 },
    ],
    warps: [
      { at: "cheekLeft", radius: 0.3, strength: 0.3 },
      { at: "cheekRight", radius: 0.3, strength: 0.3 },
    ],
  },
  {
    id: "frog",
    label: "개구리 모자",
    category: "animal",
    parts: [
      { asset: "frog-hat", at: "headTop", offset: [0, -0.14], size: 1.35 },
      { asset: "blush", at: [...CHEEKS], size: 0.28 },
    ],
  },
  {
    id: "chick",
    label: "머리 위 병아리",
    category: "animal",
    parts: [{ asset: "chick", at: "headTop", offset: [0.06, -0.24], size: 0.55 }],
  },
  {
    id: "boar",
    label: "멧돼지",
    category: "animal",
    parts: [
      { asset: "boar-ears", at: "headTop", offset: [0, -0.1], size: 1.2 },
      { asset: "boar-snout", at: "nose", offset: [0, 0.06], size: 0.44 },
    ],
  },
  {
    id: "koala",
    label: "코알라",
    category: "animal",
    parts: [
      { asset: "koala-ears", at: "headTop", offset: [0, 0.02], size: 1.6 },
      { asset: "koala-nose", at: "nose", offset: [0, -0.01], size: 0.3 },
    ],
  },
  {
    id: "dino",
    label: "공룡 후드",
    category: "animal",
    parts: [{ asset: "dino-hood", at: "faceCenter", offset: [0, -0.18], size: 1.95 }],
  },
  {
    id: "sheep-towel",
    label: "양머리",
    category: "animal",
    parts: [{ asset: "sheep-towel", at: "forehead", offset: [0, -0.1], size: 1.5 }],
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
  {
    id: "flower-crown",
    label: "꽃 왕관",
    category: "lovely",
    parts: [{ asset: "flower-crown", at: "forehead", offset: [0, -0.1], size: 1.25 }],
  },
  {
    id: "black-bow",
    label: "블랙 리본",
    category: "lovely",
    parts: [{ asset: "black-bow", at: "headTop", offset: [0.3, -0.04], size: 0.64, rotate: 16 }],
  },
  {
    id: "glitter-bow",
    label: "글리터 리본",
    category: "lovely",
    parts: [{ asset: "glitter-bow", at: "headTop", offset: [0, -0.12], size: 0.8 }],
  },
  {
    id: "butterflies",
    label: "나비",
    category: "lovely",
    parts: [{ asset: "butterflies", at: "headTop", offset: [0.3, -0.04], size: 0.8 }],
  },
  {
    id: "freckles",
    label: "주근깨",
    category: "lovely",
    parts: [
      { asset: "freckles", at: "nose", offset: [0, -0.05], size: 0.8 },
      { asset: "blush", at: [...CHEEKS], size: 0.26 },
    ],
  },
  {
    id: "face-gems",
    label: "큐빅",
    category: "lovely",
    parts: [{ asset: "face-gems", at: "eyes", offset: [0, 0.15], size: 1.0 }],
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
  {
    id: "party-hat",
    label: "파티 모자",
    category: "funny",
    parts: [{ asset: "party-hat", at: "headTop", offset: [0.16, -0.3], size: 0.52, rotate: 16 }],
  },
  {
    id: "headphones",
    label: "헤드폰",
    category: "funny",
    parts: [{ asset: "headphones", at: "eyes", offset: [0, -0.17], size: 1.32 }],
  },
  {
    id: "heart-glasses",
    label: "하트 선글라스",
    category: "funny",
    parts: [{ asset: "heart-glasses", at: "eyes", offset: [0, 0.01], size: 1.0 }],
  },
  {
    id: "mushroom",
    label: "버섯 모자",
    category: "funny",
    parts: [{ asset: "mushroom-cap", at: "headTop", offset: [0, -0.14], size: 1.3 }],
  },
  {
    id: "mustache",
    label: "콧수염",
    category: "funny",
    parts: [{ asset: "mustache", at: "nose", offset: [0, 0.11], size: 0.55 }],
  },
  {
    id: "reindeer",
    label: "루돌프",
    category: "funny",
    parts: [
      { asset: "antlers", at: "headTop", offset: [0, -0.22], size: 1.2 },
      { asset: "red-nose", at: "nose", size: 0.2 },
    ],
  },
  {
    id: "cat-mouth",
    label: "고양이 입",
    category: "funny",
    parts: [
      { asset: "cat-mouth", at: "mouth", offset: [0, -0.04], size: 0.42 },
      { asset: "blush", at: [...CHEEKS], size: 0.26 },
    ],
  },
  {
    id: "sticker-bomb",
    label: "스티커 폭탄",
    category: "funny",
    parts: [{ asset: "sticker-bomb", at: "faceCenter", size: 1.25 }],
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
    id: "purikura",
    label: "프리쿠라",
    category: "fx",
    parts: [{ asset: "blush", at: [...CHEEKS], size: 0.3 }],
    warps: [...PURIKURA],
  },
  {
    id: "purikura-cat",
    label: "프리쿠라 고양이",
    category: "fx",
    parts: [
      { asset: "white-cat-ears", at: "headTop", offset: [0, -0.2], size: 1.15 },
      { asset: "blush", at: [...CHEEKS], size: 0.3 },
    ],
    warps: [...PURIKURA],
  },
  {
    id: "fisheye",
    label: "0.5 셀카",
    category: "fx",
    parts: [],
    warps: [{ at: "nose", radius: 0.9, strength: 0.45 }],
  },
  {
    id: "alien",
    label: "외계인",
    category: "fx",
    parts: [],
    warps: [
      { at: "eyeLeft", radius: 0.3, strength: 0.55 },
      { at: "eyeRight", radius: 0.3, strength: 0.55 },
      { at: "mouth", radius: 0.22, strength: -0.5 },
    ],
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
