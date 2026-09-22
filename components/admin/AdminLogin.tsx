"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/brand/Logo";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data?.message ?? "로그인에 실패했어요.");
    } catch {
      setError("서버에 연결하지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-5 rounded-card p-7">
        <Logo />
        <div>
          <h1 className="text-3xl font-[250] tracking-[-0.03em]">관리자</h1>
          <p className="mt-1 text-sm text-muted">운영자 비밀번호를 입력하세요</p>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            aria-label="관리자 비밀번호"
            className="h-12 w-full rounded-full bg-white pl-11 pr-4 outline-none ring-ink/20 focus:ring-2"
          />
        </div>
        {error && <p className="text-sm text-status-critical">{error}</p>}
        <Button type="submit" disabled={loading || !password} className="w-full">
          {loading ? "확인 중…" : "로그인"}
        </Button>
      </form>
    </main>
  );
}
