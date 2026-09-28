// 이 PC(디스크) 저장소 — 표 저장·멱등 규칙·서명 URL 을 확인한다.
// 서명 URL 은 Supabase 의 서명 URL 자리이므로, 만료·위조는 반드시 막혀야 한다.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { LocalStore } from "@/lib/db/localStore";
import { publicBaseUrl } from "@/lib/net/publicUrl";

let dir = "";
let store: LocalStore;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "owlcut-local-"));
  store = new LocalStore(dir);
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const png = Buffer.from("89504e470d0a1a0a", "hex");
const params = (url: string) => new URL(url, "http://booth.test").searchParams;

describe("LocalStore", () => {
  it("세션을 저장하고 다시 켜도 남아 있다", async () => {
    await store.insertSession({ id: "s1", status: "created", expires_at: "2099-01-01T00:00:00.000Z" });
    await store.updateSession("s1", { status: "composed" });

    const again = new LocalStore(dir); // 서버 재시작
    assert.equal((await again.getSession("s1"))?.status, "composed");
  });

  it("완성 디자인은 세션당 1행 (재시도해도 완성 수가 늘지 않는다)", async () => {
    assert.equal(await store.saveFinalDesign("s1", { final_image_path: "finals/s1.png", filter: "none" }), "inserted");
    assert.equal(await store.saveFinalDesign("s1", { final_image_path: "finals/s1.png", filter: "mono" }), "updated");
    assert.equal(await store.countFinalDesignsSince("2000-01-01T00:00:00.000Z"), 1);
  });

  it("출력 작업은 한 프린터만 가져간다", async () => {
    const { id } = await store.insertPrint({ session_id: "s1", image_path: "finals/s1.png", copies: 1 });
    assert.ok(await store.claimPrint(id, "printer-a"));
    assert.equal(await store.claimPrint(id, "printer-b"), null);
    assert.equal((await store.finishPrint(id, "printer-b", "completed")), null); // 남의 작업은 못 끝낸다
    assert.deepEqual(await store.finishPrint(id, "printer-a", "completed"), { session_id: "s1" });
  });

  it("서명 URL 로만 파일을 내준다", async () => {
    await store.upload("finals/s1.png", png, "image/png");
    const url = await store.signedUrl("finals/s1.png", 600);
    assert.ok(url && url.startsWith("/api/file?"));

    const got = await store.readSigned(params(url!));
    assert.ok(got);
    assert.equal(got!.contentType, "image/png");
    assert.deepEqual([...got!.body], [...png]);
  });

  it("위조·만료된 서명은 거절한다", async () => {
    await store.upload("finals/s1.png", png, "image/png");
    const url = (await store.signedUrl("finals/s1.png", 600))!;

    const tampered = params(url);
    tampered.set("p", "finals/other.png");
    assert.equal(await store.readSigned(tampered), null);

    const badSig = params(url);
    badSig.set("s", "zzzz");
    assert.equal(await store.readSigned(badSig), null);

    assert.equal(await store.readSigned(params(url), Date.now() + 601_000), null); // 유효시간 지남
  });

  it("없는 파일은 서명 URL 을 만들지 않는다", async () => {
    assert.equal(await store.signedUrl("finals/none.png", 600), null);
    await store.upload("finals/s1.png", png, "image/png");
    assert.equal(await store.signedUrl("finals/s1.png", 0), null); // 이미 만료
  });

  it("저장 폴더 밖으로 나가는 경로는 받지 않는다", async () => {
    await expect(store.upload("../escape.png", png, "image/png")).rejects.toThrow();
    assert.equal(await store.signedUrl("../../secret", 600), null);
  });

  it("파일 목록·삭제 (없는 파일은 세지 않는다)", async () => {
    await store.upload("photos/s1/0.jpg", png, "image/jpeg");
    await store.upload("photos/s1/1.jpg", png, "image/jpeg");
    assert.deepEqual((await store.listFiles("photos/s1", 10)).sort(), ["0.jpg", "1.jpg"]);
    assert.equal(await store.removeFiles(["photos/s1/0.jpg", "photos/s1/none.jpg"]), 1);
    assert.deepEqual(await store.listFiles("photos/s1", 10), ["1.jpg"]);
  });
});

describe("publicBaseUrl", () => {
  it("NEXT_PUBLIC_APP_URL 이 있으면 그걸 쓴다", () => {
    assert.equal(publicBaseUrl("http://localhost:3000/api/final", "https://owlcut.example/"), "https://owlcut.example");
  });
  it("localhost 로 들어오면 폰이 열 수 있는 LAN 주소로 바꾼다", () => {
    assert.equal(publicBaseUrl("http://localhost:3000/api/final", "", "192.168.0.7"), "http://192.168.0.7:3000");
  });
  it("이미 LAN 주소로 들어왔으면 그대로", () => {
    assert.equal(publicBaseUrl("http://192.168.0.7:3000/api/final", "", "192.168.0.9"), "http://192.168.0.7:3000");
  });
  it("LAN 주소를 못 찾으면 들어온 주소 그대로", () => {
    assert.equal(publicBaseUrl("http://localhost:3000/api/final", "", null), "http://localhost:3000");
  });
});
