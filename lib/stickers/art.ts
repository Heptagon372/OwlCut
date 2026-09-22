// 그림 스티커 — 전부 직접 그린 SVG (조사한 포토부스 트렌드: 코케트 리본·크롬 하트·Y2K·볼펜 낙서·마스킹 테이프 등).
// cut(): 흰 다이컷 테두리 + 옅은 그림자 (SVG 필터) → 어떤 사진 위에서도 스티커처럼 보인다.
// 새 스티커 = 여기에 SVG 하나 + data/stickers/index.json 에 한 줄.
import { heartPath, pixelSvg, sparklePath, starPath } from "@/lib/art/svg";

const INK = "#1b1b1f";
const PEN = "#2f5bea";

/** 다이컷 스티커 (흰 테두리 r, 그림자). body 좌표계는 0..w, 0..h */
function cut(w: number, h: number, body: string, r = 7): string {
  const p = Math.ceil(r * 2.6);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-p} ${-p} ${w + p * 2} ${h + p * 2}" width="${(w + p * 2) * 2}" height="${(h + p * 2) * 2}">` +
    `<defs><filter id="cut" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
    `<feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/>` +
    `<feGaussianBlur in="d" stdDeviation="${r * 0.6}"/><feOffset dy="${r * 0.5}" result="b"/>` +
    `<feFlood flood-color="#000" flood-opacity=".22"/><feComposite in2="b" operator="in" result="s"/>` +
    `<feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="o"/>` +
    `<feMerge><feMergeNode in="s"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<g filter="url(#cut)">${body}</g></svg>`
  );
}

/** 테두리 없이 (마스킹 테이프처럼 반투명한 것) */
function plain(w: number, h: number, body: string, shadow = true): string {
  const p = 10;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-p} ${-p} ${w + p * 2} ${h + p * 2}" width="${(w + p * 2) * 2}" height="${(h + p * 2) * 2}">` +
    (shadow
      ? `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".18"/></filter></defs><g filter="url(#sh)">${body}</g>`
      : body) +
    `</svg>`
  );
}

// ---------- 러블리 ----------
function bow(fill: string, stroke: string, hi: string, pearl = false): string {
  const loopL = "M100 62C70 20 18 10 14 44C10 76 56 86 100 70Z";
  const tailL = "M92 72C80 100 66 130 50 160L64 154L70 166C84 134 96 104 102 76Z";
  const side = (d: string) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>`;
  return cut(
    200,
    170,
    `<g>${side(tailL)}<g transform="translate(200 0) scale(-1 1)">${side(tailL)}</g>` +
      `${side(loopL)}<g transform="translate(200 0) scale(-1 1)">${side(loopL)}</g>` +
      `<path d="M96 64Q62 42 34 48M104 64Q138 42 166 48" stroke="${hi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>` +
      `<rect x="87" y="48" width="26" height="30" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="4"/>` +
      (pearl
        ? `<defs><radialGradient id="pe" cx=".35" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e3d9c8"/></radialGradient></defs><circle cx="100" cy="63" r="12" fill="url(#pe)" stroke="#bfae8e" stroke-width="2"/>`
        : "") +
      `</g>`,
  );
}

const cherry = cut(
  160,
  170,
  `<path d="M96 18Q70 60 54 104M96 18Q106 70 110 112" stroke="#3f7d2a" stroke-width="6" fill="none" stroke-linecap="round"/>` +
    `<path d="M96 20C112 2 140 6 146 20C130 30 110 30 96 20Z" fill="#58a83a" stroke="#3f7d2a" stroke-width="3"/>` +
    `<circle cx="52" cy="128" r="31" fill="#e11d48" stroke="#9f1239" stroke-width="4"/><circle cx="112" cy="136" r="30" fill="#e11d48" stroke="#9f1239" stroke-width="4"/>` +
    `<ellipse cx="42" cy="116" rx="9" ry="6" fill="#fff" opacity=".75" transform="rotate(-30 42 116)"/><ellipse cx="102" cy="124" rx="9" ry="6" fill="#fff" opacity=".75" transform="rotate(-30 102 124)"/>`,
);

const strawberry = cut(
  150,
  170,
  `<path d="M75 164C40 146 16 108 22 78C28 54 52 50 75 58C98 50 122 54 128 78C134 108 110 146 75 164Z" fill="#ff3d57" stroke="#c81d3a" stroke-width="4"/>` +
    [[50, 80], [75, 76], [100, 82], [60, 104], [88, 106], [74, 130], [44, 104], [106, 106], [62, 146], [88, 142]]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="4.6" fill="#ffe08a"/>`)
      .join("") +
    `<path d="M75 62L52 40L66 44L60 20L75 36L90 20L84 44L98 40Z" fill="#4caf50" stroke="#2e7d32" stroke-width="3" stroke-linejoin="round"/>`,
);

const heartPuffy = cut(
  180,
  172,
  `<defs><radialGradient id="hp" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ff8aa6"/><stop offset=".6" stop-color="#f0224f"/><stop offset="1" stop-color="#c30a37"/></radialGradient></defs>` +
    `<path d="${heartPath(10, 26, 160)}" fill="url(#hp)"/>` +
    `<ellipse cx="54" cy="58" rx="24" ry="12" fill="#fff" opacity=".75" transform="rotate(-35 54 58)"/><circle cx="36" cy="80" r="5" fill="#fff" opacity=".7"/>`,
);

const heartTrio = cut(
  200,
  150,
  `<path d="${heartPath(8, 40, 96)}" fill="#ff5f8f" stroke="${INK}" stroke-width="4"/>` +
    `<path d="${heartPath(104, 14, 72)}" fill="#ffb3c8" stroke="${INK}" stroke-width="4" transform="rotate(14 140 50)"/>` +
    `<path d="${heartPath(116, 92, 50)}" fill="#e11d48" stroke="${INK}" stroke-width="4" transform="rotate(-12 140 115)"/>`,
);

const wingL = "M112 70C96 30 50 8 12 20C26 30 30 40 26 48C42 50 46 58 40 66C58 68 62 78 56 88C80 92 102 86 112 70Z";
const angelWings = cut(
  240,
  110,
  `<g fill="#fff" stroke="#8fc2ff" stroke-width="4" stroke-linejoin="round"><path d="${wingL}"/><path d="${wingL}" transform="translate(240 0) scale(-1 1)"/></g>` +
    `<g stroke="#b9d9ff" stroke-width="3" fill="none" stroke-linecap="round"><path d="M100 64Q70 44 40 34M96 74Q72 64 52 62M120 74Q144 64 164 62M140 64Q170 44 200 34"/></g>`,
);

const cloud = cut(
  220,
  124,
  `<path d="M40 112C10 112 6 72 38 66C34 30 86 20 102 46C114 14 170 18 172 58C206 58 214 106 180 112Z" fill="#fff" stroke="#8fc2ff" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M40 104C90 110 140 110 178 104" stroke="#d6e9ff" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="82" cy="82" rx="10" ry="6" fill="#ffc1d4"/><ellipse cx="146" cy="82" rx="10" ry="6" fill="#ffc1d4"/>` +
    `<circle cx="96" cy="72" r="4" fill="${INK}"/><circle cx="132" cy="72" r="4" fill="${INK}"/><path d="M106 82Q114 90 122 82" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
);

const HOLO = `<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc1e3"/><stop offset=".35" stop-color="#c7b8ff"/><stop offset=".7" stop-color="#a8e6ff"/><stop offset="1" stop-color="#ffe7a8"/></linearGradient>`;
const upperWing = "M100 80C70 20 20 10 18 50C16 80 60 92 100 84Z";
const lowerWing = "M100 88C60 92 36 120 50 142C64 160 94 132 100 94Z";
const butterfly = cut(
  200,
  160,
  `<defs>${HOLO}</defs><g fill="url(#holo)" stroke="#6a5aa8" stroke-width="3.5" stroke-linejoin="round">` +
    `<path d="${upperWing}"/><path d="${lowerWing}"/><g transform="translate(200 0) scale(-1 1)"><path d="${upperWing}"/><path d="${lowerWing}"/></g></g>` +
    `<g fill="#fff" opacity=".7"><circle cx="46" cy="46" r="7"/><circle cx="154" cy="46" r="7"/><circle cx="68" cy="120" r="5"/><circle cx="132" cy="120" r="5"/></g>` +
    `<ellipse cx="100" cy="92" rx="6" ry="34" fill="#2b2340"/><path d="M98 62Q88 36 76 30M102 62Q112 36 124 30" stroke="#2b2340" stroke-width="3" fill="none" stroke-linecap="round"/>`,
);

const daisy = cut(
  160,
  160,
  Array.from({ length: 12 }, (_, i) => `<ellipse cx="80" cy="40" rx="13" ry="32" fill="#fff" stroke="#e5ded0" stroke-width="2" transform="rotate(${i * 30} 80 80)"/>`).join("") +
    `<circle cx="80" cy="80" r="23" fill="#ffc933" stroke="#e0a800" stroke-width="3"/><circle cx="73" cy="73" r="5" fill="#ffe28a"/>`,
);

const rose = cut(
  150,
  170,
  `<path d="M58 118C40 134 30 150 36 164C56 160 66 142 70 128Z" fill="#58a83a" stroke="#3f7d2a" stroke-width="3"/>` +
    `<path d="M92 118C110 134 120 150 114 164C94 160 84 142 80 128Z" fill="#58a83a" stroke="#3f7d2a" stroke-width="3"/>` +
    `<circle cx="75" cy="72" r="56" fill="#e5383b" stroke="#a4161a" stroke-width="4"/>` +
    `<path d="M75 58C98 52 104 82 82 90C62 96 54 72 70 64C84 58 90 76 78 78" stroke="#a4161a" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M30 70C34 40 60 22 86 26M120 76C118 104 98 122 70 122" stroke="#a4161a" stroke-width="4" fill="none" stroke-linecap="round"/>`,
);

const kiss = cut(
  180,
  104,
  `<path d="M10 50C30 20 60 12 90 34C120 12 150 20 170 50C140 56 120 58 90 56C60 58 40 56 10 50Z" fill="#e0115f"/>` +
    `<path d="M10 52C40 60 60 62 90 60C120 62 140 60 170 52C150 98 30 98 10 52Z" fill="#c10d52"/>` +
    `<path d="M52 72C70 78 110 78 128 72" stroke="#ff6fa3" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`,
);

// ---------- Y2K ----------
const CHROME = `<linearGradient id="chr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfbfd"/><stop offset=".42" stop-color="#b9bdc7"/><stop offset=".52" stop-color="#6e737f"/><stop offset=".78" stop-color="#d8dbe2"/><stop offset="1" stop-color="#ffffff"/></linearGradient>`;

const chromeHeart = cut(
  180,
  172,
  `<defs>${CHROME}</defs><path d="${heartPath(10, 26, 160)}" fill="url(#chr)" stroke="#8a8e98" stroke-width="2.5"/>` +
    `<ellipse cx="56" cy="56" rx="26" ry="11" fill="#fff" opacity=".9" transform="rotate(-35 56 56)"/>` +
    `<path d="${sparklePath(132, 52, 14)}" fill="#fff"/>`,
);

const chromeStar = cut(
  170,
  170,
  `<defs>${CHROME}</defs><path d="${sparklePath(85, 85, 80)}" fill="url(#chr)" stroke="#8a8e98" stroke-width="2.5"/>` +
    `<circle cx="85" cy="85" r="10" fill="#fff" opacity=".9"/>`,
);

const sparkles = cut(
  200,
  170,
  `<g fill="#fff" stroke="#b7c3ff" stroke-width="3" stroke-linejoin="round"><path d="${sparklePath(78, 86, 62)}"/><path d="${sparklePath(158, 40, 30)}"/><path d="${sparklePath(160, 134, 22)}"/></g>` +
    `<g fill="#c7d0ff"><circle cx="20" cy="30" r="5"/><circle cx="186" cy="92" r="4"/><circle cx="30" cy="156" r="4"/><circle cx="118" cy="160" r="3"/></g>`,
);

const pixelHeart = cut(
  130,
  110,
  pixelSvg(
    [
      "..kkk...kkk..",
      ".kpppk.kpppk.",
      "kpwwppkpppppk",
      "kpwpppppppppk",
      "kpppppppppppk",
      ".kpppppppppk.",
      "..kpppppppk..",
      "...kpppppk...",
      "....kpppk....",
      ".....kpk.....",
      "......k......",
    ],
    { k: INK, p: "#ff5fa2", w: "#fff" },
  ).replace(/^<svg[^>]*>|<\/svg>$/g, "").replace(/<rect x="([\d.]+)" y="([\d.]+)" width="1.04" height="1.04"/g, (_, x, y) => `<rect x="${Number(x) * 10}" y="${Number(y) * 10}" width="10.4" height="10.4"`),
  5,
);

const cursor = cut(
  120,
  170,
  pixelSvg(
    [
      "k...........",
      "kk..........",
      "kwk.........",
      "kwwk........",
      "kwwwk.......",
      "kwwwwk......",
      "kwwwwwk.....",
      "kwwwwwwk....",
      "kwwwwwwwk...",
      "kwwwwwwwwk..",
      "kwwwwwkkkkk.",
      "kwwkwwk.....",
      "kwk.kwwk....",
      "kk..kwwk....",
      "k....kwwk...",
      ".....kwwk...",
      "......kk....",
    ],
    { k: INK, w: "#fff" },
  ).replace(/^<svg[^>]*>|<\/svg>$/g, "").replace(/<rect x="([\d.]+)" y="([\d.]+)" width="1.04" height="1.04"/g, (_, x, y) => `<rect x="${Number(x) * 10}" y="${Number(y) * 10}" width="10.4" height="10.4"`),
  5,
);

const loadingBar = cut(
  230,
  64,
  `<rect x="3" y="3" width="224" height="58" rx="14" fill="#fff" stroke="${INK}" stroke-width="5"/>` +
    Array.from({ length: 10 }, (_, i) => `<rect x="${14 + i * 20.6}" y="15" width="16" height="34" rx="4" fill="${i < 7 ? "#ff5fa2" : "#f1e6ee"}"/>`).join(""),
);

const smiley = cut(
  150,
  150,
  `<circle cx="75" cy="75" r="70" fill="#ffd93b" stroke="${INK}" stroke-width="6"/>` +
    `<ellipse cx="52" cy="60" rx="8" ry="14" fill="${INK}"/><ellipse cx="98" cy="60" rx="8" ry="14" fill="${INK}"/>` +
    `<path d="M38 88Q75 130 112 88" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
);

const lightning = cut(
  120,
  180,
  `<path d="M70 4L10 104H56L40 176L112 64H64L86 4Z" fill="#ffd93b" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>` +
    `<path d="M66 18L34 78" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>`,
);

function discoBall(): string {
  let facets = "";
  const shades = ["#ffffff", "#dfe3ea", "#b7bdc8", "#8f96a3", "#eef1f6"];
  let k = 0;
  for (let y = -70; y < 70; y += 14)
    for (let x = -70; x < 70; x += 14) facets += `<rect x="${80 + x}" y="${92 + y}" width="13" height="13" fill="${shades[k++ % shades.length]}"/>`;
  return cut(
    160,
    170,
    `<path d="M80 4V22" stroke="${INK}" stroke-width="4"/><defs><clipPath id="ball"><circle cx="80" cy="92" r="70"/></clipPath>` +
      `<radialGradient id="shine" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
      `<g clip-path="url(#ball)"><rect x="0" y="12" width="160" height="160" fill="#9aa1ad"/>${facets}<circle cx="80" cy="92" r="70" fill="url(#shine)"/></g>` +
      `<circle cx="80" cy="92" r="70" fill="none" stroke="#5d6470" stroke-width="3"/>` +
      `<path d="${sparklePath(126, 44, 16)}" fill="#fff"/><path d="${sparklePath(44, 136, 10)}" fill="#fff"/>`,
  );
}

const saturn = cut(
  200,
  140,
  `<path d="M22 86C4 52 196 16 178 52" stroke="#8a6cff" stroke-width="12" fill="none" stroke-linecap="round"/>` +
    `<circle cx="100" cy="70" r="48" fill="#c9b8ff" stroke="#6a4fd8" stroke-width="4"/><path d="M58 58Q100 44 142 58M54 78Q100 64 146 78" stroke="#a894ff" stroke-width="6" fill="none"/>` +
    `<path d="M178 52C196 88 4 122 22 86" stroke="#8a6cff" stroke-width="12" fill="none" stroke-linecap="round"/>`,
);

const cd = cut(
  160,
  160,
  `<defs><linearGradient id="cdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7f0ff"/><stop offset=".3" stop-color="#f9d4ff"/><stop offset=".55" stop-color="#fff6c9"/><stop offset=".8" stop-color="#c9ffe9"/><stop offset="1" stop-color="#cfd8ff"/></linearGradient></defs>` +
    `<circle cx="80" cy="80" r="74" fill="url(#cdg)" stroke="#9aa1ad" stroke-width="3"/><path d="M80 80L40 12A74 74 0 0 1 80 6Z" fill="#fff" opacity=".55"/>` +
    `<circle cx="80" cy="80" r="26" fill="#eef0f5" stroke="#9aa1ad" stroke-width="3"/><circle cx="80" cy="80" r="12" fill="#fff" stroke="#9aa1ad" stroke-width="3"/>`,
);

const flipPhone = cut(
  110,
  190,
  `<path d="M80 4V30" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="80" cy="6" r="5" fill="#ff5fa2" stroke="${INK}" stroke-width="3"/>` +
    `<rect x="10" y="26" width="90" height="74" rx="16" fill="#ffb3d4" stroke="${INK}" stroke-width="5"/><rect x="22" y="38" width="66" height="48" rx="8" fill="#d8f2ff" stroke="${INK}" stroke-width="3"/>` +
    `<path d="${heartPath(44, 50, 22)}" fill="#ff5fa2"/>` +
    `<rect x="10" y="104" width="90" height="82" rx="16" fill="#ffb3d4" stroke="${INK}" stroke-width="5"/>` +
    Array.from({ length: 9 }, (_, i) => `<rect x="${24 + (i % 3) * 22}" y="${116 + Math.floor(i / 3) * 20}" width="16" height="12" rx="4" fill="#fff" stroke="${INK}" stroke-width="2"/>`).join(""),
);

const checkerHeart = cut(
  180,
  172,
  `<defs><pattern id="ck" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#fff"/><rect width="12" height="12" fill="${INK}"/><rect x="12" y="12" width="12" height="12" fill="${INK}"/></pattern></defs>` +
    `<path d="${heartPath(10, 26, 160)}" fill="url(#ck)" stroke="${INK}" stroke-width="5"/>`,
);

const y2kStar = cut(
  170,
  165,
  `<defs><linearGradient id="ys" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7dcff"/><stop offset="1" stop-color="#9d7bff"/></linearGradient></defs>` +
    `<path d="${starPath(85, 88, 80, 0.5)}" fill="url(#ys)" stroke="url(#ys)" stroke-width="14" stroke-linejoin="round"/>` +
    `<path d="${starPath(85, 88, 80, 0.5)}" fill="none" stroke="#6a4fd8" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="66" cy="64" rx="16" ry="8" fill="#fff" opacity=".8" transform="rotate(-30 66 64)"/>`,
);

// ---------- 볼펜 낙서 (파랑) ----------
const pen = (w: number, h: number, d: string, extra = "") =>
  cut(w, h, `<path d="${d}" stroke="${PEN}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${extra}`, 5);

function spiralPath(): string {
  const pts: string[] = [];
  for (let t = 0; t <= Math.PI * 4.2; t += 0.25) {
    const r = 3 + 5 * t;
    pts.push(`${(70 + r * Math.cos(t)).toFixed(1)} ${(70 + r * Math.sin(t)).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

// ---------- 데코 ----------
function tape(fill: string, pattern: string, id: string): string {
  const edge = (x: number, dir: 1 | -1) =>
    Array.from({ length: 7 }, (_, i) => `${x + (i % 2 ? 6 * dir : 0)} ${i * 11.6}`).join("L");
  const d = `M${edge(0, 1)}L${edge(240, -1).split("L").reverse().join("L")}Z`;
  return plain(
    240,
    70,
    `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})" opacity=".86"><rect width="240" height="70" fill="${fill}"/>${pattern}</g>`,
  );
}

const tapeDots = Array.from({ length: 24 }, (_, i) => `<circle cx="${10 + (i % 12) * 20 + (Math.floor(i / 12) % 2) * 10}" cy="${20 + Math.floor(i / 12) * 30}" r="4.5" fill="#fff"/>`).join("");
const tapeGingham =
  Array.from({ length: 12 }, (_, i) => `<rect x="${i * 20}" y="0" width="10" height="70" fill="#fff" opacity=".45"/>`).join("") +
  Array.from({ length: 4 }, (_, i) => `<rect x="0" y="${i * 20}" width="240" height="10" fill="#fff" opacity=".45"/>`).join("");
const tapeStripe = Array.from({ length: 16 }, (_, i) => `<path d="M${i * 22 - 40} 70L${i * 22 + 30} 0" stroke="#fff" stroke-width="7" opacity=".8"/>`).join("");

const ticket = cut(
  240,
  110,
  `<path d="M0 0H240V38A17 17 0 0 0 240 72V110H0V72A17 17 0 0 0 0 38Z" fill="#fff3d6" stroke="#d9b570" stroke-width="3"/>` +
    `<path d="M70 8V102" stroke="#d9b570" stroke-width="3" stroke-dasharray="6 6"/><path d="${starPath(36, 55, 20)}" fill="#e5383b"/>` +
    `<g stroke="#caa35a" stroke-width="5" stroke-linecap="round"><path d="M92 36H214"/><path d="M92 56H190"/><path d="M92 76H204"/></g>`,
);

const filmPiece = cut(
  270,
  112,
  `<rect width="270" height="112" rx="6" fill="#141416"/>` +
    Array.from({ length: 13 }, (_, i) => `<rect x="${8 + i * 20}" y="6" width="10" height="9" rx="2" fill="#f4f1ea"/><rect x="${8 + i * 20}" y="97" width="10" height="9" rx="2" fill="#f4f1ea"/>`).join("") +
    `<defs><linearGradient id="f1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset="1" stop-color="#ff5f8f"/></linearGradient>` +
    `<linearGradient id="f2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#6a7bff"/></linearGradient>` +
    `<linearGradient id="f3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6f5c8"/><stop offset="1" stop-color="#3fb68b"/></linearGradient></defs>` +
    `<rect x="10" y="22" width="76" height="68" rx="3" fill="url(#f1)"/><rect x="97" y="22" width="76" height="68" rx="3" fill="url(#f2)"/><rect x="184" y="22" width="76" height="68" rx="3" fill="url(#f3)"/>`,
);

function stamp(): string {
  let holes = "";
  for (let x = 0; x <= 150; x += 15) holes += `<circle cx="${x}" cy="0" r="6"/><circle cx="${x}" cy="170" r="6"/>`;
  for (let y = 15; y < 170; y += 15) holes += `<circle cx="0" cy="${y}" r="6"/><circle cx="150" cy="${y}" r="6"/>`;
  return plain(
    150,
    170,
    `<defs><mask id="sm"><rect width="150" height="170" fill="#fff"/><g fill="#000">${holes}</g></mask></defs>` +
      `<rect width="150" height="170" fill="#fff" mask="url(#sm)"/><rect x="16" y="16" width="118" height="138" fill="#ffe0e6"/>` +
      `<path d="${starPath(75, 80, 42)}" fill="#e5383b"/><g fill="#e5383b"><circle cx="32" cy="136" r="4"/><circle cx="46" cy="136" r="4"/><circle cx="60" cy="136" r="4"/></g>`,
  );
}

const BARS = [4, 2, 6, 2, 3, 5, 2, 4, 2, 6, 3, 2, 5, 2, 3, 4, 2, 6, 2, 3, 5, 2, 4, 3, 2, 6, 2];
function barcode(): string {
  let x = 16;
  const bars = BARS.map((w, i) => {
    const r = i % 2 === 0 ? `<rect x="${x}" y="14" width="${w * 1.6}" height="54" fill="${INK}"/>` : "";
    x += w * 1.6 + 2.4;
    return r;
  }).join("");
  return cut(Math.ceil(x + 14), 84, `<rect width="${Math.ceil(x + 14)}" height="84" rx="8" fill="#fff"/>${bars}<rect x="16" y="72" width="${Math.ceil(x - 18)}" height="3" fill="${INK}" opacity=".2"/>`, 5);
}

const paperTag = cut(
  190,
  110,
  `<path d="M150 55C168 30 186 30 186 48" stroke="#c9a06b" stroke-width="3" fill="none"/>` +
    `<path d="M40 8H150L150 102H40L6 55Z" fill="#d9b88f" stroke="#a8814f" stroke-width="3" stroke-linejoin="round"/>` +
    `<circle cx="34" cy="55" r="8" fill="#fff" stroke="#a8814f" stroke-width="3"/><g stroke="#a8814f" stroke-width="4" stroke-linecap="round" opacity=".6"><path d="M62 42H132"/><path d="M62 62H118"/></g>`,
);

// 아울네컷 마스코트: 사진 가장자리에서 빼꼼
const owlPeek = cut(
  220,
  150,
  `<path d="M34 150C30 90 60 44 110 44C160 44 190 90 186 150Z" fill="#8b5a3c" stroke="#5e3b25" stroke-width="5"/>` +
    `<path d="M46 60L40 18L82 46Z" fill="#8b5a3c" stroke="#5e3b25" stroke-width="5" stroke-linejoin="round"/><path d="M174 60L180 18L138 46Z" fill="#8b5a3c" stroke="#5e3b25" stroke-width="5" stroke-linejoin="round"/>` +
    `<ellipse cx="110" cy="112" rx="62" ry="46" fill="#f3dcc0"/>` +
    `<circle cx="80" cy="100" r="24" fill="#fff" stroke="#5e3b25" stroke-width="4"/><circle cx="140" cy="100" r="24" fill="#fff" stroke="#5e3b25" stroke-width="4"/>` +
    `<circle cx="84" cy="102" r="12" fill="${INK}"/><circle cx="136" cy="102" r="12" fill="${INK}"/><circle cx="88" cy="97" r="4" fill="#fff"/><circle cx="140" cy="97" r="4" fill="#fff"/>` +
    `<path d="M102 116L110 130L118 116Z" fill="#f5a300" stroke="#b36b00" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="62" cy="130" rx="10" ry="6" fill="#ffb3c8"/><ellipse cx="158" cy="130" rx="10" ry="6" fill="#ffb3c8"/>` +
    `<ellipse cx="46" cy="146" rx="22" ry="12" fill="#8b5a3c" stroke="#5e3b25" stroke-width="4"/><ellipse cx="174" cy="146" rx="22" ry="12" fill="#8b5a3c" stroke="#5e3b25" stroke-width="4"/>`,
);

export const STICKER_ART: Record<string, string> = {
  // 러블리
  "bow-pink": bow("#f7c3d2", "#d98aa0", "#fff"),
  "bow-black": bow("#232326", "#0e0e10", "#6a6a72"),
  "bow-ivory": bow("#fbf3e4", "#c9b48f", "#fff", true),
  cherry,
  strawberry,
  "heart-puffy": heartPuffy,
  "heart-trio": heartTrio,
  "angel-wings": angelWings,
  cloud,
  butterfly,
  daisy,
  rose,
  kiss,
  // Y2K
  "chrome-heart": chromeHeart,
  "chrome-star": chromeStar,
  "sparkle-set": sparkles,
  "pixel-heart": pixelHeart,
  cursor,
  "loading-bar": loadingBar,
  smiley,
  lightning,
  "disco-ball": discoBall(),
  saturn,
  cd,
  "flip-phone": flipPhone,
  "checker-heart": checkerHeart,
  "y2k-star": y2kStar,
  // 볼펜 낙서
  "pen-circle": pen(220, 150, "M30 88C20 40 110 14 172 28C216 40 214 108 150 130C90 148 20 130 22 86C24 58 70 40 122 38"),
  "pen-spiral": pen(140, 140, spiralPath()),
  "pen-underline": pen(240, 56, "M10 32C40 8 60 52 90 28S140 10 170 32S220 42 232 22"),
  "pen-hearts": cut(
    190,
    150,
    [heartPath(10, 50, 80), heartPath(100, 16, 56), heartPath(120, 92, 40)]
      .map((d, i) => `<path d="${d}" stroke="${PEN}" stroke-width="6" fill="none" stroke-linejoin="round" transform="rotate(${[-10, 12, -6][i]} 95 75)"/>`)
      .join(""),
    5,
  ),
  "pen-stars": cut(
    190,
    150,
    [starPath(52, 84, 44, 0.5), starPath(140, 44, 30, 0.5), starPath(150, 120, 20, 0.5)]
      .map((d) => `<path d="${d}" stroke="${PEN}" stroke-width="6" fill="none" stroke-linejoin="round"/>`)
      .join(""),
    5,
  ),
  "pen-crown": pen(
    200,
    130,
    "M20 110L12 30L62 76L100 12L138 76L188 30L180 110Z",
    `<g fill="${PEN}"><circle cx="12" cy="24" r="7"/><circle cx="100" cy="8" r="7"/><circle cx="188" cy="24" r="7"/></g>`,
  ),
  "pen-burst": pen(
    180,
    110,
    [[90, 70, 90, 12], [60, 76, 30, 26], [120, 76, 150, 26], [48, 96, 10, 80], [132, 96, 170, 80]]
      .map(([a, b, c, d]) => `M${a} ${b}L${c} ${d}`)
      .join(""),
  ),
  "pen-arrow": pen(190, 130, "M16 112C60 124 94 92 82 60C70 30 30 50 52 78C74 104 130 100 172 44M150 42L174 42L172 66"),
  // 데코
  "tape-pink": tape("#ffb6cb", tapeDots, "tp"),
  "tape-gingham": tape("#9cc8ff", tapeGingham, "tg"),
  "tape-mint": tape("#9ee6c8", tapeStripe, "tm"),
  "tape-yellow": tape("#ffe08a", "", "ty"),
  ticket,
  "film-piece": filmPiece,
  stamp: stamp(),
  barcode: barcode(),
  "paper-tag": paperTag,
  "owl-peek": owlPeek,
};
