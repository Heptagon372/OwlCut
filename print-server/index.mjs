#!/usr/bin/env node
// ============================================================
// 아울네컷 로컬 프린트 서버 (설계도 7-6)
// 행사장 PC에서 상시 실행. 웹 API의 출력 큐를 폴링 → 이미지 다운로드 → 프린터 출력 → 결과 보고.
// 의존성 없음 (Node 20.12+). 설정은 같은 폴더의 .env 또는 환경변수.
// ============================================================
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { exec, execFile } from "node:child_process";
import { hostname, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(here, ".env"));
} catch {
  // .env 없으면 환경변수만 사용
}

const API = (process.env.OWLCUT_API_URL || "http://localhost:3000").replace(/\/$/, "");
const TOKEN = process.env.PRINT_SERVER_TOKEN || "";
const PRINTER_ID = (process.env.PRINTER_ID || `booth-${hostname()}`).replace(/[^\w .-]/g, "-").slice(0, 64);
const SYSTEM_PRINTER = process.env.SYSTEM_PRINTER || ""; // OS 프린터 이름 (비우면 기본 프린터)
const POLL_MS = Number(process.env.POLL_INTERVAL_MS || 3000);
const DRY_RUN = process.env.PRINT_DRY_RUN === "1";
const PRINT_COMMAND = process.env.PRINT_COMMAND || ""; // 사용자 정의: {file} {printer} {copies}
const PRINT_TIMEOUT_MS = 120_000;

const runFile = promisify(execFile);
const runShell = promisify(exec);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

if (!TOKEN) {
  console.error("PRINT_SERVER_TOKEN 이 필요합니다 (웹 서버의 PRINT_SERVER_TOKEN 과 같은 값).");
  process.exit(1);
}

async function api(path, init = {}) {
  return fetch(API + path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    signal: AbortSignal.timeout(15_000),
  });
}

async function download(job) {
  const res = await fetch(job.image_url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`이미지 다운로드 실패 (HTTP ${res.status})`);
  const file = join(tmpdir(), `owlcut-${job.id}.png`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function printFile(file, copies) {
  if (DRY_RUN) {
    const out = join(here, "printed");
    await mkdir(out, { recursive: true });
    await copyFile(file, join(out, basename(file)));
    log(`   (DRY_RUN) ${join("printed", basename(file))} 에 저장`);
    return;
  }
  if (PRINT_COMMAND) {
    const cmd = PRINT_COMMAND.replaceAll("{file}", file)
      .replaceAll("{printer}", SYSTEM_PRINTER)
      .replaceAll("{copies}", String(copies));
    await runShell(cmd, { timeout: PRINT_TIMEOUT_MS });
    return;
  }
  if (process.platform === "win32") {
    const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(here, "print-image.ps1"),
      "-Path", file, "-Copies", String(copies)];
    if (SYSTEM_PRINTER) args.push("-Printer", SYSTEM_PRINTER);
    await runFile("powershell.exe", args, { timeout: PRINT_TIMEOUT_MS, windowsHide: true });
    return;
  }
  // macOS / Linux (CUPS)
  const args = ["-n", String(copies), "-o", "fit-to-page", file];
  if (SYSTEM_PRINTER) args.unshift("-d", SYSTEM_PRINTER);
  await runFile("lp", args, { timeout: PRINT_TIMEOUT_MS });
}

async function report(id, status, error) {
  const res = await api(`/api/print/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ printer: PRINTER_ID, status, error }),
  });
  if (!res.ok) log(`   결과 보고 실패 (HTTP ${res.status})`);
}

// 작업 1건 처리. 처리했으면 true (큐를 바로 이어서 비우기 위해)
async function tick() {
  const res = await api("/api/print/claim", {
    method: "POST",
    body: JSON.stringify({
      printer: PRINTER_ID,
      info: { platform: process.platform, dryRun: DRY_RUN, systemPrinter: SYSTEM_PRINTER || "default" },
    }),
  });
  if (res.status === 401) throw new Error("토큰이 웹 서버와 다릅니다 (PRINT_SERVER_TOKEN 확인)");
  if (!res.ok) throw new Error(`큐 조회 실패 (HTTP ${res.status})`);
  const { job } = await res.json();
  if (!job) return false;

  log(`🖨  작업 ${job.id.slice(0, 8)} · ${job.copies}매`);
  let file;
  try {
    file = await download(job);
    await printFile(file, job.copies);
    await report(job.id, "completed");
    log("   ✅ 완료");
  } catch (e) {
    const message = (e?.stderr || e?.message || String(e)).toString().trim().slice(0, 400);
    log("   ❌ 실패:", message);
    await report(job.id, "failed", message);
  } finally {
    if (file) await rm(file, { force: true });
  }
  return true;
}

let running = true;
process.on("SIGINT", () => {
  running = false;
  log("종료 중…");
});

log(`아울네컷 프린트 서버 시작 — ${PRINTER_ID} → ${API}${DRY_RUN ? " [DRY_RUN]" : ""}`);
let lastError = "";
while (running) {
  let hadJob = false;
  try {
    hadJob = await tick();
    if (lastError) log("서버 연결 복구");
    lastError = "";
  } catch (e) {
    const msg = e?.message || String(e);
    if (msg !== lastError) log("⚠️ ", msg); // 같은 오류는 반복 출력하지 않음
    lastError = msg;
  }
  if (!hadJob && running) await sleep(POLL_MS);
}
