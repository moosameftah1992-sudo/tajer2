"use client";

import { useState } from "react";
import { Wordmark } from "@/components/brand";
import type { Locale } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { errorText, tx } from "@/lib/i18n";

export function RenewPanel({ slug, locale }: { slug: string; locale: Locale }) {
  const [plan, setPlan] = useState("monthly");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ bankName?: string; iban?: string; accountName?: string; instructionsEn?: string; instructionsAr?: string } | null>(null);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const data = await postJson<typeof result & { ok: boolean }>(`/api/store/${slug}`, { action: "renewal", plan, note });
      setResult(data);
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    }
  }

  return (
    <main className="lock">
      <article>
        <Wordmark />
        <p className="tiny">{tx(locale, "Subscription expired", "انتهى الاشتراك")}</p>
        <h1>{tx(locale, "Subscription expired", "انتهى الاشتراك")}</h1>
        <p>{tx(locale, "The customer storefront shows maintenance until this store is renewed.", "واجهة العملاء تعرض الصيانة حتى يُجدد هذا المتجر.")}</p>
        <form className="stack" onSubmit={submit}>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="monthly">{tx(locale, "Monthly", "شهري")}</option>
            <option value="yearly">{tx(locale, "Yearly", "سنوي")}</option>
          </select>
          <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tx(locale, "Transfer reference", "مرجع التحويل")} />
          {error && <p className="error">{error}</p>}
          <button className="btn btn-emerald">{tx(locale, "Submit renewal request", "أرسل طلب التجديد")}</button>
        </form>
        {result && (
          <div className="ok">
            <p>{result.bankName} · {result.iban}</p>
            <p>{result.accountName}</p>
            <p>{locale === "ar" ? result.instructionsAr : result.instructionsEn}</p>
          </div>
        )}
      </article>
    </main>
  );
}
