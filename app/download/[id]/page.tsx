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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-6 px-4 py-10 text-center">
      <div>
        <p className="text-sm font-semibold tracking-widest text-accent-2">
          S.OWL PHOTO BOOTH
        </p>
        <h1 className="mt-1 text-3xl font-black">아울네컷 🦉</h1>
      </div>

      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="완성된 네컷"
            className="max-h-[70vh] rounded-2xl border border-border"
          />
          <a
            href={url}
            download
            className="w-full rounded-2xl bg-accent px-6 py-3 text-lg font-semibold text-white"
          >
            이미지 저장
          </a>
          <p className="text-xs text-muted">
            버튼이 동작하지 않으면 이미지를 길게 눌러 저장하세요.
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8">
          <p className="text-4xl">🔍</p>
          <p className="mt-3 text-muted">
            {isSupabaseConfigured()
              ? "이미지를 찾을 수 없거나 만료되었어요."
              : "이 배포에는 원격 저장이 설정되지 않았어요."}
          </p>
        </div>
      )}
    </main>
  );
}
