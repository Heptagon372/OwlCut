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
npm run typecheck  # 타입체크 (next typegen → tsc). 맨 tsc는 깨끗한 체크아웃에서 LayoutProps를 못 찾음
npm run build      # 프로덕션 빌드
```

## 화면 흐름
`/` (시작) → `/camera` (4컷 촬영) → `/edit` (프레임·필터·스티커·텍스트) → `/result` (합성·QR·다운로드)
`/download/[id]` 는 QR로 접속하는 모바일 다운로드 페이지 (SSR). `/admin` 은 운영자용 대시보드.

## 아키텍처 원칙
- **수동 편집과 AI 편집은 동일한 `compose()` 엔진을 공유**한다. AI(Phase 5)는 `DesignState` JSON만 만들어 넣는다.
- 합성은 **브라우저(클라이언트) Canvas**에서 수행. `lib/image/compose.ts`는 서버에서 import 금지.
- Supabase/네트워크/프린터 실패가 **전체 흐름을 막지 않는다**. Supabase 미설정 시 카메라·합성·로컬 다운로드는 동작하고 QR만 비활성화.
- `data/*/index.json` 에 레이아웃/프레임/스티커 정의. 새 항목은 JSON 추가만으로 확장.

## 화면 구성 (촬영 후 편집)
- 편집 탭: `화면 구성 | 꾸미기 | AI 꾸미기`. 화면 구성 = 레이아웃 · 사진 자리 바꾸기 · 간격 · 모서리 · 배경색.
- 레이아웃 7종(`data/layouts/index.json`). `tile`로 스트립 반복(인생네컷 오리지널 = 1200x1800, 4x6), `cards`로 폴라로이드 카드. 썸네일은 슬롯 좌표로 자동 생성되므로 JSON 추가만으로 확장.
- `DesignState.photoOrder`(자리 i ← 사진 번호), `slotSpacing`/`slotRounding`(0~10 단계, 해상도 무관), `backgroundColor`(null=프레임 기본). 계산은 `lib/image/layoutGeometry.ts`(순수).
- 배경색을 직접 바꾸면 하단 브랜딩·새 문구 기본색은 대비에 맞춰 자동 선택(`lib/image/color.ts`).
- 미리보기·최종 합성은 모두 `buildComposeInput()`을 거친다 (필드 추가 시 한 곳만 수정).
- 개발 모드에선 사진이 없을 때 편집 화면에 "샘플 사진으로 체험" 버튼 (카메라 없이 편집기 확인용, production 빌드에선 숨김).

## AI 꾸미기 (Phase 5)
- 흐름: `POST /api/ai` → `lib/ai/generateDesign.ts` → `registry`에서 모델→프로바이더 → `providers/*.generate()` → `normalize.ts` 검증·보정.
- AI는 이미지를 만들지 않고 `frame/filter/stickers/text` JSON만 고른다. 출력 스키마의 enum은 `data/*` 레지스트리에서 자동 생성(`lib/ai/prompt.ts`).
- Claude: 공식 SDK, 구조화 출력 + `effort: "low"` + Opus 5 서버측 refusal fallback. OpenAI: json_schema strict. Gemini: JSON 모드 + 보정.
- 키가 없는 프로바이더는 `/api/ai/models`에서 숨김. 새 프로바이더 = `providers/xxx.ts` + `registry.ts` 한 줄.
- `/api/ai`는 과금되는 공개 엔드포인트 → 프롬프트 200자 제한 + IP당 분당 8회 제한(`lib/rateLimit.ts`, 인스턴스 메모리 기반).

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

## 관리자 (Phase 8)
- `/admin`: `ADMIN_PASSWORD` 게이트. 로그인 시 만료시각을 HMAC(키=비밀번호) 서명한 httpOnly 쿠키(12시간) → 비밀번호 변경 시 전 세션 무효. 로그인 IP당 분당 5회 제한.
- `GET /api/admin/stats`(`lib/admin/stats.ts`): 오늘(KST) 세션·완성 네컷·AI 요청/성공률·출력, 출력 큐, 장비(heartbeat 30초 이내=온라인), 모델별 사용량, 설정 상태.
- AI 사용량은 `/api/ai`가 호출마다 `ai_requests`에 기록 (저장 안 된 시도 포함). 디자인별 모델은 `designs.ai_model`.
- 상태색(`--status-good/warning/critical`)은 상태 표시 전용, 항상 아이콘+문구와 함께.

## 환경변수
`.env.local.example` 복사 → `.env.local`. 모든 외부 설정은 선택이며, 없으면 해당 기능만 비활성:
Supabase 없음 → QR·출력·통계 / AI 키 없음 → AI 꾸미기 / `PRINT_SERVER_TOKEN` 없음 → 프린트 서버 / `ADMIN_PASSWORD` 없음 → `/admin`.
촬영·편집·로컬 다운로드는 항상 동작.

## Supabase 셋업
`supabase/schema.sql` 을 Supabase SQL Editor에서 실행 (테이블 + `photos` 버킷 + RLS). 멱등(`if not exists`)이라 스키마가 바뀌면 다시 실행하면 됨.

## 검증 방법
- 테스트 프레임워크는 아직 없음. CI는 lint + typecheck + build.
- 로컬 `.next`가 남아 있으면 CI에서만 나는 타입 오류를 놓칠 수 있음 → 의심되면 깨끗한 clone에서 `npm ci && npm run typecheck`.
- 순수 로직(`lib/ai/normalize.ts`, `lib/tracking/framing.ts`, `compose.coverCrop`, `lib/admin/auth.ts`, `lib/admin/stats.ts`)은 DOM/네트워크 의존이 없어 `npx tsx`로 바로 검증 가능.

## 진행 상황
- [x] Phase 0 스캐폴딩/CI  [x] Phase 1 카메라  [x] Phase 2 합성  [x] Phase 3 수동편집  [x] Phase 4 QR/Supabase
- [x] Phase 5 AI 멀티모델  [x] Phase 6 사람추적  [x] Phase 7 프린터  [x] Phase 8 관리자
