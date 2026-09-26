import { Clock, Download, SearchX, TimerOff } from "lucide-react";
import { headers } from "next/headers";
import { Logo } from "@/components/brand/Logo";
import { translate } from "@/lib/i18n/messages";
import { langFromAcceptLanguage, type Lang } from "@/lib/settings/settings";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { createSignedUrl, signedTtlSeconds } from "@/lib/storage/photos";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

const SIGNED_URL_MAX_SECONDS = 60 * 60; // 페이지를 열 때마다 새로 발급, 최대 1시간

type Result =
  | { state: "ok"; viewUrl: string; downloadUrl: string; expiresAt: string | null }
  | { state: "expired" }
  | { state: "missing" }
  | { state: "unconfigured" };

// 비공개 버킷의 사진을 만료되는 서명 URL로 보여준다 (보관기간이 지나면 열리지 않음)
async function getFinal(id: string): Promise<Result> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };
  if (!isUuid(id)) return { state: "missing" };
  try {
    const db = getSupabaseAdmin();
    const [{ data: session }, { data: design }] = await Promise.all([
      db.from("sessions").select("expires_at").eq("id", id).maybeSingle(),
      db
        .from("designs")
        .select("final_image_path")
        .eq("session_id", id)
        .not("final_image_path", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!design?.final_image_path) return { state: "missing" };

    const ttl = signedTtlSeconds(session?.expires_at, SIGNED_URL_MAX_SECONDS);
    if (ttl <= 0) return { state: "expired" };

    const [viewUrl, downloadUrl] = await Promise.all([
      createSignedUrl(design.final_image_path, ttl),
      createSignedUrl(design.final_image_path, ttl, "owlcut.png"),
    ]);
    if (!viewUrl) return { state: "missing" };
    return { state: "ok", viewUrl, downloadUrl: downloadUrl ?? viewUrl, expiresAt: session?.expires_at ?? null };
  } catch {
    return { state: "missing" };
  }
}

// 방문자 폰에서 열리는 페이지 — 부스 설정 쿠키가 없으므로 폰 언어를 따른다
function formatKst(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, head] = await Promise.all([getFinal(id), headers()]);
  const lang = langFromAcceptLanguage(head.get("accept-language"));
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="glass-solid rounded-full px-4 py-2 text-sm font-medium text-muted">{t("download.badge")}</span>
      </header>

      {result.state === "ok" ? (
        <>
          <div className="glass rounded-card p-3">
            <div className="grid place-items-center rounded-[22px] bg-white/35 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.viewUrl}
                alt={t("result.alt")}
                className="max-h-[62vh] rounded-md shadow-[0_24px_48px_-22px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
          <div className="ink rounded-card p-6">
            <p className="text-sm text-ink-muted">S.OWL PHOTO BOOTH</p>
            <h1 className="mt-1 text-4xl font-[200] tracking-[-0.04em]">{t("download.title")}</h1>
            <a
              href={result.downloadUrl}
              download="owlcut.png"
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-lg font-semibold text-ink"
            >
              <Download className="h-5 w-5" aria-hidden />
              {t("download.save")}
            </a>
            <p className="mt-3 text-center text-xs text-ink-muted">
              {t("download.longPress")}
            </p>
            {result.expiresAt && (
              <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-white/10 pt-4 text-xs text-ink-muted">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {t("download.expiresAt", { time: formatKst(result.expiresAt, lang) })}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="glass rounded-card p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
            {result.state === "expired" ? (
              <TimerOff className="h-6 w-6" aria-hidden />
            ) : (
              <SearchX className="h-6 w-6" aria-hidden />
            )}
          </span>
          <p className="mt-4 font-semibold">
            {result.state === "expired" ? t("download.expiredTitle") : t("download.missingTitle")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {result.state === "expired"
              ? t("download.expiredDesc")
              : result.state === "unconfigured"
                ? t("download.notConfigured")
                : t("download.badLink")}
          </p>
        </div>
      )}
    </main>
  );
}
