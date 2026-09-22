// AR 스티커 그림 — 전부 직접 그린 SVG (외부 저작물 사용 안 함). 벡터라 얼굴 크기에 맞춰 선명하게 확대된다.
// 각 그림의 "중심"이 배치 기준점. 크기·위치 조정은 lib/ar/effects.ts 에서.

const svg = (w: number, h: number, body: string, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}"${extra}>${body}</svg>`;

// 도트 그림: 문자 지도 → 1x1 사각형
function pixelSvg(rows: string[], colors: Record<string, string>): string {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  let body = "";
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (colors[c]) body += `<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${colors[c]}"/>`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 16}" height="${h * 16}" shape-rendering="crispEdges">${body}</svg>`;
}

const mirrorRow = (r: string) => [...r].reverse().join("");

function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

const sparklePath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy - s}Q${cx + s * 0.16} ${cy - s * 0.16} ${cx + s} ${cy}Q${cx + s * 0.16} ${cy + s * 0.16} ${cx} ${cy + s}` +
  `Q${cx - s * 0.16} ${cy + s * 0.16} ${cx - s} ${cy}Q${cx - s * 0.16} ${cy - s * 0.16} ${cx} ${cy - s}Z`;

const heartPath = (x: number, y: number, s: number) =>
  `M${x} ${y + s * 0.3}C${x} ${y - s * 0.1} ${x + s * 0.45} ${y - s * 0.15} ${x + s * 0.5} ${y + s * 0.2}` +
  `C${x + s * 0.55} ${y - s * 0.15} ${x + s} ${y - s * 0.1} ${x + s} ${y + s * 0.3}` +
  `C${x + s} ${y + s * 0.6} ${x + s * 0.5} ${y + s * 0.9} ${x + s * 0.5} ${y + s * 0.9}` +
  `C${x + s * 0.5} ${y + s * 0.9} ${x} ${y + s * 0.6} ${x} ${y + s * 0.3}Z`;

// ---------- 도트 고양이 ----------
const PIXEL_EAR = ["k.........", "kk........", "kpk.......", "kppk......", "kpppk.....", "kppppk....", "kpwwppk...", "kwwwwwwk..", "kkkkkkkkk."];
const pixelCatEars = pixelSvg(
  PIXEL_EAR.map((r) => r + ".".repeat(20) + mirrorRow(r)),
  { k: "#1f1f22", p: "#ff9fc0", w: "#ffffff" },
);
// 왼쪽 절반만 그리고 좌우 대칭 — 1픽셀 수염 3가닥 + 분홍 코 + ω 입
const pixelWhiskers = pixelSvg(
  [
    "kkkkkk................",
    "......kkkk.........ppp",
    "kkkkkkkkkk..........pp",
    "......kkkk...........k",
    "kkkkkk.........k.....k",
    "................kkkkk.",
  ].map((r) => r + mirrorRow(r)),
  { k: "#1f1f22", p: "#ff8fab" },
);

// ---------- 별 무리 (얼굴 둘레) ----------
const STAR_ITEMS: [number, number, number, string][] = [
  [42, 64, 20, "#ffd84a"], [356, 54, 17, "#ff9ad5"], [22, 200, 15, "#c7a6ff"], [378, 196, 19, "#ffd84a"],
  [58, 332, 17, "#ff9ad5"], [344, 334, 15, "#c7a6ff"], [200, 16, 14, "#ffffff"],
];
const SPARKLE_ITEMS: [number, number, number][] = [[112, 26, 12], [300, 118, 10], [92, 146, 9], [322, 262, 11], [74, 262, 8], [286, 22, 9]];
const starsCluster = svg(
  400,
  380,
  STAR_ITEMS.map(([x, y, r, c]) => `<path d="${starPath(x, y, r)}" fill="${c}" stroke="#3b2f5c" stroke-width="2.5" stroke-linejoin="round"/>`).join("") +
    SPARKLE_ITEMS.map(([x, y, s]) => `<path d="${sparklePath(x, y, s)}" fill="#fff" stroke="#b9a6ff" stroke-width="1.5"/>`).join(""),
);

// ---------- 뽀글 머리: 얼굴 구멍을 뚫은 곱슬 덩어리 ----------
function afroSvg(): string {
  const curls: string[] = [];
  const ring = (rx: number, ry: number, from: number, to: number, n: number, r: number, cy: number) => {
    for (let i = 0; i <= n; i++) {
      const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
      const x = 180 + rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      curls.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#2a1c14" stroke="#4d3526" stroke-width="5"/>`);
    }
  };
  ring(150, 158, 150, 390, 22, 38, 190);
  ring(104, 112, 190, 350, 10, 34, 180);
  return svg(
    360,
    380,
    `<defs><mask id="m"><rect width="360" height="380" fill="#fff"/><ellipse cx="180" cy="235" rx="100" ry="122" fill="#000"/></mask></defs>` +
      `<g mask="url(#m)"><ellipse cx="180" cy="178" rx="150" ry="150" fill="#2a1c14"/>${curls.join("")}</g>`,
  );
}

export const ASSETS: Record<string, string> = {
  // ----- 동물 -----
  "bunny-ears": svg(
    240,
    210,
    `<defs><g id="e"><path d="M-18 0C-34-50-40-140-24-172C-12-196 16-192 20-160C24-120 16-50 16 0Z" fill="#fff" stroke="#e5d9df" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="M-10-12C-22-56-26-128-16-152C-8-170 8-166 10-144C12-110 8-56 6-12Z" fill="#ffc2d3"/></g></defs>` +
      `<use href="#e" transform="translate(80 200) rotate(-14)"/><use href="#e" transform="translate(160 200) scale(-1 1) rotate(-14)"/>`,
  ),
  "pink-nose": svg(60, 44, `<path d="M8 8Q30 2 52 8Q57 12 50 18L34 36Q30 40 26 36L10 18Q3 12 8 8Z" fill="#ff8fab"/><ellipse cx="24" cy="12" rx="7" ry="3" fill="#fff" opacity=".6"/>`),
  blush: svg(
    100,
    60,
    `<defs><radialGradient id="g"><stop offset="0" stop-color="#ff6f94" stop-opacity=".55"/><stop offset=".6" stop-color="#ff8aa8" stop-opacity=".28"/><stop offset="1" stop-color="#ff9fb6" stop-opacity="0"/></radialGradient></defs><ellipse cx="50" cy="30" rx="50" ry="30" fill="url(#g)"/>`,
  ),
  "cat-ears": svg(
    260,
    150,
    `<defs><g id="e"><path d="M-44 0Q-30-70-8-118Q0-130 9-114Q30-70 50 0Z" fill="#2b2b2e" stroke="#18181a" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M-28-8Q-18-56-2-94Q14-54 32-8Z" fill="#ffb3c7"/></g></defs>` +
      `<use href="#e" transform="translate(62 144) rotate(-16)"/><use href="#e" transform="translate(198 144) scale(-1 1) rotate(-16)"/>`,
  ),
  "fox-ears": svg(
    260,
    170,
    `<defs><g id="e"><path d="M-46 0Q-34-80-8-140Q0-154 10-138Q34-80 52 0Z" fill="#f2893a" stroke="#c9651f" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M-28-8Q-18-64-2-110Q16-62 34-8Z" fill="#fff4ea"/><path d="M-8-118Q0-134 10-120L4-104Z" fill="#3b2418"/></g></defs>` +
      `<use href="#e" transform="translate(60 164) rotate(-14)"/><use href="#e" transform="translate(200 164) scale(-1 1) rotate(-14)"/>`,
  ),
  whiskers: svg(
    280,
    110,
    `<g stroke="#2b2b2e" stroke-width="4" stroke-linecap="round" fill="none">` +
      `<path d="M104 50Q60 38 10 28"/><path d="M104 60Q56 58 6 62"/><path d="M104 70Q60 78 14 96"/>` +
      `<path d="M176 50Q220 38 270 28"/><path d="M176 60Q224 58 274 62"/><path d="M176 70Q220 78 266 96"/>` +
      `<path d="M140 60v10M140 70q-8 8-16 2M140 70q8 8 16 2"/></g>` +
      `<path d="M127 44h26q5 0 1 5l-10 11q-4 4-8 0l-10-11q-4-5 1-5z" fill="#ff8fab" stroke="#2b2b2e" stroke-width="2.5"/>`,
  ),
  "dog-ears": svg(
    420,
    240,
    `<defs><g id="e"><path d="M0 0C-40-6-56 40-52 100C-48 170-30 220 0 226C28 230 44 190 44 140C44 80 36 10 0 0Z" fill="#8b5a3c" stroke="#6e452d" stroke-width="4"/>` +
      `<path d="M-2 30C-26 30-34 70-32 120C-30 170-18 200 0 202C18 204 26 170 26 130C26 84 20 36-2 30Z" fill="#b98a63"/></g></defs>` +
      `<use href="#e" transform="translate(64 8) rotate(10)"/><use href="#e" transform="translate(356 8) scale(-1 1) rotate(10)"/>`,
  ),
  "dog-nose": svg(
    120,
    100,
    `<ellipse cx="60" cy="28" rx="30" ry="20" fill="#2b2b2e"/><ellipse cx="50" cy="20" rx="9" ry="5" fill="#fff" opacity=".55"/>` +
      `<path d="M60 48v14M60 62q-12 12-24 4M60 62q12 12 24 4" stroke="#2b2b2e" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `<path d="M50 70q10 28 20 0z" fill="#ff7a90"/>`,
  ),
  "button-nose": svg(60, 44, `<ellipse cx="30" cy="22" rx="24" ry="17" fill="#2b2b2e"/><ellipse cx="22" cy="15" rx="7" ry="4" fill="#fff" opacity=".5"/>`),
  "bear-ears": svg(
    280,
    120,
    `<circle cx="52" cy="62" r="46" fill="#8b5a3c" stroke="#6e452d" stroke-width="4"/><circle cx="52" cy="66" r="25" fill="#d9a77c"/>` +
      `<circle cx="228" cy="62" r="46" fill="#8b5a3c" stroke="#6e452d" stroke-width="4"/><circle cx="228" cy="66" r="25" fill="#d9a77c"/>`,
  ),
  "mouse-ears": svg(
    300,
    160,
    `<circle cx="64" cy="80" r="60" fill="#c9c3cf" stroke="#a49dab" stroke-width="4"/><circle cx="68" cy="84" r="38" fill="#ffb3c7"/>` +
      `<circle cx="236" cy="80" r="60" fill="#c9c3cf" stroke="#a49dab" stroke-width="4"/><circle cx="232" cy="84" r="38" fill="#ffb3c7"/>`,
  ),
  "pixel-cat-ears": pixelCatEars,
  "pixel-whiskers": pixelWhiskers,
  "panda-hood": svg(
    320,
    340,
    `<defs><mask id="m"><rect width="320" height="340" fill="#fff"/><ellipse cx="160" cy="200" rx="88" ry="106" fill="#000"/></mask></defs>` +
      `<circle cx="58" cy="66" r="44" fill="#1f1f22"/><circle cx="262" cy="66" r="44" fill="#1f1f22"/>` +
      `<g mask="url(#m)"><ellipse cx="160" cy="190" rx="148" ry="146" fill="#fff" stroke="#dcdce0" stroke-width="5"/>` +
      `<ellipse cx="160" cy="316" rx="126" ry="24" fill="#ececef"/></g>` +
      `<ellipse cx="160" cy="200" rx="88" ry="106" fill="none" stroke="#e1e1e5" stroke-width="6"/>` +
      `<path d="${starPath(28, 170, 11)}" fill="#1f1f22"/><path d="${starPath(296, 250, 10)}" fill="#1f1f22"/>`,
  ),

  // ----- 러블리 -----
  "red-bow": svg(
    220,
    140,
    `<path d="M110 62C80 20 20 0 12 40C6 72 40 100 110 74Z" fill="#e5383b" stroke="#b3202a" stroke-width="3"/>` +
      `<path d="M110 62C140 20 200 0 208 40C214 72 180 100 110 74Z" fill="#e5383b" stroke="#b3202a" stroke-width="3"/>` +
      `<path d="M100 74L80 132L95 126L104 138L110 80Z" fill="#d42b31"/><path d="M120 74L140 132L125 126L116 138L110 80Z" fill="#d42b31"/>` +
      `<rect x="96" y="52" width="28" height="32" rx="10" fill="#c1272d" stroke="#9e1b22" stroke-width="2"/>` +
      `<g fill="#fff" opacity=".9"><circle cx="40" cy="36" r="4"/><circle cx="62" cy="52" r="3"/><circle cx="36" cy="62" r="3"/><circle cx="178" cy="34" r="4"/><circle cx="160" cy="54" r="3"/><circle cx="186" cy="62" r="3"/></g>` +
      `<path d="${sparklePath(196, 14, 9)}" fill="#fff"/>`,
  ),
  "pink-bow": svg(
    140,
    92,
    `<path d="M70 44C50 12 10 4 8 30C6 56 40 70 70 52Z" fill="#ffb3cb" stroke="#ef86a8" stroke-width="3"/>` +
      `<path d="M70 44C90 12 130 4 132 30C134 56 100 70 70 52Z" fill="#ffb3cb" stroke="#ef86a8" stroke-width="3"/>` +
      `<path d="M64 54L50 88L60 84L66 92L70 58Z" fill="#ff9dbd"/><path d="M76 54L90 88L80 84L74 92L70 58Z" fill="#ff9dbd"/>` +
      `<rect x="62" y="34" width="16" height="22" rx="6" fill="#ff8fb3" stroke="#ef86a8" stroke-width="2"/>`,
  ),
  "blue-ribbon": svg(
    120,
    280,
    `<path d="M60 44C44 10 12 8 12 30C12 50 36 58 60 50Z" fill="#a9d0ff" stroke="#6fa6e8" stroke-width="3"/>` +
      `<path d="M60 44C76 10 108 8 108 30C108 50 84 58 60 50Z" fill="#a9d0ff" stroke="#6fa6e8" stroke-width="3"/>` +
      `<path d="M56 50C40 110 60 160 40 220C34 240 30 260 24 276L36 272L40 280C50 250 58 220 64 190C70 150 62 100 62 52Z" fill="#b8d8ff" stroke="#6fa6e8" stroke-width="2.5"/>` +
      `<path d="M64 50C80 110 60 160 80 220C86 240 90 260 96 276L84 272L80 280C70 250 62 220 56 190C50 150 58 100 58 52Z" fill="#b8d8ff" stroke="#6fa6e8" stroke-width="2.5"/>` +
      `<rect x="52" y="36" width="16" height="18" rx="6" fill="#8fc0ff" stroke="#6fa6e8" stroke-width="2"/>`,
  ),
  "heart-blush": svg(
    120,
    80,
    `<defs><radialGradient id="g"><stop offset="0" stop-color="#ff6f94" stop-opacity=".6"/><stop offset="1" stop-color="#ff9fb6" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="58" cy="46" rx="50" ry="30" fill="url(#g)"/>` +
      `<path d="M40 36l-7 16M54 36l-7 16M68 36l-7 16" stroke="#ff5c86" stroke-width="3.5" stroke-linecap="round"/>` +
      `<path d="${heartPath(90, 4, 24)}" fill="#ff4f7b"/><path d="${heartPath(4, 10, 14)}" fill="#ff86a6"/>`,
  ),
  strawberry: svg(
    80,
    92,
    `<path d="M40 88C18 76 6 52 10 36C14 22 30 22 40 26C50 22 66 22 70 36C74 52 62 76 40 88Z" fill="#ff4b5c" stroke="#d7263d" stroke-width="2.5"/>` +
      `<g fill="#ffe08a"><ellipse cx="28" cy="42" rx="2.2" ry="3.2"/><ellipse cx="44" cy="40" rx="2.2" ry="3.2"/><ellipse cx="58" cy="44" rx="2.2" ry="3.2"/><ellipse cx="34" cy="56" rx="2.2" ry="3.2"/><ellipse cx="50" cy="58" rx="2.2" ry="3.2"/><ellipse cx="42" cy="72" rx="2.2" ry="3.2"/><ellipse cx="24" cy="54" rx="2" ry="3"/><ellipse cx="60" cy="58" rx="2" ry="3"/></g>` +
      `<path d="M40 30L27 18L36 21L32 8L40 17L48 8L44 21L53 18Z" fill="#4caf50" stroke="#2e7d32" stroke-width="2" stroke-linejoin="round"/>`,
  ),
  crown: svg(
    220,
    150,
    `<path d="M22 128L10 40L62 86L110 16L158 86L210 40L198 128Z" fill="#f5c542" stroke="#c9961c" stroke-width="5" stroke-linejoin="round"/>` +
      `<rect x="20" y="116" width="180" height="24" rx="7" fill="#e9b52f" stroke="#c9961c" stroke-width="4"/>` +
      `<circle cx="10" cy="40" r="9" fill="#f5c542" stroke="#c9961c" stroke-width="3"/><circle cx="110" cy="16" r="10" fill="#f5c542" stroke="#c9961c" stroke-width="3"/><circle cx="210" cy="40" r="9" fill="#f5c542" stroke="#c9961c" stroke-width="3"/>` +
      `<circle cx="110" cy="92" r="13" fill="#e5383b" stroke="#a31621" stroke-width="3"/><circle cx="58" cy="104" r="8" fill="#4ea8ff" stroke="#1f6fbf" stroke-width="2"/><circle cx="162" cy="104" r="8" fill="#4ea8ff" stroke="#1f6fbf" stroke-width="2"/>` +
      `<path d="${sparklePath(84, 60, 8)}" fill="#fff"/>`,
  ),
  halo: svg(
    220,
    80,
    `<ellipse cx="110" cy="40" rx="94" ry="24" fill="none" stroke="#fff4b0" stroke-width="18" opacity=".55"/>` +
      `<ellipse cx="110" cy="40" rx="94" ry="24" fill="none" stroke="#ffd84a" stroke-width="8"/>` +
      `<ellipse cx="110" cy="40" rx="94" ry="24" fill="none" stroke="#fff" stroke-width="2" opacity=".8"/>`,
  ),
  hibiscus: svg(
    160,
    160,
    `<defs><radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#9e0f1c"/><stop offset=".35" stop-color="#e8323c"/><stop offset="1" stop-color="#ff5a5f"/></radialGradient>` +
      `<ellipse id="p" cx="80" cy="42" rx="30" ry="40"/></defs>` +
      [0, 72, 144, 216, 288].map((a) => `<use href="#p" transform="rotate(${a} 80 80)" fill="url(#g)" stroke="#b3121c" stroke-width="2"/>`).join("") +
      `<circle cx="80" cy="80" r="14" fill="#8e0d18"/><path d="M80 80L118 42" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>` +
      `<g fill="#ffd166"><circle cx="112" cy="46" r="4"/><circle cx="118" cy="40" r="4"/><circle cx="106" cy="40" r="3.5"/><circle cx="120" cy="50" r="3.5"/></g>`,
  ),
  stars: starsCluster,

  // ----- 펀 -----
  groucho: svg(
    260,
    230,
    `<g stroke="#1d1d1f" stroke-linecap="round" fill="none"><path d="M30 42Q78 10 122 38" stroke-width="18"/><path d="M230 42Q182 10 138 38" stroke-width="18"/>` +
      `<circle cx="78" cy="84" r="38" stroke-width="7" fill="#fff" fill-opacity=".12"/><circle cx="182" cy="84" r="38" stroke-width="7" fill="#fff" fill-opacity=".12"/>` +
      `<path d="M116 80Q130 70 144 80" stroke-width="6"/><path d="M40 80L6 72M220 80L254 72" stroke-width="6"/></g>` +
      `<path d="M130 88C112 120 102 150 108 168C114 188 146 188 152 168C158 150 148 120 130 88Z" fill="#f2b8a0" stroke="#c98a70" stroke-width="3"/>` +
      `<ellipse cx="120" cy="170" rx="6" ry="4" fill="#b87561"/><ellipse cx="140" cy="170" rx="6" ry="4" fill="#b87561"/>` +
      `<path d="M58 208C80 178 116 180 130 196C144 180 180 178 202 208C180 196 160 206 130 208C100 206 80 196 58 208Z" fill="#1d1d1f"/>`,
  ),
  "round-glasses": svg(
    260,
    110,
    `<g stroke="#1f1f22" stroke-width="7" fill="#fff" fill-opacity=".08"><circle cx="74" cy="56" r="42"/><circle cx="186" cy="56" r="42"/></g>` +
      `<g stroke="#1f1f22" stroke-width="6" fill="none" stroke-linecap="round"><path d="M116 52Q130 42 144 52"/><path d="M32 50L4 44M228 50L256 44"/></g>` +
      `<path d="M52 36Q60 28 72 28" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/><path d="M164 36Q172 28 184 28" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`,
  ),
  sunglasses: svg(
    270,
    110,
    `<defs><linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1b24"/><stop offset="1" stop-color="#3d3d58"/></linearGradient>` +
      `<path id="s" d="M20 30H118Q125 30 123 40L114 76Q108 96 84 96H58Q30 96 24 72L16 40Q14 30 20 30Z"/></defs>` +
      `<use href="#s" fill="url(#l)" stroke="#0f0f14" stroke-width="5"/><use href="#s" transform="translate(270 0) scale(-1 1)" fill="url(#l)" stroke="#0f0f14" stroke-width="5"/>` +
      `<path d="M118 38Q135 28 152 38" stroke="#0f0f14" stroke-width="7" fill="none"/><path d="M18 34L2 30M252 34L268 30" stroke="#0f0f14" stroke-width="6"/>` +
      `<path d="M36 44L60 44L44 76L30 76Z" fill="#fff" opacity=".18"/><path d="M168 44L192 44L176 76L162 76Z" fill="#fff" opacity=".18"/>`,
  ),
  "devil-horns": svg(
    240,
    110,
    `<defs><linearGradient id="h" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b3121c"/><stop offset="1" stop-color="#ff4d4d"/></linearGradient>` +
      `<path id="k" d="M52 108C38 80 38 36 66 8C62 40 74 76 98 104Z"/></defs>` +
      `<use href="#k" fill="url(#h)" stroke="#7a0a12" stroke-width="3"/><use href="#k" transform="translate(240 0) scale(-1 1)" fill="url(#h)" stroke="#7a0a12" stroke-width="3"/>`,
  ),
  afro: afroSvg(),
};

// ---------- 브라우저에서 이미지로 로드 (캐시) ----------
const cache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

export function assetUrl(id: string): string | null {
  const s = ASSETS[id];
  return s ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}` : null;
}

/** 로드된 그림 (없으면 null — 그리기 루프에서 동기로 사용) */
export function getAsset(id: string): HTMLImageElement | null {
  return cache.get(id) ?? null;
}

export function loadAsset(id: string): Promise<HTMLImageElement | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const url = assetUrl(id);
  if (!url || typeof Image === "undefined") return Promise.resolve(null);
  const p = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(id, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
  pending.set(id, p);
  return p;
}

export async function ensureAssets(ids: string[]): Promise<void> {
  await Promise.all([...new Set(ids)].map(loadAsset));
}
