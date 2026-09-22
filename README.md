# 아울네컷 · S.OWL PHOTO BOOTH 🦉

촬영하고 · 꾸미고 · QR로 바로 받는 네컷 포토부스 웹앱.

- 📷 4컷·6컷 연속 촬영 + 얼굴 478점 추적 자동 프레이밍
- 🐰 AR 얼굴 스티커 56종 — 토끼·고양이 귀, 꽃 왕관, 헤드폰, 양머리, 프리쿠라·0.5 셀카 왜곡, 얼굴 모자이크 등. 얼굴을 따라 움직이고 여러 명도 각각 (그림은 모두 직접 그린 SVG, 찍은 뒤에도 변경 가능)
- 💖 스티커 110여 개 (러블리·Y2K·볼펜 낙서·글자·데코·이모지) — 사진 위에서 끌어서 옮기고 손잡이로 크기·회전
- 🎞 프레임 16종 — 필름·민트 도트·핑크 깅엄+마스킹 테이프·스프링 노트·매거진·Y2K 크롬·부엉이 까꿍 등
- 🎞 촬영 전 필터 43종 실시간 미리보기 (뽀샤시·스튜디오 흑백·필름·파스텔 톤·나이트 비전 등, 찍은 뒤에도 변경·강도 조절)
- 🖼 레이아웃 9종 (4컷 7 · 6컷 2) + 사진 자리·간격·모서리·배경색 편집
- 🎨 프레임·필터·스티커·문구 직접 꾸미기, 또는 🤖 분위기만 말하면 AI 꾸미기 (Claude / OpenAI / Gemini 선택)
- 📱 QR로 폰에서 바로 다운로드
- 🖨 행사장 프린터 출력 (로컬 프린트 서버)
- 📊 운영자 대시보드

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local   # (선택) 필요한 키만 입력
npm run dev
```

http://localhost:3000 접속. **카메라는 localhost 또는 HTTPS에서만 동작**합니다.

설정 없이도 촬영·꾸미기·로컬 다운로드는 동작합니다. 나머지는 필요한 것만 켜세요:

| 기능 | 필요한 설정 |
|---|---|
| QR 다운로드·출력·통계 | Supabase 프로젝트 + `supabase/schema.sql` 실행 + `NEXT_PUBLIC_SUPABASE_URL` 등 |
| AI 꾸미기 | `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` 중 하나 이상 |
| 프린터 출력 | `PRINT_SERVER_TOKEN` + 행사장 PC에서 [`print-server/`](print-server/README.md) 실행 |
| 관리자 대시보드 (`/admin`) | `ADMIN_PASSWORD` |
| 보관기간 지난 사진 자동 삭제 | `CRON_SECRET` (+ GitHub 저장소 Secrets `OWLCUT_URL`, `CRON_SECRET`) · 보관 시간 `PHOTO_RETENTION_HOURS`(기본 2) |

> 방문자 사진은 **비공개 저장소**에 보관되고, QR 다운로드 링크는 만료되는 임시 링크로만 열립니다.

## 화면

`/` 시작 → `/camera` 촬영 → `/edit` 꾸미기 → `/result` 합성·QR·출력 → `/download/[id]` 모바일 다운로드
운영자: `/admin`

## 디자인 · 폰트

모노크롬 글래스모피즘 (흑·백·회색, 반투명 카드, 벤토 그리드).

- 한글: [Pretendard](https://github.com/orioncactus/pretendard) — SIL OFL 1.1
- 영문·숫자: [Manrope](https://fonts.google.com/specimen/Manrope) — SIL OFL 1.1
- 프레임 문구·글자 스티커: Caveat · Gaegu · DM Serif Display · Space Mono · Black Han Sans (Google Fonts) — SIL OFL 1.1
- 아이콘: [Lucide](https://lucide.dev) — ISC
- 낙서 스티커 일부: [Doodle Icons](https://khushmeen.com/icons.html) by Khushmeen Sidhu — CC0 1.0 (색·테두리 변경). 나머지 스티커·프레임 장식·AR 그림은 직접 그린 SVG

## 문서

- 설계도: [`아울네컷_개발설계도_1.md`](아울네컷_개발설계도_1.md)
- 개발 가이드: [`CLAUDE.md`](CLAUDE.md)
- 프린트 서버: [`print-server/README.md`](print-server/README.md)
