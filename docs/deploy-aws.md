# AWS 배포 (아울네컷)

이 앱은 **서버가 필요한 Next.js 앱**입니다 (API 라우트·SSR·쿠키 설정). 정적 호스팅(S3 + CloudFront만)으로는 안 되고,
Node 서버가 도는 환경이 필요합니다. 아래 셋 중 하나를 고르세요.

| 방법 | 언제 | 난이도 | 대략 비용(월) |
| --- | --- | --- | --- |
| **A. Amplify Hosting** | 깃허브에 올리면 알아서 빌드·배포. 가장 빠름 | ★☆☆ | 트래픽 적으면 $1~5 |
| **B. App Runner (컨테이너)** | 컨테이너로 운영, 오토스케일·HTTPS 자동 | ★★☆ | $10~30 |
| **C. Lightsail / EC2 + Docker** | 부스 한 곳, 비용 고정, 완전 제어 | ★★★ | $10~12 (2GB) |

> 부스 한 곳에서 쓰는 용도라면 **A(Amplify)** 가 가장 편하고, 행사장 네트워크가 불안해 서버까지 직접 쥐고 싶으면 **C** 를 권합니다.

---

## 0. 먼저 알아 둘 것 (공통)

**HTTPS 필수** — 카메라(`getUserMedia`)는 `https://` 또는 `localhost` 에서만 동작합니다. 위 세 방법 모두 HTTPS 도메인을 주므로 그대로 쓰면 됩니다. (직접 만든 EC2 + IP 접속은 카메라가 안 켜집니다.)

**`NEXT_PUBLIC_*` 는 빌드 시점에 박힙니다** — `NEXT_PUBLIC_APP_URL` 은 QR 에 들어갈 주소라서, 빌드할 때 최종 도메인을 넣어야 합니다. 나중에 실행 환경변수만 바꿔도 반영되지 않습니다.

**MediaPipe WASM(23MB)** 은 git 에 없고 `npm ci` 의 postinstall 이 `public/mediapipe/wasm` 으로 복사합니다. 어떤 방식으로 배포하든 **빌드 전에 `npm ci` 가 돌아야** 얼굴 추적이 켜집니다.

**환경변수** (`.env.local.example` 참고, 전부 선택 — 없으면 그 기능만 꺼짐)

| 변수 | 쓰임 |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | QR 에 들어갈 공개 주소 (예: `https://photo.example.com`) — **빌드 때 필요** |
| `NEXT_PUBLIC_SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` | Supabase 저장소 |
| `FIREBASE_SERVICE_ACCOUNT` · `FIREBASE_STORAGE_BUCKET` | Firebase 저장소 (Supabase 대신) |
| `ADMIN_PASSWORD` | `/admin` 잠금 |
| `PRINT_SERVER_TOKEN` | 부스 프린트 서버와 공유하는 토큰 |
| `CRON_SECRET` | 보관기간 정리 호출 토큰 |
| `ANTHROPIC_API_KEY` 등 | AI 꾸미기 |
| `PHOTO_RETENTION_HOURS` | 사진 보관 시간 (기본 2) |

키는 **AWS Secrets Manager / SSM Parameter Store** 에 넣고 서비스에서 참조하는 것을 권합니다 (App Runner·ECS 는 시크릿 연결을 지원).

---

## A. Amplify Hosting (가장 빠름)

1. AWS 콘솔 → **Amplify** → *Deploy an app* → GitHub 연결 → `Heptagon372/OwlCut` · `main` 선택
2. 빌드 설정은 저장소의 [`amplify.yml`](../amplify.yml) 을 자동으로 씁니다 (`npm ci` → `npm run build`)
3. **Environment variables** 에 위 표의 값들을 넣습니다
   - `NEXT_PUBLIC_APP_URL` 은 먼저 임시로 Amplify 가 준 주소(`https://main.xxxx.amplifyapp.com`)로 넣고, 커스텀 도메인을 붙인 뒤 **다시 빌드**하면서 실제 도메인으로 바꾸세요
4. 배포 완료 → **Domain management** 에서 도메인 연결 (인증서 자동)
5. `main` 에 푸시할 때마다 자동 재배포됩니다

---

## B. App Runner (컨테이너)

저장소의 [`Dockerfile`](../Dockerfile) 을 그대로 씁니다.

```bash
# 0) 변수
export AWS_REGION=ap-northeast-2
export ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export REPO=owlcut
export APP_URL=https://photo.example.com

# 1) ECR 저장소 만들고 로그인
aws ecr create-repository --repository-name $REPO --region $AWS_REGION
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

# 2) 빌드 → 푸시  (NEXT_PUBLIC_APP_URL 은 빌드 인자로!)
docker build --build-arg NEXT_PUBLIC_APP_URL=$APP_URL -t $REPO .
docker tag $REPO:latest $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
docker push $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
```

3. 콘솔 → **App Runner** → *Create service* → 위 ECR 이미지 선택
   - **Port** `3000`, **Health check** 경로 `/`
   - **CPU/메모리**: 1 vCPU · 2 GB (부스 한 곳이면 충분)
   - **환경변수/시크릿**: 위 표의 값 (`NEXT_PUBLIC_APP_URL` 은 빌드에 이미 박혔지만 서버에서도 쓰므로 같이 넣어 두면 좋습니다)
4. 생성되면 `https://xxxx.ap-northeast-2.awsapprunner.com` 이 바로 HTTPS 로 열립니다. 커스텀 도메인은 *Custom domains* 에서 연결
5. 새 버전 배포 = 이미지 다시 푸시 → App Runner 가 자동 배포(또는 *Deploy* 버튼)

> ECS Fargate + ALB 도 같은 이미지로 됩니다. App Runner 보다 설정은 많지만 VPC·오토스케일 정책을 세밀하게 잡을 수 있습니다.

---

## C. Lightsail / EC2 + Docker (비용 고정)

1. **Lightsail** 인스턴스 생성: Ubuntu 22.04, **2GB RAM 이상** (1GB 는 빌드 시 부족). 고정 IP 연결
2. 방화벽: 80·443 열기
3. 접속 후 Docker 설치

```bash
sudo apt update && sudo apt install -y docker.io git
sudo usermod -aG docker $USER && newgrp docker
```

4. 코드 받아서 빌드·실행

```bash
git clone https://github.com/Heptagon372/OwlCut.git && cd OwlCut
cp .env.local.example .env.local && nano .env.local     # 키 채우기

docker build --build-arg NEXT_PUBLIC_APP_URL=https://photo.example.com -t owlcut .
docker run -d --name owlcut --restart unless-stopped \
  -p 127.0.0.1:3000:3000 --env-file .env.local owlcut
```

5. HTTPS 는 **Caddy** 가 인증서까지 자동으로 처리합니다 (도메인의 A 레코드를 고정 IP 로 먼저 연결)

```bash
sudo apt install -y caddy
echo 'photo.example.com {
  reverse_proxy 127.0.0.1:3000
}' | sudo tee /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

6. 업데이트할 때

```bash
cd OwlCut && git pull
docker build --build-arg NEXT_PUBLIC_APP_URL=https://photo.example.com -t owlcut .
docker rm -f owlcut && docker run -d --name owlcut --restart unless-stopped \
  -p 127.0.0.1:3000:3000 --env-file .env.local owlcut
```

---

## 1. 보관기간 정리(크론)

방문자 사진은 `PHOTO_RETENTION_HOURS`(기본 2시간) 뒤에 지워야 합니다. 이미 있는 GitHub Actions(`.github/workflows/cleanup.yml`)를 그대로 써도 되고, AWS 안에서 돌리려면 **EventBridge Scheduler** 로 매시간 호출하세요.

- 대상: `GET https://<도메인>/api/cron/cleanup`
- 헤더: `Authorization: Bearer <CRON_SECRET>`
- EventBridge Scheduler → *Universal target* → `aws:lambda` 대신 **API destination** 을 만들고 위 헤더를 연결하면 코드 없이 됩니다.

## 2. 부스 프린트 서버

프린터는 행사장 PC 에 붙어 있으므로 `print-server/` 는 **부스 PC 에서** 돌립니다 (AWS 아님).

```bash
# 부스 PC (print-server/.env)
OWLCUT_API_URL=https://photo.example.com
PRINT_SERVER_TOKEN=<웹 서버와 같은 값>
PRINTER_ID=booth-1
SYSTEM_PRINTER=<OS 프린터 이름>
```

설정에서 **인쇄 방식 = 이 기기에서 바로** 를 고르면 프린트 서버 없이 키오스크 브라우저로 바로 인쇄할 수도 있습니다.

## 3. 저장소(사진·통계)

- 지금 구현은 **Supabase** 또는 **Firebase** 입니다. AWS 위에서 돌더라도 그대로 쓰면 됩니다 (키만 환경변수로).
- 사진까지 AWS 안에 두고 싶다면 **S3 + DynamoDB 어댑터**를 `lib/db` 에 하나 더 붙이면 됩니다 (인터페이스가 이미 분리돼 있어 파일 하나 + 테스트면 충분).

## 4. 배포 후 점검

- [ ] `https://도메인` 접속 → 촬영 화면에서 **카메라 권한 요청**이 뜨는가 (HTTPS 확인)
- [ ] 4컷 촬영 → 편집 → 완성 → **QR 주소가 실제 도메인**인가 (`NEXT_PUBLIC_APP_URL`)
- [ ] 폰으로 QR 스캔 → 사진이 보이고 저장되는가
- [ ] `/admin` 로그인 (비밀번호 설정 시)
- [ ] 얼굴 추적이 "사용 불가" 로 뜨지 않는가 (WASM 배포 확인: `/mediapipe/wasm/vision_wasm_internal.wasm` 이 200)
- [ ] 한 시간 뒤 정리 크론이 돌아 만료 사진이 지워지는가
