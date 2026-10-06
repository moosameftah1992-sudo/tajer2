"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Wordmark } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import type { Locale } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { CURRENCIES } from "@/lib/constants";
import { errorText, label, tx } from "@/lib/i18n";

type Geo = Array<{ id: string; nameEn: string; nameAr: string; governorates: Array<{ id: string; nameEn: string; nameAr: string }> }>;

const industries = ["restaurant", "grocery", "jewelry", "fashion", "electronics", "boutique", "cafe", "perfume", "beauty", "other"];

export function RegisterWizard({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [geo, setGeo] = useState<Geo>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    nameEn: "",
    nameAr: "",
    slug: "",
    industry: "boutique",
    countryId: "",
    governorateId: "",
    currency: "BHD",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    fetch("/api/public").then((res) => res.json()).then((data) => {
      if (data.geo) setGeo(data.geo);
    }).catch(() => setError(errorText(locale, "SERVER")));
  }, [locale]);

  const govs = useMemo(() => geo.find((item) => item.id === form.countryId)?.governorates || [], [geo, form.countryId]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function finish(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await postJson<{ slug: string }>("/api/auth", { action: "register-store", ...form });
      router.push(`/s/${data.slug}/manage`);
      router.refresh();
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <Wordmark light />
        <div>
          <p className="tiny">30 {tx(locale, "days", "يوماً")}</p>
          <h1 style={{ fontSize: 52, lineHeight: 1.05 }}>{tx(locale, "Open a store link tonight.", "افتح رابط متجرك الليلة.")}</h1>
          <p>{tx(locale, "Country, currency, trial, and template 01 are written into an isolated tenant.", "الدولة والعملة والتجربة والقالب ١ تُكتب في متجر معزول.")}</p>
        </div>
        <Link href="/login" style={{ color: "#a7f3d0" }}>{tx(locale, "I already have a desk", "لدي مكتب بالفعل")}</Link>
      </section>
      <section className="auth-form">
        <div className="between">
          <h2 style={{ margin: 0 }}>{tx(locale, "Create your store", "أنشئ متجرك")}</h2>
          <LanguageSwitch locale={locale} />
        </div>
        <div className="steps" style={{ marginTop: 16 }}>{[0, 1, 2].map((item) => <span key={item} className={item <= step ? "on" : ""} />)}</div>
        <form className="stack" onSubmit={finish}>
          {step === 0 && (
            <>
              <div className="grid-2">
                <label className="field"><span>{tx(locale, "English name", "الاسم الإنجليزي")}</span><input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} required /></label>
                <label className="field"><span>{tx(locale, "Arabic name", "الاسم العربي")}</span><input value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} required /></label>
              </div>
              <label className="field"><span>{tx(locale, "Store link", "رابط المتجر")}</span><input value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} placeholder="maison" required /></label>
              <label className="field"><span>{tx(locale, "Trade", "النشاط")}</span>
                <select value={form.industry} onChange={(e) => set("industry", e.target.value)}>{industries.map((item) => <option key={item} value={item}>{label(locale, item)}</option>)}</select>
              </label>
            </>
          )}
          {step === 1 && (
            <>
              <label className="field"><span>{tx(locale, "Country", "الدولة")}</span>
                <select value={form.countryId} onChange={(e) => { set("countryId", e.target.value); set("governorateId", ""); }} required>
                  <option value="">{tx(locale, "Choose", "اختر")}</option>
                  {geo.map((country) => <option key={country.id} value={country.id}>{locale === "ar" ? country.nameAr : country.nameEn}</option>)}
                </select>
              </label>
              <label className="field"><span>{tx(locale, "Governorate", "المحافظة")}</span>
                <select value={form.governorateId} onChange={(e) => set("governorateId", e.target.value)} required>
                  <option value="">{tx(locale, "Choose", "اختر")}</option>
                  {govs.map((gov) => <option key={gov.id} value={gov.id}>{locale === "ar" ? gov.nameAr : gov.nameEn}</option>)}
                </select>
              </label>
              <label className="field"><span>{tx(locale, "Currency", "العملة")}</span>
                <select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.code} · {locale === "ar" ? item.nameAr : item.nameEn}</option>)}
                </select>
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <label className="field"><span>{tx(locale, "Owner name", "اسم المالك")}</span><input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} required /></label>
              <div className="grid-2">
                <label className="field"><span>{tx(locale, "Email", "البريد")}</span><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></label>
                <label className="field"><span>{tx(locale, "Phone", "الهاتف")}</span><input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
              </div>
              <label className="field"><span>{tx(locale, "Password", "كلمة المرور")}</span><input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={8} /></label>
            </>
          )}
          {error && <p className="error">{error}</p>}
          <div className="row">
            {step > 0 && <button type="button" className="btn btn-line" onClick={() => setStep(step - 1)}>{tx(locale, "Back", "رجوع")}</button>}
            {step < 2 && <button type="button" className="btn btn-navy" onClick={() => setStep(step + 1)}>{tx(locale, "Continue", "متابعة")}</button>}
            {step === 2 && <button className="btn btn-emerald" disabled={pending}>{tx(locale, "Open the 30-day trial", "افتح تجربة ٣٠ يوماً")}</button>}
          </div>
        </form>
      </section>
    </main>
  );
}
