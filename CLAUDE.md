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

## AI 꾸미기 (Phase 5)
- 흐름: `POST /api/ai` → `lib/ai/generateDesign.ts` → `registry`에서 모델→프로바이더 → `providers/*.generate()` → `normalize.ts` 검증·보정.
- AI는 이미지를 만들지 않고 `frame/filter/stickers/text` JSON만 고른다. 출력 스키마의 enum은 `data/*` 레지스트리에서 자동 생성(`lib/ai/prompt.ts`).
- Claude: 공식 SDK, 구조화 출력 + `effort: "low"` + Opus 5 서버측 refusal fallback. OpenAI: json_schema strict. Gemini: JSON 모드 + 보정.
- 키가 없는 프로바이더는 `/api/ai/models`에서 숨김. 새 프로바이더 = `providers/xxx.ts` + `registry.ts` 한 줄.
- `/api/ai`는 과금되는 공개 엔드포인트 → 프롬프트 200자 제한 + IP당 분당 8회 제한(`lib/ai/rateLimit.ts`, 인스턴스 메모리 기반).

## 사람 추적 / 자동 프레이밍 (Phase 6)
- MediaPipe Face Detector(`lib/tracking/useFaceTracking.ts`), ~11fps. 여러 명이면 얼굴 박스 합집합으로 판단.
- 촬영 화면: 인물 박스 + 이동 안내(`lib/tracking/framing.ts`, 순수 함수). 셔터 순간의 인물 중심을 사진별 `focus`로 저장 → `compose`의 `coverCrop`이 가운데 대신 인물 중심으로 크롭.
- WASM(34MB)은 `postinstall`이 `public/mediapipe/wasm`으로 복사 (git·eslint 제외). 모델은 Google Storage (`NEXT_PUBLIC_FACE_MODEL_URL`로 교체 가능).
- 보조 기능: 로드 실패 시 "사용 불가" 표시만 하고 촬영은 정상 진행.

## 출력 (Phase 7)
- 부스: `POST /api/print`(큐 등록만) → `GET /api/print?session_id=` 폴링. 세션당 3회·1회 2매 제한.
- 로컬 프린트 서버(`print-server/`, 의존성 없는 Node): `POST /api/print/claim` → 출력 → `PATCH /api/print/[id]`. 둘 다 `Authorization: Bearer PRINT_SERVER_TOKEN` 필수 (없으면 401).
- 큐 = Supabase `prints` 테이블. claim은 조건부 update(`status='waiting'`)로 중복 방지, 5분 넘게 멈춘 작업은 `failed(timeout)`.
- claim 호출이 heartbeat → `devices` 테이블 (관리자 장비 상태).
- 시험: `PRINT_DRY_RUN=1 node print-server/index.mjs` → `print-server/printed/`에 저장.

## 환경변수
`.env.local.example` 복사 → `.env.local`. Supabase 키가 없으면 Phase 4(QR/업로드) 기능만 비활성.

## Supabase 셋업
`supabase/schema.sql` 을 Supabase SQL Editor에서 실행 (테이블 + `photos` 버킷 + RLS).

## 진행 상황
- [x] Phase 0 스캐폴딩/CI  [x] Phase 1 카메라  [x] Phase 2 합성  [x] Phase 3 수동편집  [x] Phase 4 QR/Supabase
- [x] Phase 5 AI 멀티모델  [x] Phase 6 사람추적  [x] Phase 7 프린터  [ ] Phase 8 관리자
