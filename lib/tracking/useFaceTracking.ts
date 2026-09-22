"use client";
// 사람 추적 모듈 (설계도 7-2) — MediaPipe Face Detector.
// 보조 기능: 로드/검출이 실패해도 촬영 흐름에는 영향 없음 (status "unavailable" 로만 표시).
import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceDetector } from "@mediapipe/tasks-vision";
import type { Focus } from "@/types/design";
import { focusFromBox, largestFaceHeight, toBox, unionBox, type Box } from "./framing";

// WASM은 postinstall 스크립트가 public/mediapipe/wasm 으로 복사 (scripts/copy-mediapipe-wasm.mjs)
const WASM_PATH = "/mediapipe/wasm";
const MODEL_URL =
  process.env.NEXT_PUBLIC_FACE_MODEL_URL ||
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const DETECT_INTERVAL_MS = 90; // ~11fps면 가이드에 충분, CPU 절약

export type TrackingStatus = "off" | "loading" | "ready" | "unavailable";

export interface FaceTrackingResult {
  status: TrackingStatus;
  group: Box | null;          // 모든 얼굴의 합집합 박스
  faceHeight: number;         // 가장 큰 얼굴 높이 (거리 판단용)
  frameSize: { w: number; h: number } | null; // 원본 비디오 해상도 (오버레이 좌표계)
  getFocus: () => Focus | null; // 캡처 순간의 크롭 초점
}

interface Snapshot {
  group: Box | null;
  faceHeight: number;
  frameSize: { w: number; h: number } | null;
}

const EMPTY: Snapshot = { group: null, faceHeight: 0, frameSize: null };

export function useFaceTracking(
  videoElRef: React.RefObject<HTMLVideoElement | null>,
  { enabled, mirrored }: { enabled: boolean; mirrored: boolean },
): FaceTrackingResult {
  const [status, setStatus] = useState<TrackingStatus>("loading");
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const latestRef = useRef<Snapshot>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let detector: FaceDetector | null = null;
    let raf = 0;
    let last = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const video = videoElRef.current;
      if (!detector || !video || video.readyState < 2 || !video.videoWidth) return;
      if (now - last < DETECT_INTERVAL_MS) return;
      last = now;
      try {
        const { detections } = detector.detectForVideo(video, now);
        const boxes = detections
          .map((d) => d.boundingBox)
          .filter((bb): bb is NonNullable<typeof bb> => Boolean(bb))
          .map((bb) => toBox(bb, video.videoWidth, video.videoHeight));
        const next: Snapshot = {
          group: unionBox(boxes),
          faceHeight: largestFaceHeight(boxes),
          frameSize: { w: video.videoWidth, h: video.videoHeight },
        };
        latestRef.current = next;
        setSnapshot(next);
      } catch {
        // 한 프레임 실패는 무시
      }
    };

    (async () => {
      try {
        const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
        const create = (delegate: "GPU" | "CPU") =>
          FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.5,
          });
        try {
          detector = await create("GPU");
        } catch {
          detector = await create("CPU"); // GPU(WebGL) 불가 환경
        }
        if (cancelled) {
          detector.close();
          return;
        }
        setStatus("ready");
        raf = requestAnimationFrame(loop);
      } catch {
        if (!cancelled) setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      detector?.close();
      latestRef.current = EMPTY;
      setSnapshot(EMPTY);
      setStatus("loading");
    };
  }, [enabled, videoElRef]);

  const getFocus = useCallback(
    () => focusFromBox(latestRef.current.group, mirrored),
    [mirrored],
  );

  return {
    status: enabled ? status : "off",
    group: enabled ? snapshot.group : null,
    faceHeight: enabled ? snapshot.faceHeight : 0,
    frameSize: enabled ? snapshot.frameSize : null,
    getFocus,
  };
}
