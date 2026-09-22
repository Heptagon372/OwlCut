import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Lock } from "lucide-react";
import { ADMIN_COOKIE, isAdminConfigured, verifySessionToken } from "@/lib/admin/auth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "관리자 · 아울네컷",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 text-center">
        <div className="glass w-full max-w-sm rounded-card p-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink text-white">
            <Lock className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-4 text-lg font-semibold">관리자 페이지가 비활성화돼 있어요</p>
          <p className="mt-1 text-sm text-muted">
            서버 환경변수 <code className="text-xs">ADMIN_PASSWORD</code>를 설정하면 사용할 수 있어요.
          </p>
        </div>
      </main>
    );
  }

  const store = await cookies();
  const authed = verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  return authed ? <AdminDashboard /> : <AdminLogin />;
}
