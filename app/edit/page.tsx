"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBoothStore } from "@/lib/store/boothStore";
import { AIDesignPanel } from "@/components/ai/AIDesignPanel";
import { PhotoCanvas } from "@/components/editor/PhotoCanvas";
import { FrameSelector } from "@/components/editor/FrameSelector";
import { StickerPanel } from "@/components/editor/StickerPanel";
import { TextEditor } from "@/components/editor/TextEditor";
import { Button } from "@/components/ui/Button";
import { FILTERS, LAYOUTS, getFrame } from "@/lib/data/registry";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-muted">{children}</h3>;
}

export default function EditPage() {
  const router = useRouter();
  const { photos, design, setDesign } = useBoothStore();
  const [tab, setTab] = useState<"manual" | "ai">("manual");

  if (photos.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="text-lg text-muted">촬영된 사진이 없어요.</p>
        <Button onClick={() => router.push("/")}>처음으로</Button>
      </main>
    );
  }

  const frame = getFrame(design.frameId);

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-6 md:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex items-start justify-center">
        <div className="flex max-h-[74vh] items-center justify-center overflow-hidden rounded-2xl border border-border bg-card p-3">
          <PhotoCanvas photos={photos} design={design} className="max-h-[68vh]" />
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <SectionTitle>레이아웃</SectionTitle>
          <div className="flex gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                onClick={() => setDesign({ layoutId: l.id })}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm ${design.layoutId === l.id ? "border-accent text-foreground" : "border-border text-muted hover:text-foreground"}`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-card p-1">
          {(
            [
              ["manual", "직접 꾸미기"],
              ["ai", "AI 꾸미기 🤖"],
            ] as const
          ).map(([key, label]) => (
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

        {tab === "ai" ? (
          <AIDesignPanel
            onApply={(result, prompt, model) =>
              setDesign({ ...result, mode: "ai", prompt, aiModel: model })
            }
          />
        ) : (
          <>
            <section>
              <SectionTitle>프레임</SectionTitle>
              <FrameSelector value={design.frameId} onChange={(id) => setDesign({ frameId: id })} />
            </section>

            <section>
              <SectionTitle>필터</SectionTitle>
              <div className="grid grid-cols-3 gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setDesign({ filter: f.id })}
                    className={`rounded-xl border px-3 py-2 text-sm ${design.filter === f.id ? "border-accent text-foreground" : "border-border text-muted hover:text-foreground"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
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
                defaultColor={frame.defaultTextColor}
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
