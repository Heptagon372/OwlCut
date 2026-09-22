"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Frame, Images, RotateCcw, Smile, Sparkles, SunMedium, Type } from "lucide-react";
import { useBoothStore } from "@/lib/store/boothStore";
import { AIDesignPanel } from "@/components/ai/AIDesignPanel";
import { PhotoCanvas } from "@/components/editor/PhotoCanvas";
import { ScreenPanel } from "@/components/editor/ScreenPanel";
import { FrameSelector } from "@/components/editor/FrameSelector";
import { StickerPanel } from "@/components/editor/StickerPanel";
import { TextEditor } from "@/components/editor/TextEditor";
import { FilterPicker } from "@/components/filters/FilterPicker";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { Logo } from "@/components/brand/Logo";
import { IdleGuard } from "@/components/kiosk/IdleGuard";
import { getFilter, getFrame, getLayout } from "@/lib/data/registry";
import { makeSamplePhotos } from "@/lib/dev/samplePhotos";
import { readableTextOn } from "@/lib/image/color";

type Tab = "screen" | "decorate" | "ai";

const TABS: { id: Tab; label: React.ReactNode }[] = [
  { id: "screen", label: "화면 구성" },
  { id: "decorate", label: "꾸미기" },
  {
    id: "ai",
    label: (
      <>
        <Sparkles className="h-4 w-4" aria-hidden /> AI
      </>
    ),
  },
];

export default function EditPage() {
  const router = useRouter();
  const { photos, design, setDesign, setPhotos } = useBoothStore();
  const [tab, setTab] = useState<Tab>("screen");

  if (photos.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="glass w-full rounded-card p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
            <Images className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-xl font-semibold">촬영된 사진이 없어요</p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            처음으로
          </Button>
          {process.env.NODE_ENV !== "production" && (
            <button onClick={() => setPhotos(makeSamplePhotos())} className="mt-4 block w-full text-xs text-muted underline">
              샘플 사진으로 편집기 체험 (개발용)
            </button>
          )}
        </div>
      </main>
    );
  }

  const frame = getFrame(design.frameId);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:py-8">
      <IdleGuard seconds={120} />
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push("/camera")}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            재촬영
          </Button>
          <Button size="sm" onClick={() => router.push("/result")} className="pr-2">
            완성하기
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink">
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Button>
        </div>
      </header>

      <section className="grid flex-1 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* 미리보기 */}
        <div className="glass flex flex-col gap-3 rounded-card p-4 lg:sticky lg:top-6">
          <div className="grid min-h-[50vh] place-items-center rounded-[22px] bg-white/35 p-4">
            <PhotoCanvas photos={photos} design={design} className="max-h-[66vh] rounded-md shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]" />
          </div>
          <div className="flex flex-wrap gap-2 px-1 text-xs">
            <span className="rounded-full bg-ink px-3 py-1.5 font-semibold text-white">{getLayout(design.layoutId).label}</span>
            <span className="rounded-full bg-white/70 px-3 py-1.5 font-medium">프레임 · {frame.label}</span>
            <span className="rounded-full bg-white/70 px-3 py-1.5 font-medium">필터 · {getFilter(design.filter).label}</span>
          </div>
        </div>

        {/* 편집 패널 */}
        <div className="flex flex-col gap-4">
          <Segmented label="편집 메뉴" items={TABS} value={tab} onChange={setTab} />

          {tab === "screen" && <ScreenPanel photos={photos} design={design} onChange={setDesign} />}

          {tab === "ai" && (
            <AIDesignPanel
              onApply={(result, prompt, model) => setDesign({ ...result, mode: "ai", prompt, aiModel: model })}
            />
          )}

          {tab === "decorate" && (
            <>
              <Panel title="필터" icon={<SunMedium className="h-4 w-4" />} aside="촬영 전에 고른 필터">
                <FilterPicker
                  value={design.filter}
                  onChange={(id) => setDesign({ filter: id })}
                  source={photos[design.photoOrder?.[0] ?? 0]?.dataUrl ?? photos[0].dataUrl}
                />
                <label className="mt-4 block">
                  <span className="mb-1.5 flex justify-between text-sm font-medium">
                    필터 강도
                    <span className="num text-muted">{Math.round(design.filterIntensity * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(design.filterIntensity * 100)}
                    onChange={(e) => setDesign({ filterIntensity: Number(e.target.value) / 100 })}
                    className="w-full accent-[var(--ink)]"
                    disabled={design.filter === "none"}
                  />
                </label>
              </Panel>

              <Panel title="프레임" icon={<Frame className="h-4 w-4" />}>
                <FrameSelector value={design.frameId} onChange={(id) => setDesign({ frameId: id })} />
              </Panel>

              <Panel title="스티커" icon={<Smile className="h-4 w-4" />}>
                <StickerPanel value={design.stickers} onChange={(s) => setDesign({ stickers: s })} />
              </Panel>

              <Panel title="문구" icon={<Type className="h-4 w-4" />}>
                <TextEditor
                  value={design.textLayers}
                  onChange={(t) => setDesign({ textLayers: t })}
                  defaultColor={
                    design.backgroundColor
                      ? readableTextOn(design.backgroundColor, frame.defaultTextColor)
                      : frame.defaultTextColor
                  }
                />
              </Panel>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
