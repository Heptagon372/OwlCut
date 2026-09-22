// AR 스티커 그림 2차 — 조사한 트렌드(SNOW·스냅챗·프리쿠라·한국 포토부스)를 참고해 직접 그린 SVG.
// 귀·후드처럼 기존 그림과 같은 모양의 색 바꿈은 기존과 좌표를 똑같이 맞춰 효과 설정을 공유한다.
import { flower, heartAt, mirrorRow, pixelSvg, sparklePath, starPath, svg } from "@/lib/art/svg";

const INK = "#1f1f22";

// ---------- 기존 모양의 색 바꿈 (좌표 동일: bunny-ears / cat-ears / dog-ears / panda-hood) ----------
function bunnyEars(fill: string, stroke: string, inner: string): string {
  return svg(
    240,
    210,
    `<defs><g id="e"><path d="M-18 0C-34-50-40-140-24-172C-12-196 16-192 20-160C24-120 16-50 16 0Z" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="M-10-12C-22-56-26-128-16-152C-8-170 8-166 10-144C12-110 8-56 6-12Z" fill="${inner}"/></g></defs>` +
      `<use href="#e" transform="translate(80 200) rotate(-14)"/><use href="#e" transform="translate(160 200) scale(-1 1) rotate(-14)"/>`,
  );
}

function catEars(fill: string, stroke: string, inner: string): string {
  return svg(
    260,
    150,
    `<defs><g id="e"><path d="M-44 0Q-30-70-8-118Q0-130 9-114Q30-70 50 0Z" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M-28-8Q-18-56-2-94Q14-54 32-8Z" fill="${inner}"/></g></defs>` +
      `<use href="#e" transform="translate(62 144) rotate(-16)"/><use href="#e" transform="translate(198 144) scale(-1 1) rotate(-16)"/>`,
  );
}

function dogEars(fill: string, stroke: string, inner: string): string {
  return svg(
    420,
    240,
    `<defs><g id="e"><path d="M0 0C-40-6-56 40-52 100C-48 170-30 220 0 226C28 230 44 190 44 140C44 80 36 10 0 0Z" fill="${fill}" stroke="${stroke}" stroke-width="4"/>` +
      `<path d="M-2 30C-26 30-34 70-32 120C-30 170-18 200 0 202C18 204 26 170 26 130C26 84 20 36-2 30Z" fill="${inner}"/></g></defs>` +
      `<use href="#e" transform="translate(64 8) rotate(10)"/><use href="#e" transform="translate(356 8) scale(-1 1) rotate(10)"/>`,
  );
}

// 얼굴 구멍 좌표는 panda-hood 와 같음 (160,200) rx88 ry106
const dinoHood = svg(
  320,
  340,
  `<defs><mask id="m"><rect width="320" height="340" fill="#fff"/><ellipse cx="160" cy="200" rx="88" ry="106" fill="#000"/></mask></defs>` +
    [[70, 58, -34], [112, 34, -14], [160, 26, 0], [208, 34, 14], [250, 58, 34]]
      .map(([x, y, r]) => `<path d="M${x - 20} ${y + 22}L${x} ${y - 22}L${x + 20} ${y + 22}Z" fill="#ffb347" stroke="#d9822b" stroke-width="4" stroke-linejoin="round" transform="rotate(${r} ${x} ${y})"/>`)
      .join("") +
    `<g mask="url(#m)"><ellipse cx="160" cy="190" rx="148" ry="146" fill="#7fd46b" stroke="#4f9e3f" stroke-width="5"/>` +
    `<ellipse cx="160" cy="316" rx="126" ry="24" fill="#6cc25a"/></g>` +
    `<ellipse cx="160" cy="200" rx="88" ry="106" fill="none" stroke="#b9ecaa" stroke-width="7"/>` +
    `<g fill="#5bb54a"><circle cx="40" cy="170" r="10"/><circle cx="286" cy="236" r="12"/><circle cx="54" cy="262" r="8"/></g>`,
);

// ---------- 동물 ----------
const PIXEL_BUNNY = [".kkk.", "kwwwk", "kwpwk", "kwpwk", "kwpwk", "kwpwk", "kwpwk", "kwpwk", "kwpwk", "kwwwk", "kwwwk", "kwwwk"];
const pixelBunnyEars = pixelSvg(
  PIXEL_BUNNY.map((r) => "..." + r + "......" + mirrorRow(r) + "..."),
  { k: INK, w: "#ffffff", p: "#ff9fc0" },
);

const hamsterEars = svg(
  260,
  110,
  `<circle cx="50" cy="60" r="44" fill="#e8b07a" stroke="#b9804d" stroke-width="4"/><circle cx="52" cy="64" r="26" fill="#ffc2cf"/>` +
    `<circle cx="210" cy="60" r="44" fill="#e8b07a" stroke="#b9804d" stroke-width="4"/><circle cx="208" cy="64" r="26" fill="#ffc2cf"/>`,
);

const buckTeeth = svg(
  80,
  60,
  `<path d="M8 4H72V36Q72 56 56 56H24Q8 56 8 36Z" fill="#fff" stroke="${INK}" stroke-width="4"/><path d="M40 4V56" stroke="${INK}" stroke-width="4"/>`,
);

const frogHat = svg(
  300,
  220,
  `<ellipse cx="150" cy="186" rx="146" ry="30" fill="#5fb850" stroke="#3f8a33" stroke-width="5"/>` +
    `<path d="M48 186C44 112 90 76 150 76C210 76 256 112 252 186Z" fill="#7ccf6b" stroke="#3f8a33" stroke-width="5"/>` +
    `<path d="M50 170Q150 150 250 170" stroke="#3f8a33" stroke-width="4" fill="none" opacity=".5"/>` +
    `<circle cx="98" cy="70" r="40" fill="#7ccf6b" stroke="#3f8a33" stroke-width="5"/><circle cx="202" cy="70" r="40" fill="#7ccf6b" stroke="#3f8a33" stroke-width="5"/>` +
    `<circle cx="98" cy="70" r="26" fill="#fff"/><circle cx="202" cy="70" r="26" fill="#fff"/><circle cx="102" cy="74" r="14" fill="${INK}"/><circle cx="198" cy="74" r="14" fill="${INK}"/>` +
    `<circle cx="106" cy="68" r="5" fill="#fff"/><circle cx="202" cy="68" r="5" fill="#fff"/>` +
    `<path d="M122 122Q150 140 178 122" stroke="#3f8a33" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="96" cy="126" rx="12" ry="7" fill="#ff9fb6"/><ellipse cx="204" cy="126" rx="12" ry="7" fill="#ff9fb6"/>`,
);

const chick = svg(
  170,
  160,
  `<path d="M60 150L52 160M60 150L66 160M104 150L96 160M104 150L112 160" stroke="#f08a24" stroke-width="5" stroke-linecap="round"/>` +
    `<ellipse cx="84" cy="100" rx="72" ry="56" fill="#ffd93b" stroke="#e0a800" stroke-width="5"/>` +
    `<path d="M76 46Q70 20 86 16Q84 32 94 42" fill="#ffd93b" stroke="#e0a800" stroke-width="4"/>` +
    `<path d="M30 110Q14 96 22 80Q40 92 44 106Z" fill="#ffc400" stroke="#e0a800" stroke-width="3"/>` +
    `<circle cx="66" cy="86" r="7" fill="${INK}"/><circle cx="104" cy="86" r="7" fill="${INK}"/><circle cx="68" cy="84" r="2.5" fill="#fff"/><circle cx="106" cy="84" r="2.5" fill="#fff"/>` +
    `<path d="M76 98L85 110L94 98Z" fill="#f08a24" stroke="#c96a12" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="50" cy="104" rx="9" ry="5" fill="#ff9fb6"/><ellipse cx="120" cy="104" rx="9" ry="5" fill="#ff9fb6"/>`,
);

const boarEars = svg(
  260,
  120,
  `<defs><path id="e" d="M0 110C-8 70 6 24 40 6C52 44 50 84 36 116Z"/></defs>` +
    `<use href="#e" transform="translate(40 0) rotate(-10)" fill="#8a5a3c" stroke="#5e3b25" stroke-width="4"/>` +
    `<use href="#e" transform="translate(220 0) scale(-1 1) rotate(-10)" fill="#8a5a3c" stroke="#5e3b25" stroke-width="4"/>` +
    `<path d="M48 100C44 70 52 40 70 22" stroke="#d9a07a" stroke-width="10" fill="none" stroke-linecap="round"/>` +
    `<path d="M212 100C216 70 208 40 190 22" stroke="#d9a07a" stroke-width="10" fill="none" stroke-linecap="round"/>`,
);

const boarSnout = svg(
  150,
  120,
  `<path d="M28 78C18 96 16 112 26 116C30 100 36 92 44 86Z" fill="#fffaf0" stroke="#bfae8e" stroke-width="3"/>` +
    `<path d="M122 78C132 96 134 112 124 116C120 100 114 92 106 86Z" fill="#fffaf0" stroke="#bfae8e" stroke-width="3"/>` +
    `<ellipse cx="75" cy="52" rx="58" ry="42" fill="#f4a3a8" stroke="#c9767c" stroke-width="5"/>` +
    `<ellipse cx="54" cy="52" rx="11" ry="16" fill="#8f3f46"/><ellipse cx="96" cy="52" rx="11" ry="16" fill="#8f3f46"/>` +
    `<ellipse cx="60" cy="30" rx="16" ry="6" fill="#fff" opacity=".5"/>`,
);

/** 복슬복슬한 원: 둘레를 바깥으로 볼록한 곡선(구름 모양)으로 이어 털 느낌 */
function fluff(cx: number, cy: number, r: number, fill: string, stroke: string): string {
  const n = 12;
  const pt = (a: number, rr: number) => `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
  let d = `M${pt(0, r)}`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    d += `Q${pt((a0 + a1) / 2, r * 1.2)} ${pt(a1, r)}`;
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>`;
}

const koalaEars = svg(
  340,
  180,
  fluff(64, 90, 62, "#9aa3ad", "#6d7580") + fluff(66, 92, 36, "#eef0f3", "#eef0f3") + fluff(276, 90, 62, "#9aa3ad", "#6d7580") + fluff(274, 92, 36, "#eef0f3", "#eef0f3"),
);

const koalaNose = svg(
  100,
  120,
  `<path d="M50 6C84 6 94 40 90 70C86 100 70 114 50 114C30 114 14 100 10 70C6 40 16 6 50 6Z" fill="#2b2b2e" stroke="#111" stroke-width="3"/>` +
    `<ellipse cx="36" cy="30" rx="10" ry="16" fill="#fff" opacity=".35" transform="rotate(20 36 30)"/>`,
);

const sheepTowel = svg(
  340,
  200,
  `<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd3e0"/><stop offset="1" stop-color="#ffb3c9"/></linearGradient></defs>` +
    `<path d="M40 176C30 110 80 54 170 54C260 54 310 110 300 176C250 150 90 150 40 176Z" fill="url(#t)" stroke="#e08aa4" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M70 140Q170 116 270 140" stroke="#e08aa4" stroke-width="4" fill="none" opacity=".6"/>` +
    [[60, 70], [280, 70]]
      .map(
        ([x, y]) =>
          `<circle cx="${x}" cy="${y}" r="48" fill="url(#t)" stroke="#e08aa4" stroke-width="5"/>` +
          `<path d="M${x} ${y}m-6 0a6 6 0 1 1 12 0a14 14 0 1 1-26 4a24 24 0 1 1 42-10" stroke="#e08aa4" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      )
      .join(""),
);

// ---------- 러블리 ----------
function coquetteBow(fill: string, stroke: string, hi: string, glitter = false): string {
  const loopL = "M100 62C70 20 18 10 14 44C10 76 56 86 100 70Z";
  const tailL = "M92 72C80 100 66 130 50 160L64 154L70 166C84 134 96 104 102 76Z";
  const part = (d: string) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>`;
  const dots = glitter
    ? [[36, 40], [58, 54], [30, 60], [48, 34], [164, 40], [142, 54], [170, 60], [152, 34], [72, 120], [128, 120], [60, 142], [140, 142]]
        .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 3 : 4.5}" fill="${i % 2 ? "#fff" : "#ffd76a"}"/>`)
        .join("") + `<path d="${sparklePath(176, 20, 12)}" fill="#fff"/><path d="${sparklePath(26, 96, 9)}" fill="#fff"/>`
    : "";
  return svg(
    200,
    170,
    `${part(tailL)}<g transform="translate(200 0) scale(-1 1)">${part(tailL)}</g>${part(loopL)}<g transform="translate(200 0) scale(-1 1)">${part(loopL)}</g>` +
      `<path d="M96 64Q62 42 34 48M104 64Q138 42 166 48" stroke="${hi}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>` +
      `<rect x="87" y="48" width="26" height="30" rx="11" fill="${fill}" stroke="${stroke}" stroke-width="4"/>${dots}`,
  );
}

function flowerCrown(): string {
  const items: string[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 24 + t * 292;
    const y = 96 - Math.sin(t * Math.PI) * 58;
    items.push(`<ellipse cx="${x - 14}" cy="${y + 12}" rx="14" ry="7" fill="#79c36a" transform="rotate(${-30 + t * 60} ${x - 14} ${y + 12})"/>`);
  }
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 24 + t * 292;
    const y = 96 - Math.sin(t * Math.PI) * 58;
    const kind = i % 3;
    items.push(
      kind === 0
        ? flower(x, y, 30, "#ffffff", "#ffc933", 7, "#e9e2d6")
        : kind === 1
          ? flower(x, y, 26, "#ffb3c8", "#ff7aa0", 5, "#f58fab")
          : flower(x, y, 22, "#c8b6ff", "#fff3a8", 5, "#a996f2"),
    );
  }
  return svg(340, 130, items.join(""));
}

const HOLO = `<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc1e3"/><stop offset=".35" stop-color="#c7b8ff"/><stop offset=".7" stop-color="#a8e6ff"/><stop offset="1" stop-color="#ffe7a8"/></linearGradient>`;
function butterflyAt(x: number, y: number, s: number, r: number): string {
  const up = "M0 0C-30-60-80-70-82-30C-84 0-40 10 0 4Z";
  const low = "M0 8C-40 12-64 40-50 62C-36 80-6 52 0 14Z";
  return (
    `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><g fill="url(#holo)" stroke="#6a5aa8" stroke-width="4" stroke-linejoin="round">` +
    `<path d="${up}"/><path d="${low}"/><g transform="scale(-1 1)"><path d="${up}"/><path d="${low}"/></g></g>` +
    `<ellipse cx="0" cy="10" rx="6" ry="30" fill="#2b2340"/></g>`
  );
}
const butterflies = svg(300, 220, `<defs>${HOLO}</defs>${butterflyAt(96, 110, 0.9, -14)}${butterflyAt(230, 62, 0.55, 18)}${butterflyAt(238, 176, 0.4, -24)}`);

function freckles(): string {
  const dots: string[] = [];
  // 양 볼 + 콧등, 크기·위치 살짝씩 다르게 (고정값)
  const spots = [
    [70, 60], [86, 48], [96, 70], [62, 84], [110, 56], [80, 94], [104, 88], [120, 76],
    [230, 60], [214, 48], [204, 70], [238, 84], [190, 56], [220, 94], [196, 88], [180, 76],
    [140, 40], [150, 30], [160, 42], [146, 56], [156, 58],
  ];
  spots.forEach(([x, y], i) => dots.push(`<circle cx="${x}" cy="${y}" r="${[3.2, 2.4, 2.8, 2][i % 4]}" fill="#8a5a3b" opacity=".75"/>`));
  return svg(300, 120, dots.join(""));
}

function gem(x: number, y: number, r: number, c: string): string {
  return `<path d="M${x} ${y - r}L${x + r * 0.9} ${y}L${x} ${y + r}L${x - r * 0.9} ${y}Z" fill="${c}" stroke="#fff" stroke-width="2"/><path d="M${x - r * 0.3} ${y - r * 0.3}L${x} ${y - r * 0.6}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
}
const faceGems = svg(
  320,
  110,
  [[40, 40, 9, "#ffd1e8"], [62, 56, 7, "#c9e8ff"], [86, 66, 6, "#ffffff"], [112, 70, 5, "#ffd1e8"]]
    .map(([x, y, r, c]) => gem(x as number, y as number, r as number, c as string) + gem(320 - (x as number), y as number, r as number, c as string))
    .join("") +
    `<path d="${starPath(24, 18, 12, 0.45)}" fill="#fff5b8" stroke="#fff" stroke-width="2"/><path d="${starPath(296, 18, 12, 0.45)}" fill="#fff5b8" stroke="#fff" stroke-width="2"/>`,
);

// ---------- 펀 ----------
const partyHat = svg(
  150,
  200,
  `<defs><clipPath id="c"><path d="M75 20L136 186H14Z"/></clipPath></defs>` +
    `<g clip-path="url(#c)"><rect width="150" height="200" fill="#ff8fc7"/>` +
    [0, 1, 2, 3, 4].map((i) => `<path d="M-20 ${60 + i * 40}L170 ${20 + i * 40}" stroke="#ffe066" stroke-width="16"/>`).join("") +
    `</g><path d="M75 20L136 186H14Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>` +
    `<ellipse cx="75" cy="186" rx="64" ry="10" fill="#7ad3ff" stroke="${INK}" stroke-width="4"/>` +
    `<circle cx="75" cy="18" r="16" fill="#7ad3ff" stroke="${INK}" stroke-width="4"/>` +
    [[20, 40, "#ffe066"], [130, 60, "#ff5f8f"], [12, 110, "#7ad3ff"], [140, 120, "#ffe066"]].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="10" height="5" fill="${c}" transform="rotate(30 ${x} ${y})"/>`).join(""),
);

const headphones = svg(
  400,
  300,
  `<path d="M52 230C40 80 110 20 200 20C290 20 360 80 348 230" stroke="#ff8fc7" stroke-width="24" fill="none" stroke-linecap="round"/>` +
    `<path d="M52 230C40 80 110 20 200 20C290 20 360 80 348 230" stroke="#ffc1de" stroke-width="8" fill="none" stroke-linecap="round" transform="translate(0 -6)"/>` +
    [[40, 240], [360, 240]]
      .map(([x, y]) => `<rect x="${x - 34}" y="${y - 52}" width="68" height="104" rx="30" fill="#ff8fc7" stroke="${INK}" stroke-width="5"/><rect x="${x - 20}" y="${y - 38}" width="40" height="76" rx="18" fill="#ffd9ea"/>`)
      .join("") +
    `<path d="${heartAt(40, 240, 22)}" fill="#ff5f8f"/><path d="${heartAt(360, 240, 22)}" fill="#ff5f8f"/>`,
);

const heartGlasses = svg(
  270,
  120,
  `<defs><linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7aa6"/><stop offset="1" stop-color="#e0115f"/></linearGradient></defs>` +
    `<path d="${heartAt(72, 60, 118)}" fill="url(#hl)" stroke="${INK}" stroke-width="6"/><path d="${heartAt(198, 60, 118)}" fill="url(#hl)" stroke="${INK}" stroke-width="6"/>` +
    `<path d="M124 44Q135 34 146 44" stroke="${INK}" stroke-width="6" fill="none"/><path d="M16 40L2 34M254 40L268 34" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
    `<ellipse cx="46" cy="42" rx="12" ry="7" fill="#fff" opacity=".7" transform="rotate(-30 46 42)"/><ellipse cx="172" cy="42" rx="12" ry="7" fill="#fff" opacity=".7" transform="rotate(-30 172 42)"/>`,
);

const mushroomCap = svg(
  300,
  180,
  `<path d="M14 150C14 60 80 10 150 10C220 10 286 60 286 150Q150 176 14 150Z" fill="#e5383b" stroke="#a4161a" stroke-width="5" stroke-linejoin="round"/>` +
    [[80, 60, 20], [150, 40, 16], [220, 64, 22], [120, 110, 18], [196, 118, 14], [52, 118, 12], [258, 124, 10]]
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="#fff"/>`)
      .join("") +
    `<path d="M40 148Q150 164 260 148" stroke="#fff1e6" stroke-width="8" fill="none" stroke-linecap="round" opacity=".6"/>`,
);

const mustache = svg(
  200,
  70,
  `<path d="M100 22C86 6 60 6 46 20C34 32 20 36 6 26C8 48 30 60 54 54C74 50 88 40 100 34C112 40 126 50 146 54C170 60 192 48 194 26C180 36 166 32 154 20C140 6 114 6 100 22Z" fill="${INK}"/>`,
);

function antler(): string {
  return `<path d="M0 0C-6-40-4-80 12-118M4-40C-20-54-30-72-28-96M8-76C24-90 30-108 28-128M12-118C4-130 2-142 6-156" stroke="#8b5a3c" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const antlers = svg(320, 170, `<g transform="translate(96 166) rotate(-14)">${antler()}</g><g transform="translate(224 166) scale(-1 1) rotate(-14)">${antler()}</g>`);

const redNose = svg(
  80,
  80,
  `<defs><radialGradient id="rn" cx=".35" cy=".3"><stop offset="0" stop-color="#ff7a7a"/><stop offset="1" stop-color="#c8102e"/></radialGradient></defs>` +
    `<circle cx="40" cy="40" r="36" fill="url(#rn)" stroke="#8f0b20" stroke-width="3"/><ellipse cx="28" cy="26" rx="10" ry="6" fill="#fff" opacity=".7" transform="rotate(-30 28 26)"/>`,
);

const catMouth = svg(
  140,
  70,
  `<path d="M70 14V24M70 24Q58 44 44 30M70 24Q82 44 96 30" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M62 6H78Q82 6 78 11L72 16Q70 18 68 16L62 11Q58 6 62 6Z" fill="#ff8fab"/>` +
    `<g fill="${INK}"><circle cx="16" cy="30" r="3.5"/><circle cx="24" cy="42" r="3.5"/><circle cx="12" cy="46" r="3.5"/><circle cx="124" cy="30" r="3.5"/><circle cx="116" cy="42" r="3.5"/><circle cx="128" cy="46" r="3.5"/></g>`,
);

function stickerBomb(): string {
  // 얼굴 둘레·볼 쪽에만 흩뿌림 (눈·입 자리는 비움)
  const items: [number, number, "h" | "s" | "p", string, number][] = [
    [60, 70, "h", "#ff5f8f", 36], [300, 64, "s", "#ffd84a", 30], [40, 190, "p", "#fff", 28], [322, 196, "h", "#ff9ad5", 30],
    [84, 262, "s", "#7ad3ff", 26], [280, 270, "p", "#fff", 24], [180, 26, "h", "#ff5f8f", 26], [120, 318, "h", "#ffb3c8", 22],
    [250, 324, "s", "#ffd84a", 22], [18, 120, "s", "#c7a6ff", 20], [344, 128, "p", "#fff", 20], [98, 214, "h", "#ff7aa6", 18],
    [262, 214, "h", "#ff7aa6", 18],
  ];
  return svg(
    360,
    360,
    items
      .map(([x, y, k, c, s]) =>
        k === "h"
          ? `<path d="${heartAt(x, y, s)}" fill="${c}" stroke="#fff" stroke-width="3"/>`
          : k === "s"
            ? `<path d="${starPath(x, y, s / 2, 0.45)}" fill="${c}" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>`
            : `<path d="${sparklePath(x, y, s / 2)}" fill="${c}" stroke="#c7d0ff" stroke-width="2"/>`,
      )
      .join(""),
  );
}

export const MORE_ASSETS: Record<string, string> = {
  // 동물
  "white-dog-ears": dogEars("#fbf7f2", "#b9b2aa", "#f4d9d2"),
  "yellow-cat-ears": catEars("#f5c542", "#c9961c", "#ffd9a8"),
  "white-cat-ears": catEars("#ffffff", "#cfc6cc", "#ffb3c7"),
  "pink-bunny-ears": bunnyEars("#ffc2d6", "#e889a8", "#fff0f5"),
  "pixel-bunny-ears": pixelBunnyEars,
  "hamster-ears": hamsterEars,
  "buck-teeth": buckTeeth,
  "frog-hat": frogHat,
  chick,
  "boar-ears": boarEars,
  "boar-snout": boarSnout,
  "koala-ears": koalaEars,
  "koala-nose": koalaNose,
  "dino-hood": dinoHood,
  "sheep-towel": sheepTowel,
  // 러블리
  "flower-crown": flowerCrown(),
  "black-bow": coquetteBow("#232326", "#0e0e10", "#6a6a72"),
  "glitter-bow": coquetteBow("#e5383b", "#a4161a", "#ffb3b3", true),
  butterflies,
  freckles: freckles(),
  "face-gems": faceGems,
  // 펀
  "party-hat": partyHat,
  headphones,
  "heart-glasses": heartGlasses,
  "mushroom-cap": mushroomCap,
  mustache,
  antlers,
  "red-nose": redNose,
  "cat-mouth": catMouth,
  "sticker-bomb": stickerBomb(),
};
