"use client";
// 카메라 모듈 (설계도 7-1).
// getUserMedia로 스트림을 잡고, 현재 프레임을 dataURL로 캡처한다.
// 권한 거부/장치 없음 등 예외를 사용자 친화 메시지로 변환.
import { useCallback, useEffect, useRef, useState } from "react";

const MAX_DIMENSION = 1280; // 캡처 이미지 최장변 상한 (메모리/전송 최적화)

export interface UseCameraOptions {
  mirror?: boolean; // 셀피처럼 좌우 반전 (기본 true)
}

export interface UseCameraResult {
  // <video ref={videoRef}> 용 콜백 ref: 요소가 (재)마운트될 때마다 스트림을 다시 연결한다.
  videoRef: (el: HTMLVideoElement | null) => void;
  // 현재 마운트된 video 요소 (캡처/얼굴 추적에서 읽기용)
  videoElRef: React.RefObject<HTMLVideoElement | null>;
  ready: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  capture: () => string | null;
  mirror: boolean;
}

function toFriendlyError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "SecurityError":
        return "카메라 권한이 거부되었습니다. 브라우저 주소창의 카메라 아이콘에서 허용해 주세요.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "연결된 카메라를 찾을 수 없습니다. 장치를 확인해 주세요.";
      case "NotReadableError":
        return "다른 앱이 카메라를 사용 중입니다. 해당 앱을 닫고 다시 시도해 주세요.";
      default:
        return `카메라 오류: ${err.name}`;
    }
  }
  return "카메라를 시작할 수 없습니다. 다시 시도해 주세요.";
}

export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const mirror = options.mirror ?? true;
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attach = (video: HTMLVideoElement, stream: MediaStream) => {
    if (video.srcObject !== stream) video.srcObject = stream;
    void video.play().catch(() => {});
  };

  // 재촬영 등으로 <video>가 다시 마운트되어도 기존 스트림을 붙인다.
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el && streamRef.current) attach(el, streamRef.current);
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("이 브라우저는 카메라를 지원하지 않습니다. (HTTPS 또는 localhost 필요)");
      return;
    }
    try {
      // 재시도 시 이전 스트림이 남지 않도록 정리
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoElRef.current) attach(videoElRef.current, stream);
      setReady(true);
    } catch (err) {
      setError(toFriendlyError(err));
      setReady(false);
    }
  }, []);

  const capture = useCallback((): string | null => {
    const video = videoElRef.current;
    if (!video || !video.videoWidth) return null;
    let w = video.videoWidth;
    let h = video.videoHeight;
    const longest = Math.max(w, h);
    if (longest > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / longest;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.92);
  }, [mirror]);

  useEffect(() => stop, [stop]);

  return { videoRef, videoElRef, ready, error, start, stop, capture, mirror };
}
