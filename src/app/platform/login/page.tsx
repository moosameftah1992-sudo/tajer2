"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand";
import { postJson } from "@/lib/client";

export default function PlatformLoginPage() {
  const router = useRouter();
  const locale = typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "ar" : "en";
  const [email, setEmail] = useState("admin@tajer.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await postJson("/api/auth", { action: "platform-login", email, password });
      router.push("/platform");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "SERVER");
    }
  }

  return (
    <main className="lock">
      <article>
        <Wordmark />
        <h1>{locale === "ar" ? "دخول المنصة" : "Platform access"}</h1>
        <p className="muted">{locale === "ar" ? "لمالكي تاجر ومديري المنصة فقط." : "Tajer owners and platform managers only."}</p>
        <form className="stack" onSubmit={submit}>
          <label className="field"><span>Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label className="field"><span>Password</span><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-emerald">{locale === "ar" ? "دخول" : "Enter"}</button>
        </form>
        <p className="muted">admin@tajer.com · TajerAdmin#2026</p>
        <p className="muted">manager@tajer.com · Manager#2026</p>
      </article>
    </main>
  );
}
