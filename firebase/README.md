# Firebase 로 아울네컷 돌리기

Supabase 대신 **Firestore + Cloud Storage** 를 저장소로 쓸 수 있습니다.
앱 코드는 `lib/db` 의 공통 인터페이스만 쓰므로, 환경변수만 바꾸면 그대로 동작합니다.
(Supabase 설정이 같이 있으면 Supabase 를 씁니다.)

## 1. 프로젝트 준비

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 프로젝트 생성
2. **Firestore Database** 만들기 (프로덕션 모드, 리전은 부스와 가까운 곳 — 예: `asia-northeast3` 서울)
3. **Storage** 만들기 (같은 리전). 버킷 이름을 적어 둡니다 (예: `owlcut.firebasestorage.app`)
4. **프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성** → JSON 파일 다운로드

## 2. 환경변수

`.env.local` 에 넣습니다. JSON 은 한 줄로 넣기 어려우니 base64 를 권합니다.

```bash
# JSON 파일 → 한 줄 base64
node -e "console.log(require('fs').readFileSync('serviceAccount.json').toString('base64'))"
```

```
FIREBASE_SERVICE_ACCOUNT=<위 base64 또는 JSON 원문>
FIREBASE_STORAGE_BUCKET=owlcut.firebasestorage.app
FIREBASE_PROJECT_ID=owlcut          # 서비스 계정 JSON 에 있으면 생략 가능
```

Cloud Run·App Hosting 처럼 기본 자격증명이 있는 곳이라면 `FIREBASE_SERVICE_ACCOUNT` 없이
`FIREBASE_PROJECT_ID` + `FIREBASE_STORAGE_BUCKET` 만으로도 됩니다.
다만 **서명 URL 발급에는 서비스 계정 권한(`iam.serviceAccounts.signBlob`)이 필요**합니다.
기본 자격증명으로 쓸 경우 실행 서비스 계정에 **Service Account Token Creator** 역할을 주세요.

## 3. 규칙·색인 배포

```bash
npm i -g firebase-tools
firebase login
firebase use <프로젝트 id>
firebase deploy --only firestore:rules,firestore:indexes,storage --config firebase/firebase.json
```

- `firestore.rules` / `storage.rules` — **전부 차단**. 모든 접근은 서버(Admin SDK)만 합니다.
  방문자에게는 만료되는 서명 URL 만 전달합니다 (Supabase 의 RLS + 비공개 버킷과 같은 방식).
- `firestore.indexes.json` — 아래 쿼리에 필요한 복합 색인입니다. 배포하지 않으면 관리자 통계·출력 큐에서
  "인덱스가 필요합니다" 오류가 납니다 (콘솔 링크로도 만들 수 있습니다).

## 4. 컬렉션 구조

| 컬렉션 | 문서 id | 비고 |
| --- | --- | --- |
| `sessions` | 세션 UUID | `status`, `expires_at`, `upload_token_hash`(SHA-256) |
| `designs` | 자동 | `session_id`, `has_final`(완성본 여부), `layout_options`, `final_image_path` |
| `photos` | 자동 | 원본 사진 경로 (이미지는 Storage) |
| `prints` | 자동 | 출력 큐. `status`: waiting→printing→completed/failed |
| `devices` | 프린터 이름 | 프린트 서버 heartbeat |
| `ai_requests` | 자동 | AI 호출 기록 (관리자 통계) |

시각은 모두 **ISO 문자열(UTC)** 로 저장합니다 — Supabase 와 같은 방식으로 기간을 조회하기 위해서입니다.
`has_final` 은 Firestore 가 한 쿼리에서 여러 범위 조건을 다루기 어려워 따로 둔 표시입니다.

## 5. 보관기간 정리

Supabase 와 동일하게 `GET /api/cron/cleanup` (Bearer `CRON_SECRET`) 이 처리합니다.
`.github/workflows/cleanup.yml` 스케줄을 그대로 쓰면 됩니다.
