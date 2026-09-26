// AR 스티커 그림 3차 — 전부 직접 그린 SVG (외부 저작물 없음).
// 동물 한 종류를 더 늘리기보다, 부스에서 자주 찾는 "얼굴 위 소품"을 채웠다.
// 좌표 규칙은 1·2차와 같다: 그림의 가운데가 배치 기준점 (lib/ar/effects.ts 의 at/offset/size).
import { heartAt, starPath, svg } from "@/lib/art/svg";

const INK = "#1f1f22";

// ---------- 귀·후드 ----------
// 호랑이: 둥근 귀 + 줄무늬
const tigerEars = svg(
  280,
  160,
  `<defs><g id="t">` +
    `<path d="M-52 0C-58-56-34-104 0-104C34-104 58-56 52 0Z" fill="#f2a03c" stroke="#c9741b" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M-30-6C-34-46-18-78 0-78C18-78 34-46 30-6Z" fill="#ffd9a8"/>` +
    `<path d="M-40-58L-16-70M-38-38L-14-50" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
    `</g></defs>` +
    `<use href="#t" transform="translate(70 152) rotate(-10)"/><use href="#t" transform="translate(210 152) scale(-1 1) rotate(-10)"/>`,
);

// 젖소: 옆으로 처진 흰 귀 + 사이에 작은 뿔 (회전은 귀 중심 기준)
const cowEars = svg(
  320,
  180,
  `<defs><g id="ce">` +
    `<ellipse cx="0" cy="0" rx="58" ry="34" fill="#fbfbfc" stroke="#d3d3d8" stroke-width="4"/>` +
    `<ellipse cx="6" cy="2" rx="34" ry="19" fill="#ffc2d0"/>` +
    `</g></defs>` +
    `<use href="#ce" transform="translate(62 116) rotate(-14)"/><use href="#ce" transform="translate(258 116) scale(-1 1) rotate(-14)"/>` +
    `<path d="M126 96C118 62 126 40 146 34C154 66 152 86 142 100Z" fill="#f4ead6" stroke="#cbbda2" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M194 96C202 62 194 40 174 34C166 66 168 86 178 100Z" fill="#f4ead6" stroke="#cbbda2" stroke-width="4" stroke-linejoin="round"/>` +
    `<ellipse cx="40" cy="104" rx="22" ry="15" fill="${INK}" transform="rotate(-16 40 104)"/>` +
    `<ellipse cx="284" cy="128" rx="17" ry="12" fill="${INK}" transform="rotate(14 284 128)"/>`,
);

// 늑대: 뾰족한 회색 귀
const wolfEars = svg(
  300,
  180,
  `<defs><g id="w">` +
    `<path d="M-44 0L-8-138L46 0Z" fill="#8d94a3" stroke="#5f6675" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M-24-8L-8-100L26-8Z" fill="#3c3f4a"/>` +
    `</g></defs>` +
    `<use href="#w" transform="translate(74 168) rotate(-8)"/><use href="#w" transform="translate(226 168) scale(-1 1) rotate(-8)"/>`,
);

// 펭귄 후드 (얼굴 구멍 좌표는 panda-hood 와 동일: 160,200 rx88 ry106)
const penguinHood = svg(
  320,
  340,
  `<defs><mask id="pm"><rect width="320" height="340" fill="#fff"/><ellipse cx="160" cy="200" rx="88" ry="106" fill="#000"/></mask></defs>` +
    `<g mask="url(#pm)"><ellipse cx="160" cy="190" rx="148" ry="146" fill="#2b3446" stroke="#1b2130" stroke-width="5"/>` +
    `<ellipse cx="160" cy="316" rx="126" ry="24" fill="#222a39"/></g>` +
    `<ellipse cx="160" cy="200" rx="88" ry="106" fill="none" stroke="#1b2130" stroke-width="6"/>`,
);

// 오리 부리 (코 아래에 얹는 납작한 부리 — 눈은 사진의 눈이 보여야 하므로 그리지 않는다)
const duckBill = svg(
  260,
  120,
  `<path d="M18 46Q130 6 242 46Q208 106 130 110Q52 106 18 46Z" fill="#ffb02e" stroke="#d98a12" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M38 56Q130 34 222 56" fill="none" stroke="#d98a12" stroke-width="5" stroke-linecap="round"/>` +
    `<ellipse cx="104" cy="36" rx="7" ry="5" fill="#d98a12"/><ellipse cx="156" cy="36" rx="7" ry="5" fill="#d98a12"/>`,
);

// ---------- 러블리 ----------
// 하트 왕관
const heartCrown = svg(
  320,
  170,
  `<defs><linearGradient id="hc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fc0"/><stop offset="1" stop-color="#ff4f93"/></linearGradient></defs>` +
    `<path d="M24 150L44 52L110 96L160 24L210 96L276 52L296 150Z" fill="url(#hc)" stroke="#e03c7f" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="${heartAt(160, 58, 46)}" fill="#fff0f6" stroke="#e03c7f" stroke-width="4"/>` +
    `<path d="${heartAt(48, 92, 30)}" fill="#fff0f6" stroke="#e03c7f" stroke-width="3"/>` +
    `<path d="${heartAt(272, 92, 30)}" fill="#fff0f6" stroke="#e03c7f" stroke-width="3"/>` +
    `<rect x="18" y="140" width="284" height="22" rx="11" fill="#ffd0e4" stroke="#e03c7f" stroke-width="4"/>`,
);

// 진주 머리띠
const pearlTiara = svg(
  340,
  120,
  `<defs><radialGradient id="pg" cx="0.35" cy="0.3"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6dce8"/></radialGradient></defs>` +
    `<path d="M20 108Q170 6 320 108" fill="none" stroke="#d9cfe0" stroke-width="7" stroke-linecap="round"/>` +
    Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      const x = 20 + t * 300;
      const y = 108 - Math.sin(Math.PI * t) * 92;
      const r = 13 + Math.sin(Math.PI * t) * 5;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="url(#pg)" stroke="#cbbdd2" stroke-width="2"/>`;
    }).join(""),
);

// 눈 위에 올리는 별 (한쪽만 — mirrorSecond 로 반대쪽에)
const starEye = svg(
  120,
  120,
  `<defs><radialGradient id="se" cx="0.4" cy="0.35"><stop offset="0" stop-color="#fff6b0"/><stop offset="1" stop-color="#ffc32e"/></radialGradient></defs>` +
    `<path d="${starPath(60, 60, 54)}" fill="url(#se)" stroke="#e0951c" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="${starPath(60, 60, 24, 0.5)}" fill="#fffbe6" opacity="0.85"/>`,
);

// 머리 위 체리 두 알
const cherryPair = svg(
  220,
  180,
  `<path d="M110 150C104 104 96 64 70 34" fill="none" stroke="#3f8c43" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M110 150C122 110 140 78 168 52" fill="none" stroke="#3f8c43" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M70 34Q96 10 128 22Q104 44 70 34Z" fill="#4fa14f" stroke="#2f7a34" stroke-width="4"/>` +
    `<circle cx="62" cy="146" r="34" fill="#e2365a" stroke="#a81f3c" stroke-width="4"/>` +
    `<circle cx="158" cy="134" r="30" fill="#e2365a" stroke="#a81f3c" stroke-width="4"/>` +
    `<circle cx="52" cy="136" r="8" fill="#ffd0d8" opacity="0.9"/><circle cx="149" cy="125" r="7" fill="#ffd0d8" opacity="0.9"/>`,
);

// ---------- 펀 ----------
// 눈물 두 줄 (한쪽만 — mirrorSecond 로 반대쪽에)
const teardrop = svg(
  90,
  200,
  `<defs><linearGradient id="td" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#5fb9f5"/></linearGradient></defs>` +
    `<path d="M45 6C30 54 12 96 12 126C12 160 30 182 45 182C60 182 78 160 78 126C78 96 60 54 45 6Z" fill="url(#td)" stroke="#3f9fdd" stroke-width="4" opacity="0.92"/>` +
    `<ellipse cx="33" cy="126" rx="9" ry="18" fill="#ffffff" opacity="0.75"/>`,
);

// 꿀벌 더듬이
const beeAntennae = svg(
  260,
  180,
  `<path d="M104 176C86 120 70 84 46 58" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M156 176C174 120 190 84 214 58" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>` +
    `<circle cx="42" cy="46" r="26" fill="#ffd23f" stroke="${INK}" stroke-width="6"/>` +
    `<circle cx="218" cy="46" r="26" fill="#ffd23f" stroke="${INK}" stroke-width="6"/>` +
    `<path d="M24 40h36M28 54h28" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M200 40h36M204 54h28" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
);

export const EXTRA_ASSETS: Record<string, string> = {
  "tiger-ears": tigerEars,
  "cow-ears": cowEars,
  "wolf-ears": wolfEars,
  "penguin-hood": penguinHood,
  "duck-bill": duckBill,
  "heart-crown": heartCrown,
  "pearl-tiara": pearlTiara,
  "star-eye": starEye,
  "cherry-pair": cherryPair,
  teardrop,
  "bee-antennae": beeAntennae,
};
