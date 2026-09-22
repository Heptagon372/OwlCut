# 아울네컷 · S.OWL PHOTO BOOTH 🦉

촬영하고 · 꾸미고 · QR로 바로 받는 네컷 포토부스 웹앱.

## 빠른 시작

```bash
npm install
cp .env.local.example .env.local   # (선택) Supabase/AI 키 입력
npm run dev
```

브라우저에서 http://localhost:3000 접속. **카메라는 localhost 또는 HTTPS에서만 동작**합니다.

## 화면 흐름

`/` 시작 → `/camera` 4컷 촬영 → `/edit` 꾸미기 → `/result` 합성·QR → `/download/[id]` 모바일 다운로드

## Supabase (Phase 4)

QR/원격 저장을 쓰려면 Supabase 프로젝트가 필요합니다.

1. Supabase 프로젝트 생성
2. `supabase/schema.sql` 을 SQL Editor에서 실행
3. `.env.local` 에 URL/anon/service_role 키 입력

키가 없어도 촬영·꾸미기·로컬 다운로드는 정상 동작합니다 (QR만 비활성).

## 문서

- 설계도: [`아울네컷_개발설계도_1.md`](아울네컷_개발설계도_1.md)
- 개발 가이드: [`CLAUDE.md`](CLAUDE.md)
