// 개발 전용: AR 효과 점검판 (production 빌드에서는 404).
// /dev/ar                     → 기본 얼굴 일러스트에 모든 효과
// /dev/ar?src=<이미지 URL>     → 실제 사진에서 Face Landmarker 로 얼굴을 찾아 모든 효과 (CORS 허용 이미지)
//        &rotate=20 (고개 기울임 확인) &mirror=1 (거울 모드 확인) &zoom=3 (첫 얼굴 확대)
import { notFound } from "next/navigation";
import { ArLab } from "./ArLab";

export default function DevArPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ArLab />;
}
