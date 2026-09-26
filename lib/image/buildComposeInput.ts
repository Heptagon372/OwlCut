// 스토어의 사진 + 디자인 상태 → 합성 엔진 입력. 미리보기(PhotoCanvas)와 최종 합성(result)이 공유.
import { getFrame, getLayout } from "@/lib/data/registry";
import type { ComposeInput, DesignState } from "@/types/design";
import type { CapturedPhoto } from "@/types/session";

export function buildComposeInput(photos: CapturedPhoto[], design: DesignState): ComposeInput {
  return {
    photos: photos.map((p) => p.dataUrl),
    focuses: photos.map((p) => p.focus),
    layout: getLayout(design.layoutId),
    frame: getFrame(design.frameId),
    stickers: design.stickers,
    textLayers: design.textLayers,
    filter: design.filter,
    filterIntensity: design.filterIntensity,
    effect: design.effect,
    retouch: design.retouch,
    photoFaces: photos.map((p) => p.faces),
    photoOrder: design.photoOrder,
    photoAdjust: design.photoAdjust,
    slotSpacing: design.slotSpacing,
    slotRounding: design.slotRounding,
    backgroundColor: design.backgroundColor,
  };
}
