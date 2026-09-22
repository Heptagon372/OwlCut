"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

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
      <form onSubmit={submit} className="w-full max-w-xs space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent-2">S.OWL PHOTO BOOTH</p>
          <h1 className="mt-1 text-xl font-black">관리자</h1>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          aria-label="관리자 비밀번호"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-status-critical">{error}</p>}
        <Button type="submit" disabled={loading || !password} className="w-full text-base">
          {loading ? "확인 중…" : "로그인"}
        </Button>
      </form>
    </main>
  );
}
