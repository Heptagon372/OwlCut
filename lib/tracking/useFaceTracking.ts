"use client";
// 사람 추적 모듈 (설계도 7-2) — MediaPipe Face Landmarker (얼굴마다 478점).
// - 자동 프레이밍: 얼굴 묶음 박스 → 가이드·크롭 초점
// - AR 스티커: 눈·코·입·볼·윤곽 기준점 → One Euro 필터로 떨림 보정 → 오버레이/셰이더
// 보조 기능: 로드/검출이 실패해도 촬영 흐름에는 영향 없음 (status "unavailable" 로만 표시).
import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Focus } from "@/types/design";
import type { FaceGeometry } from "@/types/ar";
import { focusFromBox, largestFaceHeight, unionBox, type Box } from "./framing";
import { FaceSmoother, faceGeometryFromLandmarks, landmarkBox, mirrorFace } from "./landmarks";

// WASM은 postinstall 스크립트가 public/mediapipe/wasm 으로 복사 (scripts/copy-mediapipe-wasm.mjs)
export const WASM_PATH = "/mediapipe/wasm";
export const MODEL_URL =
  process.env.NEXT_PUBLIC_FACE_MODEL_URL ||
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MAX_FACES = 4;
const INTERVAL_AR_MS = 33;      // AR 효과 사용 중: ~30fps (스티커가 얼굴에 붙어 다니도록)
const INTERVAL_FRAMING_MS = 90; // 프레이밍만: ~11fps면 충분, CPU 절약
const UI_UPDATE_MS = 120;       // 화면 가이드(React 상태) 갱신 주기 — 검출은 더 자주 해도 리렌더는 여기까지만

export type TrackingStatus = "off" | "loading" | "ready" | "unavailable";

/** 최신 얼굴 (비디오 원본 좌표, 거울 반전 전). rAF 루프에서 직접 읽는다 */
export interface FacesFrame {
  faces: FaceGeometry[];
  width: number;
  height: number;
  time: number;
}

export interface FaceTrackingResult {
  status: TrackingStatus;
  group: Box | null;          // 모든 얼굴의 합집합 박스
  faceHeight: number;         // 가장 큰 얼굴 높이 (거리 판단용)
  frameSize: { w: number; h: number } | null; // 원본 비디오 해상도 (오버레이 좌표계)
  facesRef: React.RefObject<FacesFrame | null>;
  getFocus: () => Focus | null; // 캡처 순간의 크롭 초점
  getFaces: () => FaceGeometry[]; // 캡처 순간의 얼굴 기준점 (캡처 이미지 좌표 = 거울 반전 반영)
}

interface Snapshot {
  group: Box | null;
  faceHeight: number;
  frameSize: { w: number; h: number } | null;
}

const EMPTY: Snapshot = { group: null, faceHeight: 0, frameSize: null };

export function useFaceTracking(
  videoElRef: React.RefObject<HTMLVideoElement | null>,
  { enabled, mirrored, fast = false }: { enabled: boolean; mirrored: boolean; fast?: boolean },
): FaceTrackingResult {
  const [status, setStatus] = useState<TrackingStatus>("loading");
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const latestRef = useRef<Snapshot>(EMPTY);
  const facesRef = useRef<FacesFrame | null>(null);
  const fastRef = useRef(fast);

  useEffect(() => {
    fastRef.current = fast;
  }, [fast]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let landmarker: FaceLandmarker | null = null;
    let raf = 0;
    let last = 0;
    let lastUi = 0;
    let lastVideoTime = -1;
    const smoother = new FaceSmoother();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const video = videoElRef.current;
      if (!landmarker || !video || video.readyState < 2 || !video.videoWidth) return;
      if (now - last < (fastRef.current ? INTERVAL_AR_MS : INTERVAL_FRAMING_MS)) return;
      if (video.currentTime === lastVideoTime) return; // 새 프레임 없음
      last = now;
      lastVideoTime = video.currentTime;
      try {
        const { faceLandmarks } = landmarker.detectForVideo(video, now);
        const raw = faceLandmarks
          .map((lms) => faceGeometryFromLandmarks(lms))
          .filter((g): g is FaceGeometry => Boolean(g));
        const w = video.videoWidth;
        const h = video.videoHeight;
        facesRef.current = { faces: smoother.smooth(raw, now), width: w, height: h, time: now };

        if (now - lastUi >= UI_UPDATE_MS) {
          lastUi = now;
          const boxes = faceLandmarks.map((lms) => landmarkBox(lms)).filter((b): b is Box => Boolean(b));
          const next: Snapshot = {
            group: unionBox(boxes),
            faceHeight: largestFaceHeight(boxes),
            frameSize: { w, h },
          };
          latestRef.current = next;
          setSnapshot(next);
        }
      } catch {
        // 한 프레임 실패는 무시
      }
    };

    (async () => {
      try {
        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
        const create = (delegate: "GPU" | "CPU") =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numFaces: MAX_FACES,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
        try {
          landmarker = await create("GPU");
        } catch {
          landmarker = await create("CPU"); // GPU(WebGL) 불가 환경
        }
        if (cancelled) {
          landmarker.close();
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
      landmarker?.close();
      latestRef.current = EMPTY;
      facesRef.current = null;
      setSnapshot(EMPTY);
      setStatus("loading");
    };
  }, [enabled, videoElRef]);

  const getFocus = useCallback(
    () => focusFromBox(latestRef.current.group, mirrored),
    [mirrored],
  );

  const getFaces = useCallback(() => {
    const faces = facesRef.current?.faces ?? [];
    return mirrored ? faces.map(mirrorFace) : faces;
  }, [mirrored]);

  return {
    status: enabled ? status : "off",
    group: enabled ? snapshot.group : null,
    faceHeight: enabled ? snapshot.faceHeight : 0,
    frameSize: enabled ? snapshot.frameSize : null,
    facesRef,
    getFocus,
    getFaces,
  };
}
