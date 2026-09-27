import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 컨테이너 배포(App Runner·ECS·EC2)용: 필요한 파일만 담은 독립 실행 서버를 .next/standalone 에 만든다.
  // Amplify·Vercel 처럼 플랫폼이 알아서 하는 곳에서도 문제되지 않는다.
  output: "standalone",
};

export default nextConfig;
