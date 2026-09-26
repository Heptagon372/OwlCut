// Doodle Icons(CC0) 일부를 낙서 스티커로 가져온다 → lib/stickers/doodles.ts 생성.
//   원작: Khushmeen Sidhu, https://khushmeen.com/icons.html — "Free icons for commercial and personal use
//   under CC0 license - no attribution required" (2026-09-23 확인). 저장소: github.com/theJian/doodle-icons
// 스티커처럼 보이게: 선 색을 바꾸고, 흰 테두리(다이컷)를 아래에 깐다 → 어두운 사진 위에서도 보임.
// 실행: node scripts/import-doodle-icons.mjs   (네트워크 필요, 결과 파일을 커밋)
import { writeFileSync } from "node:fs";

const BASE = "https://raw.githubusercontent.com/theJian/doodle-icons/main/icons";
const INK = "#1b1b1f";
const PEN = "#2f5bea"; // 볼펜 파랑 (낙서 화살표)

// [원본 경로, 스티커 id, 이름, 영어 이름, 색]
const PICKS = [
  ["emojis/heart-eyes-emoji", "dd-heart-eyes", "하트 눈 얼굴", "Heart eyes", INK],
  ["emojis/cool-emoji", "dd-cool", "선글라스 얼굴", "Sunglasses face", INK],
  ["emojis/laugh-emoji", "dd-laugh", "웃는 얼굴", "Laughing face", INK],
  ["emojis/wink-emoji", "dd-wink", "윙크 얼굴", "Winking face", INK],
  ["emojis/grinning-squinting-emoji", "dd-grin", "신난 얼굴", "Excited face", INK],
  ["emojis/shocked-emoji", "dd-shocked", "놀란 얼굴", "Shocked face", INK],
  ["emojis/crying-emoji", "dd-crying", "우는 얼굴", "Crying face", INK],
  ["hand-gestures/v", "dd-v", "브이", "Peace hand", INK],
  ["hand-gestures/ok", "dd-ok", "오케이", "OK hand", INK],
  ["hand-gestures/thumbs-up", "dd-thumbs-up", "최고 손", "Thumbs up", INK],
  ["hand-gestures/clap", "dd-clap", "박수", "Clapping", INK],
  ["objects/crown", "dd-crown", "낙서 왕관", "Doodle crown", INK],
  ["objects/balloon", "dd-balloon", "풍선", "Balloon", INK],
  ["objects/camera", "dd-camera", "카메라", "Camera", INK],
  ["food/cake", "dd-cake", "케이크", "Cake", INK],
  ["food/ice-cream", "dd-ice-cream", "아이스크림", "Ice cream", INK],
  ["food/candy", "dd-candy", "사탕", "Candy", INK],
  ["interface/heart", "dd-heart", "낙서 하트", "Doodle heart", "#ff4f8b"],
  ["interface/star", "dd-star", "낙서 별", "Doodle star", "#f5a300"],
  ["interface/zap", "dd-zap", "번개", "Lightning", "#f5a300"],
  ["interface/music-2", "dd-music", "음표", "Music note", INK],
  ["interface/magic-wand", "dd-magic", "요술봉", "Magic wand", INK],
  ["interface/gift", "dd-gift", "선물", "Gift", INK],
  ["weather/sunny", "dd-sun", "해", "Sun", "#f5a300"],
  ["weather/night", "dd-moon", "달", "Moon", INK],
  ["weather/cloudy-day", "dd-cloud-sun", "구름과 해", "Sun and cloud", INK],
  ["misc/rocket", "dd-rocket", "로켓", "Rocket", INK],
  ["misc/fire", "dd-fire", "불꽃", "Fire", "#ff5a1f"],
  ["arrows/arrow-ne", "dd-arrow-ne", "화살표 ↗", "Arrow NE", PEN],
  ["arrows/arrow-nw", "dd-arrow-nw", "화살표 ↖", "Arrow NW", PEN],
  ["arrows/arrow-se", "dd-arrow-se", "화살표 ↘", "Arrow SE", PEN],
  ["arrows/arrow-sw", "dd-arrow-sw", "화살표 ↙", "Arrow SW", PEN],
];

function toSticker(raw, color) {
  const vb = /viewBox="([\d.\s-]+)"/.exec(raw)?.[1].trim().split(/\s+/).map(Number);
  if (!vb || vb.length !== 4) throw new Error("viewBox 없음");
  const [, , w, h] = vb;
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<defs>[\s\S]*?<\/defs>/g, "") // 원본 경계 clipPath 는 테두리를 잘라 버리므로 뺀다
    .replace(/\s*clip-path="[^"]*"/g, "")
    .replace(/\n/g, "")
    .replace(/-?\d+\.\d{2,}/g, (n) => String(Math.round(Number(n) * 10) / 10)) // 소수 한 자리면 스티커 크기에서 차이 없음
    .trim();
  const pad = Math.round(Math.max(w, h) * 0.08);
  const outline = inner.replace(/fill="(black|#000000|#000)"/g, 'fill="#ffffff"');
  const top = inner.replace(/fill="(black|#000000|#000)"/g, `fill="${color}"`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}" width="${(w + pad * 2) * 2}" height="${(h + pad * 2) * 2}">` +
    `<g stroke="#ffffff" stroke-width="${pad * 1.4}" stroke-linejoin="round" stroke-linecap="round">${outline}</g>${top}</svg>`
  );
}

const out = {};
const defs = [];
for (const [path, id, label, labelEn, color] of PICKS) {
  const res = await fetch(`${BASE}/${path}.svg`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  out[id] = toSticker(await res.text(), color);
  defs.push({ id, label, labelEn, category: "doodle" });
  process.stdout.write(".");
}

const header = `// 자동 생성: node scripts/import-doodle-icons.mjs — 직접 고치지 말 것.
// Doodle Icons by Khushmeen Sidhu (https://khushmeen.com/icons.html), CC0 1.0 — 상업적 사용 가능, 출처 표기 의무 없음.
// 가져온 저장소: https://github.com/theJian/doodle-icons (icons: CC0 1.0). 색을 바꾸고 흰 테두리를 더했다.
`;
// 그림(큼)은 필요할 때만 불러오는 모듈로, 목록(작음)은 레지스트리가 읽는 JSON 으로
writeFileSync(
  new URL("../lib/stickers/doodles.ts", import.meta.url),
  `${header}\nexport const DOODLE_ART: Record<string, string> = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n  "')};\n`,
);
writeFileSync(new URL("../data/stickers/doodles.json", import.meta.url), JSON.stringify(defs, null, 2) + "\n");
console.log(`\n${PICKS.length}개 → lib/stickers/doodles.ts, data/stickers/doodles.json`);
