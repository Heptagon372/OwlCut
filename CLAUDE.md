# 아울네컷 (S.OWL PHOTO BOOTH)

네컷 포토부스 웹앱. 촬영 → 꾸미기(수동/AI) → QR 다운로드/출력.
설계 근거는 [`아울네컷_개발설계도_1.md`](아울네컷_개발설계도_1.md) 참고.

## 스택
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- 상태: zustand (`lib/store/boothStore.ts`, 모듈 싱글턴)
- 카메라: `getUserMedia` (`lib/camera/useCamera.ts`)
- 합성: Canvas API (`lib/image/compose.ts`) — **핵심 모듈**
- DB/Storage: Supabase (Postgres + Storage), 서버 라우트에서 service role로만 접근
- QR: `qrcode`

## 실행
```bash
npm run dev        # 개발 서버 (카메라는 https 또는 localhost에서만 동작)
npm run lint       # eslint
npx tsc --noEmit   # 타입체크
npm run build      # 프로덕션 빌드
```

## 화면 흐름
`/` (시작) → `/camera` (4컷 촬영) → `/edit` (프레임·필터·스티커·텍스트) → `/result` (합성·QR·다운로드)
`/download/[id]` 는 QR로 접속하는 모바일 다운로드 페이지 (SSR).

## 아키텍처 원칙
- **수동 편집과 AI 편집은 동일한 `compose()` 엔진을 공유**한다. AI(Phase 5)는 `DesignState` JSON만 만들어 넣는다.
- 합성은 **브라우저(클라이언트) Canvas**에서 수행. `lib/image/compose.ts`는 서버에서 import 금지.
- Supabase/네트워크/프린터 실패가 **전체 흐름을 막지 않는다**. Supabase 미설정 시 카메라·합성·로컬 다운로드는 동작하고 QR만 비활성화.
- `data/*/index.json` 에 레이아웃/프레임/스티커 정의. 새 항목은 JSON 추가만으로 확장.

## 환경변수
`.env.local.example` 복사 → `.env.local`. Supabase 키가 없으면 Phase 4(QR/업로드) 기능만 비활성.

## Supabase 셋업
`supabase/schema.sql` 을 Supabase SQL Editor에서 실행 (테이블 + `photos` 버킷 + RLS).

## 진행 상황
- [x] Phase 0 스캐폴딩/CI  [x] Phase 1 카메라  [x] Phase 2 합성  [x] Phase 3 수동편집  [x] Phase 4 QR/Supabase
- [ ] Phase 5 AI 멀티모델  [ ] Phase 6 사람추적  [ ] Phase 7 프린터  [ ] Phase 8 관리자
