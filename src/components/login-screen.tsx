"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Wordmark } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import type { Locale } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { errorText, tx } from "@/lib/i18n";

function Fields({ locale }: { locale: Locale }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState(params.get("store") || "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await postJson<{ slug?: string }>("/api/auth", { action: "login", email, password, slug });
      router.push(params.get("next") || `/s/${data.slug}/manage`);
      router.refresh();
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <div className="field"><span>{tx(locale, "Email", "البريد")}</span><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></div>
      <div className="field"><span>{tx(locale, "Password", "كلمة المرور")}</span><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></div>
      <div className="field"><span>{tx(locale, "Store link if the email is shared", "رابط المتجر إذا تكرر البريد")}</span><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="noor" /></div>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-emerald" disabled={pending}>{tx(locale, "Enter the desk", "ادخل المكتب")}</button>
    </form>
  );
}

export function LoginScreen({ locale }: { locale: Locale }) {
  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <Wordmark light />
        <div>
          <p className="tiny">TAJER DESK</p>
          <h1 style={{ fontSize: 56, lineHeight: 1.05, margin: "8px 0" }}>{tx(locale, "Merchant desk", "مكتب التاجر")}</h1>
          <p>{tx(locale, "Orders, offers, POS, and reports for your store only.", "الطلبات والعروض والصندوق والتقارير لمتجرك فقط.")}</p>
        </div>
        <div className="card" style={{ background: "rgba(255,255,255,.06)", color: "white", padding: 16 }}>
          <p className="tiny">{tx(locale, "Initial desks", "مكاتب البداية")}</p>
          <p>owner@noor.shop · NoorOwner#2026</p>
          <p>owner@sufra.shop · SufraOwner#2026</p>
          <p>cashier@sufra.shop · Cashier#2026</p>
        </div>
      </section>
      <section className="auth-form">
        <div className="between" style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0 }}>{tx(locale, "Merchant login", "تسجيل دخول التجار")}</h2>
          <LanguageSwitch locale={locale} />
        </div>
        <Suspense>
          <Fields locale={locale} />
        </Suspense>
        <p><Link href="/register">{tx(locale, "Create a store", "أنشئ متجراً")}</Link></p>
      </section>
    </main>
  );
}
