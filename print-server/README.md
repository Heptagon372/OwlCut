# 아울네컷 로컬 프린트 서버

행사장 PC(프린터가 연결된 PC)에서 상시 실행하는 작은 Node 프로세스입니다.
웹 앱은 출력 요청을 큐에 등록만 하고, 이 서버가 큐를 가져가 출력한 뒤 결과를 보고합니다.
프린터가 꺼져 있거나 오류가 나도 웹의 촬영·QR 흐름은 막히지 않습니다 (출력 상태만 `failed`).

```
부스 화면 ──POST /api/print──▶ 웹 서버(큐: prints 테이블)
                                   ▲        │
          POST /api/print/claim ───┘        │ (Bearer 토큰)
          PATCH /api/print/:id  ◀───────────┘
                    │
              이 프린트 서버 ──▶ 프린터
```

## 준비

1. Node.js 20.12 이상
2. 웹 서버 환경변수에 `PRINT_SERVER_TOKEN` 설정 (충분히 긴 임의 문자열)
3. 이 폴더의 `.env.example` 을 `.env` 로 복사하고 같은 토큰과 웹 서버 주소 입력

## 실행

```bash
node print-server/index.mjs
```

먼저 `PRINT_DRY_RUN=1` 로 실행해 보세요. 실제 출력 대신 `print-server/printed/` 에 이미지가 저장됩니다.

## 출력 방식

| OS | 기본 동작 |
|---|---|
| Windows | `print-image.ps1` (PowerShell + System.Drawing) — 대화상자 없이 용지에 맞춰 출력 |
| macOS / Linux | `lp -o fit-to-page` (CUPS) |
| 직접 지정 | `PRINT_COMMAND` 에 `{file}` `{printer}` `{copies}` 치환 명령 |

`SYSTEM_PRINTER` 를 비우면 OS 기본 프린터로 출력합니다.
Windows 프린터 이름 확인: `Get-Printer | Select Name`

## 동작 규칙

- 3초마다 큐 확인, 작업이 있으면 쉬지 않고 연속 처리
- 큐 확인 요청이 곧 heartbeat → 관리자 대시보드에 장비 온라인 여부 표시
- `printing` 상태로 5분 넘게 멈춘 작업은 서버가 `failed(timeout)` 처리 (중복 출력 방지를 위해 자동 재출력 안 함)
- 세션당 출력 최대 3회, 1회 최대 2매
