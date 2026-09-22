import { Download, SearchX } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

async function getFinalUrl(id: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("designs")
      .select("final_image_url")
      .eq("session_id", id)
      .not("final_image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.final_image_url ?? null;
  } catch {
    return null;
  }
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const url = await getFinalUrl(id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo />
        <span className="glass-solid rounded-full px-4 py-2 text-sm font-medium text-muted">사진 받기</span>
      </header>

      {url ? (
        <>
          <div className="glass rounded-card p-3">
            <div className="grid place-items-center rounded-[22px] bg-white/35 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="완성된 네컷"
                className="max-h-[62vh] rounded-md shadow-[0_24px_48px_-22px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>
          <div className="ink rounded-card p-6">
            <p className="text-sm text-ink-muted">S.OWL PHOTO BOOTH</p>
            <h1 className="mt-1 text-4xl font-[200] tracking-[-0.04em]">오늘의 네컷</h1>
            <a
              href={url}
              download
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-lg font-semibold text-ink"
            >
              <Download className="h-5 w-5" aria-hidden />
              이미지 저장
            </a>
            <p className="mt-3 text-center text-xs text-ink-muted">
              버튼이 동작하지 않으면 이미지를 길게 눌러 저장하세요.
            </p>
          </div>
        </>
      ) : (
        <div className="glass rounded-card p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
            <SearchX className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 font-semibold">사진을 찾을 수 없어요</p>
          <p className="mt-1 text-sm text-muted">
            {isSupabaseConfigured()
              ? "링크가 만료되었거나 잘못된 주소예요."
              : "이 배포에는 원격 저장이 설정되지 않았어요."}
          </p>
        </div>
      )}
    </main>
  );
}
