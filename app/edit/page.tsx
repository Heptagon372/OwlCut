"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Images, RotateCcw } from "lucide-react";
import { useBoothStore } from "@/lib/store/boothStore";
import { useSettings } from "@/lib/i18n/context";
import { AIDesignPanel } from "@/components/ai/AIDesignPanel";
import { PhotoCanvas } from "@/components/editor/PhotoCanvas";
import { LayoutTool, BackgroundPicker } from "@/components/editor/LayoutTool";
import { FrameSelector } from "@/components/editor/FrameSelector";
import { StickerPanel } from "@/components/editor/StickerPanel";
import { StickerLayer } from "@/components/editor/StickerLayer";
import { TextEditor } from "@/components/editor/TextEditor";
import { Section, TOOLS, ToolBar, ToolPanel, type ToolId } from "@/components/editor/EditorTools";
import { FilterPicker } from "@/components/filters/FilterPicker";
import { EffectPicker } from "@/components/filters/EffectPicker";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";
import { IdleGuard } from "@/components/kiosk/IdleGuard";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { defaultLayoutFor, getFilter, getFrame, getLayout } from "@/lib/data/registry";
import { identityOrder } from "@/lib/image/layoutGeometry";
import { getEffect } from "@/lib/ar/effects";
import { fetchModels } from "@/lib/api";
import { makeSamplePhotos } from "@/lib/dev/samplePhotos";
import { readableTextOn } from "@/lib/image/color";
import type { ModelInfo } from "@/types/ai";

export default function EditPage() {
  const router = useRouter();
  const { photos, design, setDesign, setPhotos } = useBoothStore();
  const { t, label } = useSettings();
  const [tool, setTool] = useState<ToolId>("layout");
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null); // 미리보기에서 조작 중인 스티커
  const [ai, setAi] = useState<{ models: ModelInfo[]; defaultModel: string | null } | null>(null);

  // 찍은 매수와 레이아웃 칸 수가 다르면(예: 6컷 레이아웃이 남아 있는데 4장) 그 매수의 기본 레이아웃으로
  useEffect(() => {
    if (photos.length === 0 || getLayout(design.layoutId).photoCount === photos.length) return;
    const l = defaultLayoutFor(photos.length);
    if (l.photoCount === photos.length) setDesign({ layoutId: l.id, photoOrder: identityOrder(photos.length) });
  }, [photos.length, design.layoutId, setDesign]);

  // 쓸 수 있는 AI 모델이 있을 때만 AI 도구를 보여 준다 (방문객에게 설정 안내를 보이지 않게)
  useEffect(() => {
    let alive = true;
    void fetchModels().then((r) => alive && setAi(r));
    return () => {
      alive = false;
    };
  }, []);
  const tools = useMemo(() => TOOLS.filter((t) => t.id !== "ai" || (ai?.models.length ?? 0) > 0), [ai]);

  const chooseTool = (id: ToolId) => {
    setTool(id);
    if (id !== "sticker") setSelectedSticker(null); // 다른 도구로 가면 스티커 손잡이를 치워 미리보기를 깔끔하게
  };

  if (photos.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
        <div className="glass w-full rounded-card p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
            <Images className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-xl font-semibold">{t("edit.emptyTitle")}</p>
          <Button className="mt-6" onClick={() => router.push("/")}>
            {t("common.home")}
          </Button>
          {process.env.NODE_ENV !== "production" && (
            <button
              onClick={() => setPhotos(makeSamplePhotos(getLayout(design.layoutId).photoCount))}
              className="mt-4 block w-full text-xs text-muted underline"
            >
              {t("edit.sample")}
            </button>
          )}
        </div>
      </main>
    );
  }

  const layout = getLayout(design.layoutId);
  const frame = getFrame(design.frameId);
  // AR 썸네일: 첫 자리 사진 우선, 얼굴이 잡힌 사진으로
  const first = photos[design.photoOrder?.[0] ?? 0];
  const facePhoto = first?.faces?.length ? first : photos.find((p) => p.faces?.length);
  const effect = getEffect(design.effect);

  const panel: Record<ToolId, { title: string; aside?: string; body: React.ReactNode }> = {
    layout: {
      title: t("tool.layout"),
      aside: label(layout),
      body: <LayoutTool photos={photos} design={design} onChange={setDesign} />,
    },
    frame: {
      title: t("tool.frame"),
      aside: design.backgroundColor ? t("edit.frameBgChanged", { frame: label(frame) }) : label(frame),
      body: (
        <>
          <Section>
            <FrameSelector value={design.frameId} onChange={(id) => setDesign({ frameId: id })} layout={layout} />
          </Section>
          <Section title={t("edit.bgColor")}>
            <BackgroundPicker value={design.backgroundColor} onChange={(c) => setDesign({ backgroundColor: c })} />
          </Section>
        </>
      ),
    },
    filter: {
      title: t("tool.filter"),
      aside: label(getFilter(design.filter)),
      body: (
        <>
          <Section>
            <FilterPicker
              value={design.filter}
              onChange={(id) => setDesign({ filter: id })}
              source={first?.dataUrl ?? photos[0].dataUrl}
            />
          </Section>
          <Section title={t("edit.intensity")} aside={`${Math.round(design.filterIntensity * 100)}%`}>
            <input
              type="range"
              min={0}
              max={100}
              aria-label={t("edit.filterIntensity")}
              value={Math.round(design.filterIntensity * 100)}
              onChange={(e) => setDesign({ filterIntensity: Number(e.target.value) / 100 })}
              className="w-full accent-[var(--ink)]"
              disabled={design.filter === "none"}
            />
          </Section>
        </>
      ),
    },
    effect: {
      title: t("tool.effect"),
      aside: facePhoto ? (effect ? label(effect) : t("common.none")) : t("edit.noFaceInfo"),
      body: (
        <>
          {!facePhoto && (
            <p className="mb-4 rounded-2xl bg-white/55 px-4 py-3 text-xs text-muted">
              {t("edit.noFaceHint")}
            </p>
          )}
          <EffectPicker
            value={design.effect}
            onChange={(id) => setDesign({ effect: id })}
            source={facePhoto?.dataUrl ?? null}
            faces={facePhoto?.faces}
          />
        </>
      ),
    },
    sticker: {
      title: t("tool.sticker"),
      aside: design.stickers.length ? t("edit.stickerPlaced", { n: design.stickers.length }) : t("edit.stickerHint"),
      body: (
        <StickerPanel
          value={design.stickers}
          onChange={(s) => setDesign({ stickers: s })}
          selected={selectedSticker}
          onSelect={setSelectedSticker}
        />
      ),
    },
    text: {
      title: t("tool.text"),
      body: (
        <TextEditor
          value={design.textLayers}
          onChange={(t) => setDesign({ textLayers: t })}
          defaultColor={design.backgroundColor ? readableTextOn(design.backgroundColor, frame.defaultTextColor) : frame.defaultTextColor}
        />
      ),
    },
    ai: {
      title: t("tool.ai"),
      aside: t("edit.aiAside"),
      body: ai ? (
        <AIDesignPanel
          models={ai.models}
          defaultModel={ai.defaultModel}
          onApply={(result, prompt, model) => setDesign({ ...result, mode: "ai", prompt, aiModel: model })}
        />
      ) : null,
    },
  };
  const current = panel[tools.some((t) => t.id === tool) ? tool : "layout"];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:h-dvh lg:py-6">
      <IdleGuard seconds={120} />
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <SettingsSheet />
          <Button variant="secondary" size="sm" onClick={() => router.push("/camera")}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t("edit.retake")}
          </Button>
          <Button size="sm" onClick={() => router.push("/result")} className="pr-2">
            {t("edit.finish")}
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink">
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Button>
        </div>
      </header>

      {/* 큰 화면: 한 화면에 딱 맞게 (미리보기는 늘 보이고, 도구 패널만 안에서 스크롤) */}
      <section className="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="glass grid place-items-center rounded-card p-5 lg:min-h-0">
          <PhotoCanvas
            photos={photos}
            design={design}
            className="max-h-[48vh] rounded-md shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] lg:max-h-[calc(100dvh-9.5rem)]"
            overlay={
              <StickerLayer
                layout={layout}
                stickers={design.stickers}
                selected={selectedSticker}
                onSelect={setSelectedSticker}
                onChange={(s) => setDesign({ stickers: s })}
              />
            }
          />
        </div>

        <div className="flex flex-col gap-3 lg:min-h-0">
          <ToolBar value={tool} onChange={chooseTool} tools={tools} />
          <ToolPanel title={current.title} aside={current.aside}>
            {current.body}
          </ToolPanel>
        </div>
      </section>
    </main>
  );
}
