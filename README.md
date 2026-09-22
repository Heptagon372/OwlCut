# 아울네컷 · S.OWL PHOTO BOOTH 🦉

촬영하고 · 꾸미고 · QR로 바로 받는 네컷 포토부스 웹앱.

- 📷 4컷 연속 촬영 + 얼굴 추적 자동 프레이밍
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

## 화면

`/` 시작 → `/camera` 촬영 → `/edit` 꾸미기 → `/result` 합성·QR·출력 → `/download/[id]` 모바일 다운로드
운영자: `/admin`

## 문서

- 설계도: [`아울네컷_개발설계도_1.md`](아울네컷_개발설계도_1.md)
- 개발 가이드: [`CLAUDE.md`](CLAUDE.md)
- 프린트 서버: [`print-server/README.md`](print-server/README.md)
