"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/lib/camera/useCamera";
import { useFaceTracking } from "@/lib/tracking/useFaceTracking";
import { framingHint } from "@/lib/tracking/framing";
import { transformFace } from "@/lib/tracking/landmarks";
import { CameraView } from "@/components/camera/CameraView";
import { TrackingOverlay } from "@/components/camera/TrackingOverlay";
import { AROverlay } from "@/components/camera/AROverlay";
import { FilteredPreview } from "@/components/filters/FilteredPreview";
import { FilterPicker } from "@/components/filters/FilterPicker";
import { EffectPicker } from "@/components/filters/EffectPicker";
import { FilteredImage } from "@/components/filters/FilteredImage";
import { Button, IconButton } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Segmented } from "@/components/ui/Segmented";
import { Logo } from "@/components/brand/Logo";
import { IdleGuard } from "@/components/kiosk/IdleGuard";
import { ArrowRight, Camera as CameraIcon, CameraOff, RotateCcw, ScanFace, X } from "lucide-react";
import { useBoothStore } from "@/lib/store/boothStore";
import { getFilter } from "@/lib/data/registry";
import { getEffect, NO_EFFECT } from "@/lib/ar/effects";
import { paramsToCss } from "@/lib/filters/cssFallback";
import { createSession } from "@/lib/api";
import type { CapturedPhoto } from "@/types/session";
import type { FaceGeometry } from "@/types/ar";

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
  const [snapshot, setSnapshot] = useState<{ canvas: HTMLCanvasElement; faces: FaceGeometry[] } | null>(null);
  const [pickerTab, setPickerTab] = useState<"filter" | "effect">("filter");
  const runningRef = useRef(false);

  // 촬영 전에 고른 필터·AR 효과 — 사진은 원본으로 찍고, 미리보기·합성에서 같은 효과를 입힌다
  const filterParams = getFilter(design.filter).params;
  const effectOn = design.effect !== NO_EFFECT;

  // 사람 추적은 보조 기능: 실패해도 촬영은 그대로 진행. AR 효과를 쓰면 프레이밍을 꺼도 추적은 켜 둔다.
  const { status: trackingStatus, group, faceHeight, frameSize, facesRef, getFocus, getFaces } = useFaceTracking(
    videoElRef,
    { enabled: (trackingOn || effectOn) && ready, mirrored: mirror, fast: effectOn },
  );
  const hint = framingHint(group, faceHeight, mirror);

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
      const sx = (v.videoWidth - side) / 2;
      const sy = (v.videoHeight - side) / 2;
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      c.getContext("2d")?.drawImage(v, sx, sy, side, side, 0, 0, 160, 160);
      // AR 효과 썸네일용: 같은 순간의 얼굴 좌표를 정사각형 크롭 기준으로 옮김
      const faces = (facesRef.current?.faces ?? []).map((g) =>
        transformFace(g, (p) => ({ x: (p.x * v.videoWidth - sx) / side, y: (p.y * v.videoHeight - sy) / side })),
      );
      setSnapshot({ canvas: c, faces });
    };
    const first = setTimeout(take, 600);
    const timer = setInterval(take, SNAPSHOT_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [ready, phase, videoElRef, facesRef]);

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
      const focus = trackingOn ? getFocus() : null; // 셔터 순간의 인물 중심 → 합성 시 크롭 기준
      const faces = getFaces(); // 셔터 순간의 얼굴 기준점 → 촬영 후에도 AR 효과를 바꿔 적용
      const dataUrl = capture();
      setFlash(true);
      await sleep(120);
      setFlash(false);
      if (dataUrl) {
        captured.push({ dataUrl, orderIndex: captured.length, focus, faces });
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
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="glass w-full rounded-card p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
            <CameraOff className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-xl font-semibold">카메라를 시작할 수 없어요</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/")}>처음으로</Button>
            <Button onClick={() => void start()}>다시 시도</Button>
          </div>
        </div>
      </main>
    );
  }

  const effectLabel = getEffect(design.effect)?.label;
  const filterLabel = getFilter(design.filter).label + (effectLabel ? ` · ${effectLabel}` : "");
  const statusText =
    phase === "review"
      ? "마음에 드나요?"
      : phase === "running"
        ? "카메라를 봐 주세요"
        : ready
          ? "준비되면 촬영 시작을 눌러요"
          : "카메라 준비 중…";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:py-8">
      {/* 4컷 촬영 중에는 화면을 만지지 않으므로 멈춤 */}
      <IdleGuard seconds={90} enabled={phase !== "running"} />
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="glass-solid hidden rounded-full px-4 py-2 text-sm font-medium sm:inline">
            필터 · {filterLabel}
          </span>
          <IconButton aria-label="처음으로" onClick={() => router.push("/")}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* 왼쪽: 뷰파인더 또는 촬영 결과 */}
        <div className="glass rounded-card p-3">
          {phase !== "review" ? (
            <CameraView
            videoRef={videoRef}
            mirror={mirror}
            count={count}
            flash={flash}
            shotIndex={shots.length}
            total={TOTAL}
            filterLayer={
              <>
                {glSupported && (
                  <FilteredPreview
                    videoElRef={videoElRef}
                    params={filterParams}
                    intensity={design.filterIntensity}
                    mirror={mirror}
                    effectId={design.effect}
                    facesRef={facesRef}
                    onUnsupported={() => setGlSupported(false)}
                  />
                )}
                {effectOn && (
                  <AROverlay videoElRef={videoElRef} facesRef={facesRef} effectId={design.effect} mirror={mirror} />
                )}
              </>
            }
            videoFilterCss={glSupported ? undefined : paramsToCss(filterParams, design.filterIntensity)}
            overlay={
              trackingOn && trackingStatus === "ready" && !flash ? (
                <TrackingOverlay
                  group={group}
                  frameSize={frameSize}
                  mirrored={mirror}
                  hint={hint}
                />
              ) : null
            }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {shots.map((s, i) => (
                <div key={i} className="relative">
                  <FilteredImage
                    src={s.dataUrl}
                    filterId={design.filter}
                    intensity={design.filterIntensity}
                    effectId={design.effect}
                    faces={s.faces}
                    alt={`컷 ${i + 1}`}
                    className="aspect-[4/3] w-full rounded-[18px] object-cover"
                  />
                  <span className="num ink-glass absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 진행 상태 · 필터 · 셔터 */}
        <div className="flex flex-col gap-4">
          <div className="ink flex items-center gap-5 rounded-card p-5">
            <ProgressRing value={shots.length / TOTAL} size={76} stroke={6} tone="light" label={`${shots.length}/${TOTAL}컷`}>
              <span className="num text-lg font-semibold">
                {shots.length}
                <span className="text-ink-muted">/{TOTAL}</span>
              </span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="text-lg font-semibold">4컷 촬영</p>
              <p className="text-sm text-ink-muted" aria-live="polite">{statusText}</p>
            </div>
          </div>

          {phase !== "review" ? (
            <>
              <div className="glass rounded-card p-5">
                <Segmented
                  label="필터 또는 AR 스티커"
                  items={[
                    { id: "filter", label: "필터" },
                    { id: "effect", label: "AR 스티커" },
                  ]}
                  value={pickerTab}
                  onChange={setPickerTab}
                  className="mb-3"
                />
                {pickerTab === "filter" ? (
                  <FilterPicker
                    variant="row"
                    value={design.filter}
                    onChange={(id) => setDesign({ filter: id })}
                    source={snapshot?.canvas ?? null}
                    mirror={mirror}
                    disabled={phase === "running"}
                  />
                ) : (
                  <EffectPicker
                    variant="row"
                    value={design.effect}
                    onChange={(id) => setDesign({ effect: id })}
                    source={snapshot?.canvas ?? null}
                    faces={snapshot?.faces}
                    mirror={mirror}
                    disabled={phase === "running"}
                  />
                )}
                <p className="mt-2 text-xs text-muted">찍은 뒤에도 바꿀 수 있어요</p>
              </div>

              <Button size="lg" onClick={runSequence} disabled={!ready || phase === "running"} className="w-full">
                <CameraIcon className="h-5 w-5" aria-hidden />
                {phase === "running" ? `촬영 중 · ${shots.length}/${TOTAL}` : ready ? "촬영 시작" : "카메라 준비 중…"}
              </Button>

              <button
                role="switch"
                aria-checked={trackingOn}
                onClick={() => setTrackingOn((v) => !v)}
                disabled={phase === "running"}
                className="glass-solid flex items-center justify-between rounded-full py-2 pl-5 pr-2 text-sm disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ScanFace className="h-4 w-4 text-muted" aria-hidden />
                  자동 프레이밍
                  {trackingOn && trackingStatus === "loading" && <span className="text-muted">· 준비 중</span>}
                  {trackingOn && trackingStatus === "unavailable" && <span className="text-muted">· 사용 불가</span>}
                </span>
                <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${trackingOn ? "bg-ink" : "bg-black/15"}`}>
                  <span className={`h-5 w-5 rounded-full bg-white shadow transition ${trackingOn ? "translate-x-5" : ""}`} />
                </span>
              </button>
            </>
          ) : (
            <div className="glass flex flex-col gap-2 rounded-card p-5">
              <p className="mb-1 text-sm text-muted">필터 · {filterLabel}</p>
              <Button size="lg" onClick={goEdit} className="w-full">
                꾸미러 가기
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Button>
              <Button variant="secondary" onClick={retake} className="w-full">
                <RotateCcw className="h-4 w-4" aria-hidden />
                다시 찍기
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
