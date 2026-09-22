"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/lib/camera/useCamera";
import { useFaceTracking } from "@/lib/tracking/useFaceTracking";
import { framingHint } from "@/lib/tracking/framing";
import { CameraView } from "@/components/camera/CameraView";
import { TrackingOverlay } from "@/components/camera/TrackingOverlay";
import { FilteredPreview } from "@/components/filters/FilteredPreview";
import { FilterPicker } from "@/components/filters/FilterPicker";
import { FilteredImage } from "@/components/filters/FilteredImage";
import { Button } from "@/components/ui/Button";
import { useBoothStore } from "@/lib/store/boothStore";
import { getFilter } from "@/lib/data/registry";
import { paramsToCss } from "@/lib/filters/cssFallback";
import { createSession } from "@/lib/api";
import type { CapturedPhoto } from "@/types/session";

const TOTAL = 4;
const SNAPSHOT_MS = 4000; // 필터 썸네일을 지금 카메라 화면으로 갱신하는 주기
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CameraPage() {
  const router = useRouter();
  const { videoRef, videoElRef, ready, error, start, capture, mirror } = useCamera({ mirror: true });
  const { sessionId, setSessionId, setPhotos, design, setDesign } = useBoothStore();

  const [phase, setPhase] = useState<"idle" | "running" | "review">("idle");
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [shots, setShots] = useState<CapturedPhoto[]>([]);
  const [trackingOn, setTrackingOn] = useState(true);
  const [glSupported, setGlSupported] = useState(true);
  const [snapshot, setSnapshot] = useState<HTMLCanvasElement | null>(null);
  const runningRef = useRef(false);

  // 촬영 전에 고른 필터 — 사진은 원본으로 찍고, 미리보기·합성에서 같은 필터를 입힌다
  const filterParams = getFilter(design.filter).params;

  // 사람 추적은 보조 기능: 실패해도 촬영은 그대로 진행
  const tracking = useFaceTracking(videoElRef, { enabled: trackingOn && ready, mirrored: mirror });
  const hint = framingHint(tracking.group, tracking.faceHeight, mirror);

  useEffect(() => {
    void start();
    if (!sessionId) void createSession().then(setSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 대기 중에는 몇 초마다 카메라 화면을 잘라 필터 썸네일 원본으로 사용 (방문자 얼굴로 미리보기)
  useEffect(() => {
    if (!ready || phase !== "idle") return;
    const take = () => {
      const v = videoElRef.current;
      if (!v || !v.videoWidth) return;
      const side = Math.min(v.videoWidth, v.videoHeight);
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      c.getContext("2d")?.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, 160, 160);
      setSnapshot(c);
    };
    const first = setTimeout(take, 600);
    const timer = setInterval(take, SNAPSHOT_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [ready, phase, videoElRef]);

  const runSequence = async () => {
    if (runningRef.current || !ready) return;
    runningRef.current = true;
    setPhase("running");
    const captured: CapturedPhoto[] = [];
    for (let i = 0; i < TOTAL; i++) {
      for (let c = 3; c >= 1; c--) {
        setCount(c);
        await sleep(850);
      }
      setCount(null);
      const focus = tracking.getFocus(); // 셔터 순간의 인물 중심 → 합성 시 크롭 기준
      const dataUrl = capture();
      setFlash(true);
      await sleep(120);
      setFlash(false);
      if (dataUrl) {
        captured.push({ dataUrl, orderIndex: captured.length, focus });
        setShots([...captured]);
      }
      await sleep(650);
    }
    setPhase("review");
    runningRef.current = false;
  };

  const retake = () => {
    setShots([]);
    setPhase("idle");
  };

  const goEdit = () => {
    setPhotos(shots);
    router.push("/edit");
  };

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-4xl">📷</p>
          <p className="mt-3 text-lg font-semibold">카메라를 시작할 수 없어요</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
        </div>
        <Button onClick={() => void start()}>다시 시도</Button>
        <Button variant="ghost" onClick={() => router.push("/")}>처음으로</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 py-6">
      <header className="text-center">
        <h1 className="text-2xl font-black">아울네컷 촬영</h1>
        <p className="text-sm text-muted">
          {phase === "review" ? "마음에 드나요?" : `4컷을 연속으로 찍어요 (${shots.length}/${TOTAL})`}
        </p>
      </header>

      {phase !== "review" ? (
        <>
          <CameraView
            videoRef={videoRef}
            mirror={mirror}
            count={count}
            flash={flash}
            shotIndex={shots.length}
            total={TOTAL}
            filterLayer={
              glSupported ? (
                <FilteredPreview
                  videoElRef={videoElRef}
                  params={filterParams}
                  intensity={design.filterIntensity}
                  mirror={mirror}
                  onUnsupported={() => setGlSupported(false)}
                />
              ) : null
            }
            videoFilterCss={glSupported ? undefined : paramsToCss(filterParams, design.filterIntensity)}
            overlay={
              tracking.status === "ready" && !flash ? (
                <TrackingOverlay
                  group={tracking.group}
                  frameSize={tracking.frameSize}
                  mirrored={mirror}
                  hint={hint}
                />
              ) : null
            }
          />
          <FilterPicker
            variant="row"
            value={design.filter}
            onChange={(id) => setDesign({ filter: id })}
            source={snapshot}
            mirror={mirror}
            disabled={phase === "running"}
          />
          <Button onClick={runSequence} disabled={!ready || phase === "running"} className="w-full">
            {phase === "running"
              ? `촬영 중… (${shots.length}/${TOTAL})`
              : ready
                ? "촬영 시작"
                : "카메라 준비 중…"}
          </Button>
          <button
            onClick={() => setTrackingOn((v) => !v)}
            disabled={phase === "running"}
            className="self-center text-xs text-muted hover:text-foreground disabled:opacity-40"
          >
            자동 프레이밍 {trackingOn ? "켜짐" : "꺼짐"}
            {trackingOn && tracking.status === "loading" && " (준비 중…)"}
            {trackingOn && tracking.status === "unavailable" && " (이 기기에선 사용 불가)"}
          </button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {shots.map((s, i) => (
              <FilteredImage
                key={i}
                src={s.dataUrl}
                filterId={design.filter}
                intensity={design.filterIntensity}
                alt={`컷 ${i + 1}`}
                className="aspect-[4/3] w-full rounded-xl border border-border object-cover"
              />
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={retake} className="flex-1">
              다시 찍기
            </Button>
            <Button onClick={goEdit} className="flex-1">
              꾸미러 가기 →
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
