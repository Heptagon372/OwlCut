"use client";
// 관리자 대시보드 (설계도 Phase 8): 세션 수 · AI 사용량 · 출력 완료 · 장비 상태.
// 레이아웃: 흰 사이드바 + 인사말 헤더 + 벤토 카드 (검은 개요 카드 / 진행 링 카드 / 표 카드)
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  Settings2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { StatusBadge, type StatusTone } from "./StatusBadge";
import { Logo } from "@/components/brand/Logo";
import { IconButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { AdminRankItem, AdminStats } from "@/types/admin";

const REFRESH_MS = 10_000;
const PROVIDER_LABEL = { claude: "Claude", openai: "OpenAI", gemini: "Gemini" } as const;

const NAV = [
  { href: "#overview", label: "대시보드", icon: LayoutDashboard },
  { href: "#devices", label: "장비 상태", icon: MonitorSmartphone },
  { href: "#queue", label: "출력 큐", icon: ListOrdered },
  { href: "#ai", label: "AI 사용량", icon: Sparkles },
  { href: "#popular", label: "인기 항목", icon: TrendingUp },
  { href: "#setup", label: "설정 상태", icon: Settings2 },
];

const num = (n: number) => n.toLocaleString("ko-KR");
const ratio = (part: number, whole: number) => (whole ? part / whole : 0);
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

// 순위 목록: 이름 · 장수 · 비율 + 가는 막대 (막대는 완성 네컷 전체 대비)
function RankList({ title, items, total }: { title: string; items: AdminRankItem[]; total: number }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2.5 text-xs font-semibold text-muted">{title}</h3>
      <ol className="space-y-3">
        {items.map((it, i) => (
          <li key={it.id}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="num mr-2 text-muted">{i + 1}</span>
                {it.label}
              </span>
              <span className="num shrink-0 font-semibold">
                {num(it.count)}
                <span className="ml-1.5 text-xs font-normal text-muted">{pct(it.count, total)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-black/[0.06]" aria-hidden>
              <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(2, ratio(it.count, total) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
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

  const sidebar = (
    <aside className="glass-solid sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-card p-5 lg:flex">
      <Logo />
      <nav className="mt-10 space-y-1" aria-label="관리자 메뉴">
        {NAV.map(({ href, label, icon: Icon }, i) => (
          <a
            key={href}
            href={href}
            className={`flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium transition ${i === 0 ? "bg-ink text-white" : "text-foreground hover:bg-black/5"}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </a>
        ))}
      </nav>
      <button
        onClick={logout}
        className="mt-auto flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium text-muted hover:bg-black/5 hover:text-foreground"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        로그아웃
      </button>
    </aside>
  );

  if (!stats) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-6 sm:px-6">
        {sidebar}
        <div className="flex-1">
          {loadError ? (
            <p className="glass rounded-card p-6 text-status-critical">통계를 불러오지 못했어요. 잠시 후 자동으로 다시 시도합니다.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass h-56 animate-pulse rounded-card" />
              ))}
            </div>
          )}
        </div>
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
    <div id="setup" className="scroll-mt-6">
      <Panel title="설정 상태" icon={<Settings2 className="h-4 w-4" />}>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
          {setup.map((s) => (
            <li key={s.label} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2.5 last:border-0 md:[&:nth-last-child(2)]:border-0">
              <span className="text-sm text-muted">{s.label}</span>
              <StatusBadge tone={s.tone} label={s.text} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );

  const printDoneRatio = printQueue && today ? ratio(today.printsCompleted, today.printsCompleted + printQueue.failedToday) : 0;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-6 sm:px-6">
      {sidebar}

      <div className="flex min-w-0 flex-1 flex-col gap-4" id="overview">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">S.OWL PHOTO BOOTH 관리자</p>
            <h1 className="text-3xl font-semibold tracking-tight">안녕하세요, 운영자님!</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="glass-solid flex items-center gap-2 rounded-full px-4 py-2 text-sm">
              <RefreshCw className="h-3.5 w-3.5 text-muted" aria-hidden />
              <span className="num">{new Date(stats.generatedAt).toLocaleTimeString("ko-KR")}</span>
              <span className="text-muted">기준 · 10초마다</span>
              {loadError && <span className="text-status-critical">· 갱신 실패</span>}
            </span>
            <IconButton aria-label="로그아웃" onClick={logout} className="lg:hidden">
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
        </header>

        {needsSetup && setupSection}

        {today ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr]">
            {/* 오늘 개요 (검은 카드) — @container: 카드 폭에 맞춰 숫자 크기 조절 */}
            <section className="@container ink flex flex-col rounded-card p-6 md:col-span-2 xl:col-span-1">
              <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">오늘 개요</h2>
                <Activity className="h-5 w-5 text-ink-muted" aria-hidden />
              </header>
              {/* 숫자 위 · 설명 아래 2칸 (좁은 카드에서도 줄바꿈되지 않게) */}
              <div className="mt-4 grid grid-cols-2">
                <div className="min-w-0 pr-4">
                  <p className="num text-[34px] font-light leading-none @sm:text-[44px]">{num(today.sessions)}</p>
                  <p className="mt-2 text-xs text-ink-muted">세션 · 최근 1시간 {num(today.sessionsLastHour)}</p>
                </div>
                <div className="min-w-0 border-l border-white/15 pl-4">
                  <p className="num text-[34px] font-light leading-none @sm:text-[44px]">{num(today.completed)}</p>
                  <p className="mt-2 text-xs text-ink-muted">완성된 네컷</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { label: "AI 꾸미기", value: today.completedAi },
                  { label: "직접 꾸미기", value: today.completed - today.completedAi },
                  { label: "출력 완료", value: today.printsCompleted },
                ].map((t, i) => (
                  <div key={t.label} className={`min-w-0 rounded-tile px-2 py-3 text-center ${i === 0 ? "bg-white text-ink" : "bg-white/10"}`}>
                    {/* 네 자리 수(행사 당일 수천 건)도 타일 안에 들어가게 카드 폭에 따라 축소 */}
                    <p className="num text-xl font-medium @[19rem]:text-2xl @sm:text-3xl">{num(t.value)}</p>
                    <p className={`text-xs ${i === 0 ? "text-muted" : "text-ink-muted"}`}>{t.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* AI 성공률 */}
            <Panel title="AI 성공률" icon={<Sparkles className="h-4 w-4" />} aside="오늘">
              <div className="flex items-center gap-6">
                <ProgressRing
                  value={ratio(today.aiSuccess, today.aiRequests)}
                  size={128}
                  stroke={10}
                  label={`AI 성공률 ${pct(today.aiSuccess, today.aiRequests)}`}
                >
                  <span className="num text-2xl font-semibold">{pct(today.aiSuccess, today.aiRequests)}</span>
                </ProgressRing>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-ink" aria-hidden />
                    요청 <span className="num font-semibold">{num(today.aiRequests)}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-ink/60" aria-hidden />
                    성공 <span className="num font-semibold">{num(today.aiSuccess)}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-ink/25" aria-hidden />
                    실패 <span className="num font-semibold">{num(today.aiRequests - today.aiSuccess)}</span>
                  </li>
                </ul>
              </div>
            </Panel>

            {/* 출력 완료율 */}
            <div id="queue" className="scroll-mt-6">
              <Panel title="출력" icon={<ListOrdered className="h-4 w-4" />} aside="오늘" className="h-full">
                <div className="flex items-center gap-6">
                  <ProgressRing value={printDoneRatio} size={128} stroke={10} label={`출력 성공률 ${Math.round(printDoneRatio * 100)}%`}>
                    <span className="text-center">
                      <span className="num block text-2xl font-semibold">{num(today.printsCompleted)}</span>
                      <span className="block text-[11px] text-muted">완료</span>
                    </span>
                  </ProgressRing>
                  {printQueue && (
                    <ul className="space-y-2.5">
                      <li>
                        <StatusBadge tone={printQueue.waiting > 5 ? "warning" : "good"} label={`대기 ${num(printQueue.waiting)}`} />
                      </li>
                      <li>
                        <StatusBadge tone="good" label={`출력 중 ${num(printQueue.printing)}`} />
                      </li>
                      <li>
                        <StatusBadge
                          tone={printQueue.failedToday ? "critical" : "good"}
                          label={`실패 ${num(printQueue.failedToday)}`}
                        />
                      </li>
                    </ul>
                  )}
                </div>
              </Panel>
            </div>
          </div>
        ) : (
          <Panel>
            <p className="text-sm text-muted">Supabase가 설정되지 않아 통계를 집계할 수 없어요. 위의 설정 상태를 확인해 주세요.</p>
          </Panel>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div id="devices" className="scroll-mt-6">
            <Panel title="장비 상태" icon={<MonitorSmartphone className="h-4 w-4" />} className="h-full">
              {stats.devices.length === 0 ? (
                <p className="text-sm text-muted">연결된 프린트 서버가 없어요. 행사장 PC에서 print-server를 실행해 주세요.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.devices.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-white/55 px-4 py-3">
                      <div>
                        <p className="font-semibold">{d.id}</p>
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
            </Panel>
          </div>

          <Panel title="최근 출력 실패" icon={<ListOrdered className="h-4 w-4" />} className="h-full">
            {stats.recentFailures.length === 0 ? (
              <p className="text-sm text-muted">최근 실패한 출력이 없어요.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-normal">시각</th>
                    <th className="pb-2 font-normal">프린터</th>
                    <th className="pb-2 font-normal">원인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stats.recentFailures.map((f) => (
                    <tr key={f.id}>
                      <td className="whitespace-nowrap py-2 pr-2 text-muted">{ago(f.updatedAt, now)}</td>
                      <td className="py-2 pr-2">{f.printer ?? "–"}</td>
                      <td className="break-all py-2">{f.error ?? "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <div id="ai" className="scroll-mt-6">
          <Panel title="AI 모델별 사용량" icon={<Sparkles className="h-4 w-4" />} aside="오늘">
            {stats.aiByModel.length === 0 ? (
              <p className="text-sm text-muted">오늘 AI 꾸미기 요청이 없어요.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-normal">모델</th>
                    <th className="pb-2 text-right font-normal">요청</th>
                    <th className="pb-2 text-right font-normal">성공률</th>
                    <th className="pb-2 text-right font-normal">평균 응답</th>
                  </tr>
                </thead>
                <tbody className="num divide-y divide-line">
                  {stats.aiByModel.map((m) => (
                    <tr key={m.model}>
                      <td className="py-2.5 font-sans">{m.model}</td>
                      <td className="py-2.5 text-right">{num(m.requests)}</td>
                      <td className="py-2.5 text-right">{pct(m.success, m.requests)}</td>
                      <td className="py-2.5 text-right">
                        {m.avgLatencyMs == null ? "–" : `${(m.avgLatencyMs / 1000).toFixed(1)}s`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        {stats.popular && (
          <div id="popular" className="scroll-mt-6">
            <Panel
              title="오늘 인기"
              icon={<TrendingUp className="h-4 w-4" />}
              aside={`완성 네컷 ${num(stats.popular.total)}장 기준`}
            >
              {stats.popular.total === 0 ? (
                <p className="text-sm text-muted">오늘 완성된 네컷이 아직 없어요.</p>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <RankList title="필터" items={stats.popular.filters} total={stats.popular.total} />
                  <RankList title="AR 효과" items={stats.popular.effects} total={stats.popular.total} />
                  <RankList title="레이아웃" items={stats.popular.layouts} total={stats.popular.total} />
                </div>
              )}
            </Panel>
          </div>
        )}

        {!needsSetup && setupSection}
      </div>
    </main>
  );
}
