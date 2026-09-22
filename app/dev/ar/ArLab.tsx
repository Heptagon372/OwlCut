"use client";
import { useEffect, useState } from "react";
import { EFFECTS, effectAssets } from "@/lib/ar/effects";
import { ensureAssets } from "@/lib/ar/assets";
import { effectSnapshot, mirroredCopy } from "@/lib/ar/draw";
import { CANONICAL_FACE, canonicalFaceCanvas } from "@/lib/ar/canonical";
import { faceFrame } from "@/lib/ar/geometry";
import { faceGeometryFromLandmarks, mirrorFace, transformFace } from "@/lib/tracking/landmarks";
import { MODEL_URL, WASM_PATH } from "@/lib/tracking/useFaceTracking";
import { loadImage } from "@/lib/filters/offline";
import type { FaceGeometry } from "@/types/ar";

const TILE = 360;

function rotated(img: HTMLImageElement, deg: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#777";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(img, -c.width / 2, -c.height / 2);
  return c;
}

async function detect(src: HTMLCanvasElement): Promise<FaceGeometry[]> {
  const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
  const lm = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
    runningMode: "IMAGE",
    numFaces: 4,
  });
  const res = lm.detect(src);
  lm.close();
  return res.faceLandmarks.map((l) => faceGeometryFromLandmarks(l)).filter((g): g is FaceGeometry => Boolean(g));
}

// 기준점 확인용: 얼굴 좌표계의 기준점을 점으로 표시
function anchorsTile(src: HTMLCanvasElement, faces: FaceGeometry[], w: number, h: number): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(src, 0, 0, w, h);
  for (const g of faces) {
    const f = faceFrame(g, w, h);
    for (const [name, p] of Object.entries(f.anchors)) {
      ctx.fillStyle = name.startsWith("ear") || name === "headTop" ? "#00e0ff" : "#ff2d55";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return c.toDataURL("image/jpeg", 0.85);
}

export function ArLab() {
  const [status, setStatus] = useState("준비 중…");
  const [tiles, setTiles] = useState<{ id: string; label: string; url: string }[]>([]);
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const url = q.get("src");
      let src: HTMLCanvasElement;
      let faces: FaceGeometry[];
      if (url) {
        setStatus("사진 불러오는 중…");
        src = rotated(await loadImage(url), Number(q.get("rotate") ?? 0));
        setStatus("얼굴 찾는 중…");
        faces = await detect(src);
      } else {
        src = canonicalFaceCanvas(720);
        faces = [CANONICAL_FACE];
      }
      if (q.get("mirror") === "1") {
        src = mirroredCopy(src);
        faces = faces.map(mirrorFace);
      }
      // &zoom=3 → 첫 얼굴 주변만 크게 (작은 얼굴에서 왜곡 확인용)
      const zoom = Number(q.get("zoom") ?? 1);
      if (zoom > 1 && faces[0]) {
        const f = faceFrame(faces[0], src.width, src.height).anchors.faceCenter;
        const cw = src.width / zoom;
        const ch = src.height / zoom;
        const sx = Math.min(Math.max(f.x - cw / 2, 0), src.width - cw);
        const sy = Math.min(Math.max(f.y - ch / 2, 0), src.height - ch);
        const c = document.createElement("canvas");
        c.width = src.width;
        c.height = src.height;
        c.getContext("2d")!.drawImage(src, sx, sy, cw, ch, 0, 0, c.width, c.height);
        src = c;
        faces = faces.map((g) =>
          transformFace(g, (p) => ({ x: (p.x * c.width - sx) / cw, y: (p.y * c.height - sy) / ch })),
        );
      }
      await ensureAssets(EFFECTS.flatMap((e) => effectAssets(e)));
      const h = Math.round((TILE * src.height) / src.width);
      setRatio(src.width / src.height);
      const only = q.get("only")?.split(",").filter(Boolean); // &only=cat,dog → 그 효과만
      setTiles([
        { id: "anchors", label: "기준점", url: anchorsTile(src, faces, TILE, h) },
        { id: "none", label: "원본", url: effectSnapshot(src, { width: TILE, height: h, effect: null, faces }) },
        ...EFFECTS.filter((e) => !only?.length || only.includes(e.id)).map((e) => ({
          id: e.id,
          label: e.label,
          url: effectSnapshot(src, { width: TILE, height: h, effect: e, faces }),
        })),
      ]);
      setStatus(`얼굴 ${faces.length}명 · 효과 ${EFFECTS.length}종`);
      document.title = "AR LAB READY"; // 헤드리스 캡처 스크립트가 기다리는 신호
    })().catch((e) => {
      setStatus(`실패: ${e instanceof Error ? e.message : String(e)}`);
      document.title = "AR LAB FAILED";
    });
  }, []);

  return (
    <main className="p-4">
      <p className="mb-3 text-sm font-semibold" data-status>
        AR 점검판 · {status}
      </p>
      <div className="grid grid-cols-4 gap-2" style={{ width: TILE * 4 + 24 }}>
        {tiles.map((t) => (
          <figure key={t.id} className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.url} alt={t.label} width={TILE} style={{ aspectRatio: ratio }} className="block rounded" />
            <figcaption className="text-xs">{t.label}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
