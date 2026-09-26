// 세션 쓰기 권한(업로드 토큰)과 업로드 이미지 검사 — QA 코드 리뷰에서 나온 보안 문제의 재발 방지
import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { authorizeSessionWrite, hashToken, insertSession, isToken, tokenMatches } from "@/lib/storage/sessionAuth";
import { MAX_IMAGE_BYTES, decodeImage } from "@/lib/image/dataurl";
import { localSession } from "@/lib/api";
import { MemoryStore } from "./helpers/memoryStore";
import type { SessionRow } from "@/lib/db/store";

const SID = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";
const TOKEN = "kiosk-secret-token-0123456789";

// 저장소 흉내: 세션 한 줄 + '예전 스키마(컬럼 없음)' 흉내
function fakeStore(row: SessionRow | null, opts: { missingColumn?: boolean } = {}) {
  const store = new MemoryStore();
  if (row) {
    // 컬럼이 없던 시절 = 해시 자리가 undefined (null 은 '아직 토큰이 없다'는 뜻이라 다르다)
    store.sessions.set(row.id, opts.missingColumn ? { ...row, upload_token_hash: undefined } : row);
  }
  return store;
}

describe("세션 쓰기 권한 (업로드 토큰)", () => {
  const hash = hashToken(TOKEN);

  it("토큰이 맞아야 쓸 수 있다 — QR 로 id 만 본 사람은 거절", async () => {
    const row = { id: SID, status: "composed", expires_at: "2026-09-23T02:00:00Z", upload_token_hash: hash };
    assert.deepEqual(await authorizeSessionWrite(fakeStore(row), SID, undefined), { ok: false, httpStatus: 403, error: "forbidden" });
    assert.deepEqual(await authorizeSessionWrite(fakeStore(row), SID, "wrong-token-but-long-enough"), { ok: false, httpStatus: 403, error: "forbidden" });
    const ok = await authorizeSessionWrite(fakeStore(row), SID, TOKEN);
    assert.deepEqual(ok, { ok: true, exists: true, status: "composed", expiresAt: "2026-09-23T02:00:00Z", claim: false });
  });

  it("만료된 세션은 토큰이 있어도 되살리지 않음", async () => {
    const r = await authorizeSessionWrite(fakeStore({ id: SID, status: "expired", upload_token_hash: hash }), SID, TOKEN);
    assert.deepEqual(r, { ok: false, httpStatus: 410, error: "expired" });
  });

  it("없는 세션(오프라인에서 만든 id)은 새로 만들 수 있음", async () => {
    assert.deepEqual(await authorizeSessionWrite(fakeStore(null), SID, TOKEN), { ok: true, exists: false });
  });

  it("해시가 없던 세션은 처음 온 토큰으로 등록(claim)", async () => {
    const r = await authorizeSessionWrite(fakeStore({ id: SID, status: "created", expires_at: null, upload_token_hash: null }), SID, TOKEN);
    assert.equal(r.ok && r.exists && r.claim, true);
  });

  it("schema.sql 을 다시 실행하기 전(컬럼 없음): 막지 않고 토큰 확인만 건너뜀, 만료는 여전히 막음", async () => {
    const ok = await authorizeSessionWrite(fakeStore({ id: SID, status: "composed", expires_at: null }, { missingColumn: true }), SID, undefined);
    assert.equal(ok.ok, true);
    const expired = await authorizeSessionWrite(fakeStore({ id: SID, status: "expired", expires_at: null }, { missingColumn: true }), SID, TOKEN);
    assert.equal(expired.ok, false);
  });

  it("새 세션 행에는 토큰 원문이 아니라 해시만", async () => {
    const store = fakeStore(null);
    await insertSession(store, { id: SID, status: "created" }, TOKEN);
    assert.equal(store.sessions.get(SID)?.upload_token_hash, hash);
    assert.ok(!JSON.stringify([...store.sessions.values()]).includes(TOKEN));
    // 토큰이 없으면(예전 부스) 해시 없이 그냥 만든다
    const plain = fakeStore(null);
    await insertSession(plain, { id: SID, status: "created" }, undefined);
    assert.equal(plain.sessions.get(SID)?.upload_token_hash, undefined);
  });

  it("토큰 비교·형식", () => {
    assert.equal(tokenMatches(TOKEN, hashToken(TOKEN)), true);
    assert.equal(tokenMatches("short", hashToken("short")), false); // 너무 짧은 값은 토큰으로 안 봄
    assert.equal(isToken(123), false);
    const s = localSession();
    assert.ok(isToken(s.token) && /^[A-Za-z0-9_-]+$/.test(s.token), s.token);
    assert.notEqual(localSession().token, s.token);
  });
});

describe("업로드 이미지 검사", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
  const url = (type: string, b: Buffer) => `data:${type};base64,${b.toString("base64")}`;

  it("PNG·JPEG 만, 형식은 파일 앞부분으로 판단", () => {
    assert.equal(decodeImage(url("image/png", png))?.contentType, "image/png");
    assert.equal(decodeImage(url("image/jpeg", jpeg))?.contentType, "image/jpeg");
    assert.equal(decodeImage(url("image/png", jpeg))?.contentType, "image/jpeg"); // 이름표가 틀려도 실제 내용으로
  });

  it("이미지로 위장한 HTML·다른 형식·빈 값은 거절", () => {
    assert.equal(decodeImage(url("image/png", Buffer.from("<html><script>alert(1)</script></html>"))), null);
    assert.equal(decodeImage(url("text/html", png)), null);
    assert.equal(decodeImage("data:image/png;base64,"), null);
    assert.equal(decodeImage("not a data url"), null);
    assert.equal(decodeImage(42), null);
  });

  it("너무 큰 파일은 거절", () => {
    const big = "data:image/png;base64," + "A".repeat(Math.ceil(MAX_IMAGE_BYTES * 1.4));
    assert.equal(decodeImage(big), null);
  });
});
