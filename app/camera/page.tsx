"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCamera } from "@/lib/camera/useCamera";
import { CameraView } from "@/components/camera/CameraView";
import { Button } from "@/components/ui/Button";
import { useBoothStore } from "@/lib/store/boothStore";
import { createSession } from "@/lib/api";
import type { CapturedPhoto } from "@/types/session";

const TOTAL = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CameraPage() {
  const router = useRouter();
  const { videoRef, ready, error, start, capture, mirror } = useCamera({ mirror: true });
  const { sessionId, setSessionId, setPhotos } = useBoothStore();

  const [phase, setPhase] = useState<"idle" | "running" | "review">("idle");
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [shots, setShots] = useState<string[]>([]);
  const runningRef = useRef(false);

  useEffect(() => {
    void start();
    if (!sessionId) void createSession().then(setSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSequence = async () => {
    if (runningRef.current || !ready) return;
    runningRef.current = true;
    setPhase("running");
    const captured: string[] = [];
    for (let i = 0; i < TOTAL; i++) {
      for (let c = 3; c >= 1; c--) {
        setCount(c);
        await sleep(850);
      }
      setCount(null);
      setFlash(true);
      const shot = capture();
      await sleep(120);
      setFlash(false);
      if (shot) {
        captured.push(shot);
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
    const photos: CapturedPhoto[] = shots.map((dataUrl, orderIndex) => ({
      dataUrl,
      orderIndex,
    }));
    setPhotos(photos);
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
          />
          <Button onClick={runSequence} disabled={!ready || phase === "running"} className="w-full">
            {phase === "running"
              ? `촬영 중… (${shots.length}/${TOTAL})`
              : ready
                ? "촬영 시작"
                : "카메라 준비 중…"}
          </Button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {shots.map((s, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={s}
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
