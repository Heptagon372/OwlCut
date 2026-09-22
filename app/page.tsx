"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useBoothStore } from "@/lib/store/boothStore";
import { createSession } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const { reset, setSessionId } = useBoothStore();
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    reset();
    const id = await createSession();
    setSessionId(id);
    router.push("/camera");
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 px-6 py-10 text-center">
      <div>
        <p className="text-lg font-semibold tracking-[0.3em] text-accent-2">
          S.OWL PHOTO BOOTH
        </p>
        <h1 className="mt-3 text-6xl font-black sm:text-7xl">아울네컷 🦉</h1>
        <p className="mt-4 text-lg text-muted">촬영하고 · 꾸미고 · QR로 바로 받기</p>
      </div>

      <Button
        onClick={start}
        disabled={loading}
        className="px-14 py-6 text-2xl shadow-lg shadow-accent/30"
      >
        {loading ? "준비 중…" : "촬영 시작"}
      </Button>

      <ol className="flex gap-6 text-sm text-muted">
        <li>① 4컷 촬영</li>
        <li>② 프레임·스티커 꾸미기</li>
        <li>③ QR 다운로드</li>
      </ol>
    </main>
  );
}
