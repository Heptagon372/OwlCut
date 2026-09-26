// 이 기기에서 바로 인쇄 (프린트 서버 없이) — 인쇄용 페이지가 용지 크기에 맞는지
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { printPageHtml } from "@/lib/print/browserPrint";
import { PRINT_SIZES, PRINT_SPEC, parseSettings } from "@/lib/settings/settings";
import { MemoryStore } from "./helpers/memoryStore";
import { enqueuePrint } from "@/lib/printer/printQueue";
import { setStoreForTest } from "@/lib/db";

describe("이 기기에서 바로 인쇄", () => {
  it("고른 용지 크기가 @page 에 mm 로 들어간다", () => {
    for (const size of PRINT_SIZES) {
      const [w, h] = PRINT_SPEC[size].mm;
      const html = printPageHtml("data:image/png;base64,AA", size);
      assert.ok(html.includes(`@page { size: ${w}mm ${h}mm; margin: 0; }`), size);
    }
  });

  it("여백 없이 한 장만, 사진은 잘리지 않게(contain)", () => {
    const html = printPageHtml("data:image/png;base64,AA", "4x6");
    assert.ok(html.includes("object-fit: contain"));
    assert.ok(html.includes("margin: 0"));
    assert.equal(html.match(/<img/g)?.length, 1);
  });

  it("설정에 인쇄 방식이 있고 기본은 자동", () => {
    assert.equal(parseSettings(undefined).printMode, "auto");
    assert.equal(parseSettings(encodeURIComponent('{"printMode":"direct"}')).printMode, "direct");
    assert.equal(parseSettings(encodeURIComponent('{"printMode":"이상한값"}')).printMode, "auto");
  });
});

describe("출력 큐에 인화 용지 전달", () => {
  const SID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

  it("부스가 고른 용지가 작업에 저장된다 (프린트 서버가 그 크기로 뽑도록)", async () => {
    const store = new MemoryStore();
    store.designs.push({ id: "d1", session_id: SID, created_at: "2026-09-26T00:00:00Z", final_image_path: "finals/x.png" });
    store.files.set("finals/x.png", { body: Buffer.from("x"), contentType: "image/png" });
    setStoreForTest(store);
    try {
      await enqueuePrint(SID, 1, "2x6");
      assert.equal(store.prints[0].paper, "2x6");
      await enqueuePrint(SID, 1, null); // 설정이 없으면 프린터 기본값으로
      assert.equal(store.prints[1].paper, null);
    } finally {
      setStoreForTest(null);
    }
  });
});
