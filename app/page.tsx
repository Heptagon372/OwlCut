"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Camera, LayoutGrid, QrCode, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";
import { LayoutThumb } from "@/components/editor/LayoutPicker";
import { useBoothStore } from "@/lib/store/boothStore";
import { createSession } from "@/lib/api";
import { FILTERS, FILTER_CATEGORIES, LAYOUTS, SHOT_COUNTS } from "@/lib/data/registry";

const SHOTS = `${SHOT_COUNTS.join("·")}컷`; // 레이아웃에 있는 촬영 매수 (예: 4·6컷)

const STEPS = [
  { no: "01", icon: Camera, title: "촬영", desc: `${SHOTS} 연속 촬영, 얼굴 자동 프레이밍` },
  { no: "02", icon: WandSparkles, title: "꾸미기", desc: "레이아웃 · 프레임 · 스티커 · AI 꾸미기" },
  { no: "03", icon: QrCode, title: "받기", desc: "QR로 폰에 저장하고 바로 출력" },
];

// 필터 수가 많은 분류 3개를 타일로
const topCategories = FILTER_CATEGORIES.map((c) => ({
  ...c,
  count: FILTERS.filter((f) => f.category === c.id).length,
}))
  .sort((a, b) => b.count - a.count)
  .slice(0, 3);

export default function Home() {
  const router = useRouter();
  const { reset, setSessionId } = useBoothStore();
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    reset();
    const id = await createSession();
    setSessionId(id);
    router.push("/camera");
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="glass-solid rounded-full px-4 py-2 text-sm font-medium text-muted">셀프 포토부스</span>
      </header>

      <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 히어로 */}
        <div className="glass flex min-h-[380px] flex-col justify-between rounded-card p-7 sm:p-10 lg:col-span-8">
          <p className="text-xs font-semibold tracking-[0.32em] text-accent-2">S.OWL PHOTO BOOTH</p>
          <div>
            <h1 className="text-[clamp(72px,12vw,156px)] font-[160] leading-[0.88] tracking-[-0.055em]">
              아울네컷
            </h1>
            <p className="mt-5 text-lg text-muted sm:text-xl">촬영하고 · 꾸미고 · QR로 바로 받기</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={start} disabled={loading} className="pr-3">
              {loading ? "준비 중…" : "촬영 시작"}
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink">
                <ArrowRight className="h-5 w-5" />
              </span>
            </Button>
            <span className="text-sm text-muted">{SHOTS} · 약 1분</span>
          </div>
        </div>

        <div className="grid gap-4 lg:col-span-4">
          {/* 필터 (검은 카드) */}
          <div className="ink flex flex-col rounded-card p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">필터</h2>
              <Sparkles className="h-5 w-5 text-ink-muted" aria-hidden />
            </div>
            <p className="mt-2 flex items-baseline gap-3">
              <span className="num text-6xl font-light">{FILTERS.length}</span>
              <span className="text-sm text-ink-muted">촬영 전 실시간 미리보기</span>
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {topCategories.map((c, i) => (
                <div
                  key={c.id}
                  className={`rounded-tile p-3 text-center ${i === 0 ? "bg-white text-ink" : "bg-white/10 text-white"}`}
                >
                  <p className="num text-3xl font-medium">{c.count}</p>
                  <p className={`text-xs ${i === 0 ? "text-muted" : "text-ink-muted"}`}>{c.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 레이아웃 */}
          <div className="glass flex flex-col rounded-card p-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">레이아웃</h2>
              <LayoutGrid className="h-5 w-5 text-muted" aria-hidden />
            </div>
            <p className="mt-2 flex items-baseline gap-3">
              <span className="num text-6xl font-light">{LAYOUTS.length}</span>
              <span className="text-sm text-muted">인생네컷 · 폴라로이드 · 스토리</span>
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2 text-ink">
              {LAYOUTS.slice(0, 4).map((l) => (
                <div key={l.id} className="rounded-xl bg-white/60 p-1.5">
                  <LayoutThumb layout={l} numbered={false} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 진행 단계 */}
        <ol className="grid gap-4 sm:grid-cols-3 lg:col-span-12">
          {STEPS.map(({ no, icon: Icon, title, desc }) => (
            <li key={no} className="glass flex items-center gap-4 rounded-card p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="flex items-baseline gap-2">
                  <span className="num text-sm text-muted">{no}</span>
                  <span className="text-lg font-semibold">{title}</span>
                </p>
                <p className="truncate text-sm text-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
