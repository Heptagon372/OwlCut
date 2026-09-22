"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBoothStore } from "@/lib/store/boothStore";
import { AIDesignPanel } from "@/components/ai/AIDesignPanel";
import { PhotoCanvas } from "@/components/editor/PhotoCanvas";
import { ScreenPanel } from "@/components/editor/ScreenPanel";
import { FrameSelector } from "@/components/editor/FrameSelector";
import { StickerPanel } from "@/components/editor/StickerPanel";
import { TextEditor } from "@/components/editor/TextEditor";
import { Button } from "@/components/ui/Button";
import { FilterPicker } from "@/components/filters/FilterPicker";
import { getFrame } from "@/lib/data/registry";
import { makeSamplePhotos } from "@/lib/dev/samplePhotos";
import { readableTextOn } from "@/lib/image/color";

type Tab = "screen" | "decorate" | "ai";

const TABS: [Tab, string][] = [
  ["screen", "화면 구성"],
  ["decorate", "꾸미기"],
  ["ai", "AI 꾸미기 🤖"],
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-muted">{children}</h3>;
}

export default function EditPage() {
  const router = useRouter();
  const { photos, design, setDesign, setPhotos } = useBoothStore();
  const [tab, setTab] = useState<Tab>("screen");

  if (photos.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-lg text-muted">촬영된 사진이 없어요.</p>
        <Button onClick={() => router.push("/")}>처음으로</Button>
        {process.env.NODE_ENV !== "production" && (
          <button onClick={() => setPhotos(makeSamplePhotos())} className="text-xs text-muted underline">
            샘플 사진으로 편집기 체험 (개발용)
          </button>
        )}
      </main>
    );
  }

  const frame = getFrame(design.frameId);

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex items-start justify-center">
        <div className="flex max-h-[74vh] items-center justify-center overflow-hidden rounded-2xl border border-border bg-card p-3 md:sticky md:top-6">
          <PhotoCanvas photos={photos} design={design} className="max-h-[68vh]" />
        </div>
      </div>

      <div className="space-y-6">
        <div role="tablist" className="grid grid-cols-3 gap-1 rounded-2xl bg-card p-1">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-xl py-2 text-sm font-semibold transition ${tab === key ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "screen" && <ScreenPanel photos={photos} design={design} onChange={setDesign} />}

        {tab === "ai" && (
          <AIDesignPanel
            onApply={(result, prompt, model) =>
              setDesign({ ...result, mode: "ai", prompt, aiModel: model })
            }
          />
        )}

        {tab === "decorate" && (
          <>
            <section>
              <SectionTitle>프레임</SectionTitle>
              <FrameSelector value={design.frameId} onChange={(id) => setDesign({ frameId: id })} />
            </section>

            <section>
              <SectionTitle>필터 (촬영 전에 고른 필터를 바꿀 수 있어요)</SectionTitle>
              <FilterPicker
                value={design.filter}
                onChange={(id) => setDesign({ filter: id })}
                source={photos[design.photoOrder?.[0] ?? 0]?.dataUrl ?? photos[0].dataUrl}
              />
              <label className="mt-3 block">
                <span className="mb-1 flex justify-between text-sm font-semibold text-muted">
                  필터 강도
                  <span className="font-normal tabular-nums">{Math.round(design.filterIntensity * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(design.filterIntensity * 100)}
                  onChange={(e) => setDesign({ filterIntensity: Number(e.target.value) / 100 })}
                  className="w-full accent-[var(--accent)]"
                  disabled={design.filter === "none"}
                />
              </label>
            </section>

            <section>
              <SectionTitle>스티커</SectionTitle>
              <StickerPanel value={design.stickers} onChange={(s) => setDesign({ stickers: s })} />
            </section>

            <section>
              <SectionTitle>텍스트</SectionTitle>
              <TextEditor
                value={design.textLayers}
                onChange={(t) => setDesign({ textLayers: t })}
                defaultColor={
                  design.backgroundColor
                    ? readableTextOn(design.backgroundColor, frame.defaultTextColor)
                    : frame.defaultTextColor
                }
              />
            </section>
          </>
        )}

        <div className="flex gap-3 pb-4">
          <Button variant="secondary" onClick={() => router.push("/camera")} className="flex-1">
            ← 재촬영
          </Button>
          <Button onClick={() => router.push("/result")} className="flex-1">
            완성하기 →
          </Button>
        </div>
      </div>
    </main>
  );
}
