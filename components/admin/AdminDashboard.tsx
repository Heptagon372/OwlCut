"use client";
// 관리자 대시보드 (설계도 Phase 8): 세션 수 · AI 사용량 · 출력 완료 · 장비 상태.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatTile } from "./StatTile";
import { StatusBadge, type StatusTone } from "./StatusBadge";
import type { AdminStats } from "@/types/admin";

const REFRESH_MS = 10_000;
const PROVIDER_LABEL = { claude: "Claude", openai: "OpenAI", gemini: "Gemini" } as const;

const num = (n: number) => n.toLocaleString("ko-KR");
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (res.status === 401) {
        router.refresh(); // 세션 만료 → 로그인 화면
        return;
      }
      if (!res.ok) throw new Error();
      setStats(await res.json());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [router]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  };

  if (!stats) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {loadError ? (
          <p className="text-status-critical">통계를 불러오지 못했어요. 잠시 후 자동으로 다시 시도합니다.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        )}
      </main>
    );
  }

  const now = new Date(stats.generatedAt).getTime();
  const { config, today, printQueue } = stats;

  const setup: { label: string; tone: StatusTone; text: string }[] = [
    {
      label: "Supabase",
      tone: config.supabase ? "good" : "critical",
      text: config.supabase ? "연결됨" : "미설정 — 세션·QR·출력·통계 비활성",
    },
    {
      label: "AI 모델",
      tone: config.aiProviders.length ? "good" : "warning",
      text: config.aiProviders.length
        ? config.aiProviders.map((p) => PROVIDER_LABEL[p]).join(", ")
        : "API 키 없음 — AI 꾸미기 비활성",
    },
    {
      label: "프린트 토큰",
      tone: config.printToken ? "good" : "warning",
      text: config.printToken ? "설정됨" : "미설정 — 프린트 서버 연결 불가",
    },
    {
      label: "다운로드 주소",
      tone: config.appUrl ? "good" : "warning",
      text: config.appUrl ?? "미설정 — 접속한 주소로 QR 생성",
    },
  ];
  // 설정이 덜 됐으면 운영자가 먼저 보도록 설정 상태를 맨 위로
  const needsSetup = setup.some((s) => s.tone !== "good");
  const setupSection = (
    <Section title="설정 상태">
      <ul className="space-y-2">
        {setup.map((s) => (
          <li key={s.label} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-muted">{s.label}</span>
            <StatusBadge tone={s.tone} label={s.text} />
          </li>
        ))}
      </ul>
    </Section>
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent-2">S.OWL PHOTO BOOTH</p>
          <h1 className="text-2xl font-black">관리자 대시보드</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>
            {new Date(stats.generatedAt).toLocaleTimeString("ko-KR")} 기준 · 10초마다 갱신
            {loadError && <span className="text-status-warning"> · 갱신 실패</span>}
          </span>
          <button onClick={logout} className="rounded-lg border border-border px-2 py-1 hover:text-foreground">
            로그아웃
          </button>
        </div>
      </header>

      {needsSetup && setupSection}

      {today ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="오늘 세션" value={num(today.sessions)} detail={`최근 1시간 ${num(today.sessionsLastHour)}`} />
          <StatTile
            label="완성된 네컷"
            value={num(today.completed)}
            detail={`AI ${num(today.completedAi)} · 직접 ${num(today.completed - today.completedAi)}`}
          />
          <StatTile
            label="AI 꾸미기 요청"
            value={num(today.aiRequests)}
            detail={`성공률 ${pct(today.aiSuccess, today.aiRequests)}`}
          />
          <StatTile
            label="출력 완료"
            value={num(today.printsCompleted)}
            detail={printQueue ? `대기 ${num(printQueue.waiting + printQueue.printing)} · 실패 ${num(printQueue.failedToday)}` : undefined}
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted">
          Supabase가 설정되지 않아 통계를 집계할 수 없어요. 아래 설정 상태를 확인해 주세요.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="장비 상태">
          {stats.devices.length === 0 ? (
            <p className="text-sm text-muted">연결된 프린트 서버가 없어요. 행사장 PC에서 print-server를 실행해 주세요.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.devices.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">{d.id}</p>
                    <p className="text-xs text-muted">
                      {d.systemPrinter ?? "기본 프린터"} · {d.platform ?? "?"}
                      {d.dryRun && " · DRY_RUN(실제 출력 안 함)"}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge tone={d.online ? "good" : "critical"} label={d.online ? "온라인" : "오프라인"} />
                    <p className="text-xs text-muted">{ago(d.lastSeenAt, now)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="출력 큐">
          {printQueue ? (
            <>
              <div className="mb-3 flex flex-wrap gap-4">
                <StatusBadge tone={printQueue.waiting > 5 ? "warning" : "good"} label={`대기 ${num(printQueue.waiting)}`} />
                <StatusBadge tone="good" label={`출력 중 ${num(printQueue.printing)}`} />
                <StatusBadge
                  tone={printQueue.failedToday ? "critical" : "good"}
                  label={`오늘 실패 ${num(printQueue.failedToday)}`}
                />
              </div>
              {stats.recentFailures.length > 0 && (
                <table className="w-full text-left text-sm">
                  <caption className="mb-1 text-left text-xs text-muted">최근 실패</caption>
                  <thead className="text-xs text-muted">
                    <tr>
                      <th className="py-1 font-normal">시각</th>
                      <th className="py-1 font-normal">프린터</th>
                      <th className="py-1 font-normal">원인</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.recentFailures.map((f) => (
                      <tr key={f.id}>
                        <td className="py-1.5 pr-2 whitespace-nowrap text-muted">{ago(f.updatedAt, now)}</td>
                        <td className="py-1.5 pr-2">{f.printer ?? "–"}</td>
                        <td className="py-1.5 break-all">{f.error ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Supabase 미설정</p>
          )}
        </Section>

        <Section title="AI 모델별 사용량 (오늘)">
          {stats.aiByModel.length === 0 ? (
            <p className="text-sm text-muted">오늘 AI 꾸미기 요청이 없어요.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-normal">모델</th>
                  <th className="py-1 text-right font-normal">요청</th>
                  <th className="py-1 text-right font-normal">성공률</th>
                  <th className="py-1 text-right font-normal">평균 응답</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {stats.aiByModel.map((m) => (
                  <tr key={m.model}>
                    <td className="py-1.5">{m.model}</td>
                    <td className="py-1.5 text-right">{num(m.requests)}</td>
                    <td className="py-1.5 text-right">{pct(m.success, m.requests)}</td>
                    <td className="py-1.5 text-right">
                      {m.avgLatencyMs == null ? "–" : `${(m.avgLatencyMs / 1000).toFixed(1)}초`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {!needsSetup && setupSection}
      </div>
    </main>
  );
}
