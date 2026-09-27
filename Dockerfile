# 아울네컷 컨테이너 이미지 (AWS App Runner · ECS · EC2 공용)
# 빌드:  docker build --build-arg NEXT_PUBLIC_APP_URL=https://photo.example.com -t owlcut .
# 실행:  docker run -p 3000:3000 --env-file .env.local owlcut
#
# NEXT_PUBLIC_* 값은 빌드 때 번들에 박히므로 반드시 --build-arg 로 넘긴다 (실행 시 바꿔도 안 바뀜).
# 나머지 설정(저장소 키·관리자 비밀번호 등)은 실행 시 환경변수로 준다.

# ---------- 빌드 ----------
FROM node:22-alpine AS builder
WORKDIR /app

# postinstall 이 MediaPipe WASM(23MB)을 public/mediapipe/wasm 으로 복사한다 (git 에는 없음)
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_IDLE_SECONDS
ARG NEXT_PUBLIC_FACE_MODEL_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_IDLE_SECONDS=$NEXT_PUBLIC_IDLE_SECONDS \
    NEXT_PUBLIC_FACE_MODEL_URL=$NEXT_PUBLIC_FACE_MODEL_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------- 실행 ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# standalone 서버 + 정적 파일 + public (WASM 포함)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# 컨테이너 상태 확인용 (App Runner·ECS 헬스체크는 / 를 그대로 써도 된다)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
