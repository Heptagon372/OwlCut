// 로컬 프린트 서버 통합 테스트: 가짜 웹 API를 띄우고 print-server/index.mjs 를 실제로 실행해
// claim → 이미지 다운로드 → (DRY_RUN) 출력 → 결과 보고 전체 루프를 확인한다.
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, it } from "vitest";

const ROOT = process.cwd();
const PRINTED = join(ROOT, "print-server", "printed");
const TOKEN = "test-token-123";
// 1x1 PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

interface Job {
  id: string;
  session_id: string;
  image_url: string;
  copies: number;
}

let server: http.Server;
let port = 0;
let queue: Job[] = [];
const reports: Record<string, unknown>[] = [];
const claims: Record<string, unknown>[] = [];

const jobs = (): Job[] => [
  { id: "aaaaaaaa-0000-4000-8000-000000000001", session_id: "s1", image_url: `http://localhost:${port}/ok.png`, copies: 1 },
  { id: "aaaaaaaa-0000-4000-8000-000000000002", session_id: "s2", image_url: `http://localhost:${port}/missing.png`, copies: 2 },
];

function runPrintServer(token: string, ms: number): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(ROOT, "print-server", "index.mjs")], {
      env: {
        ...process.env,
        OWLCUT_API_URL: `http://localhost:${port}`,
        PRINT_SERVER_TOKEN: token,
        PRINT_DRY_RUN: "1",
        POLL_INTERVAL_MS: "150",
        PRINTER_ID: "test-booth",
      },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    setTimeout(() => {
      child.kill();
      resolve(out);
    }, ms);
  });
}

beforeAll(async () => {
  rmSync(PRINTED, { recursive: true, force: true });
  server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    if (req.url === "/ok.png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      return res.end(PNG);
    }
    if (req.url === "/missing.png") {
      res.writeHead(404);
      return res.end();
    }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.writeHead(401);
      return res.end("{}");
    }
    if (req.url === "/api/print/claim" && req.method === "POST") {
      claims.push(JSON.parse(body));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ job: queue.shift() ?? null }));
    }
    if (req.url?.startsWith("/api/print/") && req.method === "PATCH") {
      reports.push({ id: req.url.split("/").pop(), ...JSON.parse(body) });
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end('{"ok":true}');
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, r));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => {
  server?.close();
  rmSync(PRINTED, { recursive: true, force: true });
});

describe("print-server", () => {
  it("정상 작업은 DRY_RUN 저장 후 completed, 이미지가 없으면 failed 보고", async () => {
    queue = jobs();
    await runPrintServer(TOKEN, 2500);
    assert.equal(reports.length, 2);
    assert.deepEqual(reports.map((r) => r.status), ["completed", "failed"]);
    assert.equal(reports[0].printer, "test-booth");
    assert.match(String(reports[1].error), /404/);
    assert.ok(existsSync(PRINTED) && readdirSync(PRINTED).some((f) => f.includes("000000000001")));
  }, 15_000);

  it("큐가 비어도 계속 폴링하고, claim 에 장비 정보(heartbeat)를 싣는다", () => {
    assert.ok(claims.length >= 3);
    const info = claims[0].info as Record<string, unknown>;
    assert.equal(info.dryRun, true);
  });

  it("토큰이 틀리면 작업을 못 가져가고 안내는 한 번만 출력", async () => {
    queue = jobs();
    const out = await runPrintServer("wrong-token", 1200);
    assert.equal(queue.length, 2);
    assert.equal(out.match(/토큰이 웹 서버와 다릅니다/g)?.length, 1);
  }, 15_000);
});
