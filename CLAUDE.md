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

## 디자인 시스템 (모노크롬 글래스모피즘)
- 흑·백·회색만. 강조 = 잉크(검정). 상태색(good/warning/critical)은 관리자 상태 표시 전용(아이콘+문구 동반).
- 토큰·유틸은 `app/globals.css`: `glass`(반투명 흰 카드) · `glass-solid`(거의 불투명) · `ink`(검은 카드) · `ink-glass`(반투명 검정), `rounded-card`(28px) · `rounded-tile`(20px), `.num`(Manrope 숫자, 폭 고정).
- 배경은 고정된 흐린 흑백 리본(`.app-bg`, 정적 — 카메라·WebGL과 GPU를 나눠 쓰므로 애니메이션 없음). 글래스는 뒤에 형태가 비쳐야 살아난다.
- 폰트: 한글 **Pretendard** 가변(`node_modules/pretendard`, `next/font/local`, OFL-1.1), 영문·숫자 **Manrope**(`next/font/google`, OFL-1.1). 큰 제목은 Pretendard 아주 가는 굵기(150~250).
- 아이콘: `lucide-react` (선형). 이모지는 콘텐츠(스티커)에만.
- 공용 컴포넌트: `ui/Button`(알약: primary 검정 · secondary 흰색 · light), `ui/IconButton`(흰 원), `ui/Panel`(제목+아이콘 카드), `ui/ProgressRing`, `ui/Segmented`(검은 알약 탭), `brand/Logo`·`OwlMark`.
- 레이아웃: 헤더(로고 + 원형/알약 버튼) → 벤토 그리드. **그리드엔 항상 `grid-cols-1`(minmax(0,1fr))** 을 명시할 것 — 없으면 가로 스크롤 칩 등 넓은 내용 때문에 모바일에서 열이 수천 px로 늘어난다.
- 좁은 카드 안 큰 숫자는 `@container` + `@sm:` 등 컨테이너 쿼리로 크기 조절 (관리자 개요 카드 참고).

## 아키텍처 원칙
- **수동 편집과 AI 편집은 동일한 `compose()` 엔진을 공유**한다. AI(Phase 5)는 `DesignState` JSON만 만들어 넣는다.
- 합성은 **브라우저(클라이언트) Canvas**에서 수행. `lib/image/compose.ts`는 서버에서 import 금지.
- Supabase/네트워크/프린터 실패가 **전체 흐름을 막지 않는다**. Supabase 미설정 시 카메라·합성·로컬 다운로드는 동작하고 QR만 비활성화.
- `data/*/index.json` 에 레이아웃/프레임/스티커 정의. 새 항목은 JSON 추가만으로 확장.

## 필터 (촬영 전 선택)
- 촬영 화면에서 필터 선택 → 실시간 미리보기. **사진은 원본으로 저장**하고 `design.filter`/`filterIntensity`로 들고 다니다가 합성 때 적용 (편집 화면에서 변경·강도 조절 가능, 비파괴).
- 엔진: `lib/filters/engine.ts` (WebGL, 셰이더 `shaders.ts`). 미리보기(`FilteredPreview`)·썸네일·촬영 후 확인(`FilteredImage`)·최종 합성(`compose` → `drawFiltered`)이 **같은 셰이더** → 보이는 그대로 인화.
  - 파이프라인: 피부보정(YCbCr 피부 마스크 + bilateral) → 노출/화이트밸런스/대비 → 하이라이트·섀도 → 채도/바이브런스 → 톤 커브(단조 3차, `curves.ts`) → 흑백 채널믹스/세피아 → 스플릿 토닝 → 페이드 → 소프트 글로우(저해상도 가우시안) → 비네팅 → 빛샘 → 그레인 → 강도.
  - WebGL 없으면 `cssFallback.ts`로 근사 (밝기/대비/채도/흑백/세피아만).
- 프리셋 42종: `data/filters/index.json` (카테고리 기본·뷰티·흑백·필름·톤·무드). 새 필터 = JSON 한 항목, 파라미터 설명은 `types/filter.ts`. AI 스키마 enum·썸네일·카테고리 탭 자동 반영.
- 흑백 인물은 빨강 비중 높은 채널믹스([.5,.4,.1])가 피부를 밝게 보이게 함. 화이트밸런스는 ±1 = 강한 캐스트, 보통 0.05~0.3.
- 개발 모드 전용 디버그: 브라우저 콘솔 `window.__owlcutFilters` (엔진 직접 렌더·프리셋 조회). production 빌드엔 없음.
- 카메라 없는 환경에서 촬영 흐름 시험: 홈에서 `navigator.mediaDevices.getUserMedia`를 캔버스 `captureStream()`으로 바꾼 뒤 "촬영 시작"(앱 내 이동이라 패치 유지).

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

## 키오스크: 자리 비움 자동 초기화
- `components/kiosk/IdleGuard` (판단 로직은 순수 함수 `lib/kiosk/idle.ts`): 조작이 없으면 마지막 15초 경고("아직 계신가요?") → 처음 화면으로 이동하며 `store.reset()`으로 사진·디자인 삭제.
- 화면별 기본: 촬영 90초(4컷 촬영 중에는 멈춤) · 편집 120초 · 결과 60초. `NEXT_PUBLIC_IDLE_SECONDS`를 넣으면 모든 화면에 그 값(20초~30분).
- 새 키오스크 화면을 만들면 `<IdleGuard seconds={…} />`를 꼭 넣을 것 (다음 방문자가 앞 사람 사진을 보지 않게).
- 브라우저에서 시험할 때는 `Date.now`를 고정값으로 바꿔 경고 구간에 멈춰 두면 편하다 (이동 시켜 두면 도구 지연 동안 실제로 만료됨).

## 사진 저장·보관 (개인정보)
- 버킷 `photos`는 **비공개**. DB에는 경로만(`designs.final_image_path`, `prints.image_path`, `photos.image_path`) 저장하고, 보여줄 때마다 서버가 **서명 URL** 발급(`lib/storage/photos.ts`). 공개 URL(`getPublicUrl`) 사용 금지.
  - 다운로드 페이지: 열 때마다 최대 1시간(남은 보관시간이 더 짧으면 그만큼) 서명 URL. 프린트 서버: claim 시 10분짜리.
- 세션 id는 저장소 경로에 들어가므로 **UUID만 허용**(`lib/ids.ts`) — 경로 조작 방지.
- 보관기간 `PHOTO_RETENTION_HOURS`(기본 2시간, 설계도). 만료 후 다운로드 페이지는 "보관 기간이 지났어요".
- 삭제: `GET /api/cron/cleanup` (Bearer `CRON_SECRET`) — 파일 먼저 지우고 성공하면 세션 행 삭제(cascade). 실패 시 행을 남겨 다음 실행에 재시도.
  - 스케줄: `.github/workflows/cleanup.yml`(매시간, 저장소 Secrets `OWLCUT_URL`·`CRON_SECRET` 필요, 없으면 건너뜀). Vercel이면 Cron으로도 가능(Hobby 플랜은 하루 1회 제한).

## 환경변수
`.env.local.example` 복사 → `.env.local`. 모든 외부 설정은 선택이며, 없으면 해당 기능만 비활성:
Supabase 없음 → QR·출력·통계 / AI 키 없음 → AI 꾸미기 / `PRINT_SERVER_TOKEN` 없음 → 프린트 서버 / `ADMIN_PASSWORD` 없음 → `/admin`.
촬영·편집·로컬 다운로드는 항상 동작.

## Supabase 셋업
`supabase/schema.sql` 을 Supabase SQL Editor에서 실행 (테이블 + `photos` 버킷 + RLS). 멱등(`if not exists`)이라 스키마가 바뀌면 다시 실행하면 됨.

## 검증 방법
- `npm test` (Vitest, `tests/*.test.ts`). CI 순서: lint → typecheck → test → build (Node 22 — Vitest 5 요구).
- 테스트 대상: AI 응답 보정, 얼굴 프레이밍·크롭, 레이아웃 데이터·기하, 톤 커브·CSS 폴백, 필터 프리셋 42종 유효성, 관리자 인증·통계, 대비 색, **프린트 서버 전체 루프**(가짜 API + 실제 `print-server/index.mjs` 실행).
- 브라우저 전용 렌더링(WebGL 셰이더·canvas 합성)은 Node 테스트 불가 → 개발 모드 `window.__owlcutFilters`로 수동 점검.
- 로컬 `.next`가 남아 있으면 CI에서만 나는 타입 오류를 놓칠 수 있음 → 의심되면 깨끗한 clone에서 `npm ci && npm run typecheck`.

## 진행 상황
- [x] Phase 0 스캐폴딩/CI  [x] Phase 1 카메라  [x] Phase 2 합성  [x] Phase 3 수동편집  [x] Phase 4 QR/Supabase
- [x] Phase 5 AI 멀티모델  [x] Phase 6 사람추적  [x] Phase 7 프린터  [x] Phase 8 관리자
