"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Wordmark } from "@/components/brand";
import type { Locale } from "@/lib/commerce";
import { money } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { PLATFORM_FEATURES } from "@/lib/constants";
import { errorText, label, tx } from "@/lib/i18n";
import { proxySnippet } from "@/lib/snippets";

type Bundle = {
  actor: { name: string; role: string; permissions: Record<string, boolean> };
  settings: { monthlyPrice: number; yearlyPrice: number; billingCurrency: string; commissionPercent: number; trialDays: number; bankName: string; accountName: string; iban: string; instructionsEn: string; instructionsAr: string; supportEmail: string };
  metrics: { stores: number; active: number; trials: number; expired: number; gmv: number; commission: number; subscriptionRevenue: number };
  stores: Array<Record<string, unknown>>;
  renewals: Array<Record<string, unknown>>;
  geo: Array<{ id: string; code: string; nameEn: string; nameAr: string; vatDefault: number; active: boolean; governorates: Array<{ id: string; nameEn: string; nameAr: string; areas: Array<{ id: string; nameEn: string; nameAr: string }> }> }>;
  themes: Array<{ id: string; number: number; nameEn: string; nameAr: string; active: boolean; industry: string }>;
  providers: Array<Record<string, unknown>>;
  admins: Array<Record<string, unknown>>;
  carriers: Array<{ tenantId: string; providerId: string; enabled: boolean }>;
  domains: Array<{ id: string; tenantId: string; host: string; verified: boolean; type: string }>;
};

const NAV = [
  ["overview", "Overview", "نظرة عامة"],
  ["stores", "Stores", "المتاجر"],
  ["geo", "Geo directory", "دليل المناطق"],
  ["logistics", "Logistics", "الشحن"],
  ["pricing", "Pricing", "الأسعار"],
  ["themes", "Templates", "القوالب"],
  ["admins", "Admins", "المديرون"],
  ["finance", "Finance", "المالية"],
] as const;

export function PlatformConsole({ initial, section, locale }: { initial: unknown; section: string; locale: Locale }) {
  const router = useRouter();
  const [data, setData] = useState(initial as Bundle);
  const [error, setError] = useState("");
  const can = (feature: string) => data.actor.role === "platform_owner" || Boolean(data.actor.permissions[feature]);

  async function reload() {
    const json = await fetch("/api/platform").then((res) => res.json());
    if (json.ok) setData(json.data);
  }
  async function act(body: Record<string, unknown>) {
    setError("");
    try {
      await postJson("/api/platform", body);
      await reload();
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    }
  }

  return (
    <div className="shell">
      <aside className="side">
        <Wordmark light href="/platform" />
        <p className="tiny" style={{ color: "#94a3b8" }}>{data.actor.name}</p>
        {NAV.filter(([key]) => can(key)).map(([key, en, ar]) => (
          <Link key={key} className={section === key ? "on" : ""} href={key === "overview" ? "/platform" : `/platform/${key}`}>{tx(locale, en, ar)}</Link>
        ))}
        <button className="linkish" type="button" onClick={async () => { await postJson("/api/auth", { action: "logout" }); router.push("/platform/login"); }}>{tx(locale, "Logout", "خروج")}</button>
      </aside>
      <section className="main">
        <div className="topbar">
          <h1 style={{ margin: 0 }}>{tx(locale, "Tajer control", "تحكم تاجر")}</h1>
          <LanguageSwitch locale={locale} />
        </div>
        {error && <p className="error">{error}</p>}
        {section === "overview" && (
          <div className="kpis">
            <article className="kpi"><span>{tx(locale, "Stores", "المتاجر")}</span><b>{data.metrics.stores}</b></article>
            <article className="kpi"><span>{tx(locale, "Active", "نشطة")}</span><b>{data.metrics.active}</b></article>
            <article className="kpi"><span>{tx(locale, "Trials", "تجارب")}</span><b>{data.metrics.trials}</b></article>
            <article className="kpi"><span>{tx(locale, "Subscription revenue", "إيراد الاشتراكات")}</span><b>{money(data.metrics.subscriptionRevenue, data.settings.billingCurrency, locale)}</b></article>
            <article className="kpi"><span>{tx(locale, "GMV", "حجم المبيعات")}</span><b>{data.metrics.gmv.toFixed(3)}</b></article>
            <article className="kpi"><span>{tx(locale, "Commission", "العمولة")}</span><b>{data.metrics.commission.toFixed(3)}</b></article>
          </div>
        )}
        {section === "stores" && <Stores locale={locale} data={data} act={act} />}
        {section === "geo" && <Geo locale={locale} data={data} act={act} />}
        {section === "logistics" && <Logistics locale={locale} data={data} act={act} />}
        {section === "pricing" && <Pricing locale={locale} data={data} act={act} />}
        {section === "themes" && <Themes locale={locale} data={data} act={act} />}
        {section === "admins" && <Admins locale={locale} data={data} act={act} />}
        {section === "finance" && <Finance locale={locale} data={data} act={act} />}
      </section>
    </div>
  );
}

function Stores({ locale, data, act }: { locale: Locale; data: Bundle; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [selected, setSelected] = useState<string>("");
  const store = data.stores.find((item) => item.id === selected);
  const [ends, setEnds] = useState("");
  const [plan, setPlan] = useState("monthly");
  const [status, setStatus] = useState("active");
  const [currency, setCurrency] = useState("BHD");
  const [themeId, setThemeId] = useState("t01");
  const [featured, setFeatured] = useState(false);
  const [note, setNote] = useState("");
  return (
    <div className="stack">
      <div className="table-wrap">
        <table>
          <tbody>
            {data.stores.map((item) => (
              <tr key={String(item.id)}>
                <td>{locale === "ar" ? String(item.nameAr) : String(item.nameEn)}</td>
                <td>{String(item.slug)}.tajer.com</td>
                <td>{label(locale, String(item.plan))}</td>
                <td>{item.active ? label(locale, "active") : label(locale, "expired")}</td>
                <td><button className="btn btn-line btn-sm" type="button" onClick={() => { setSelected(String(item.id)); setEnds(String(item.subscriptionEndsAt).slice(0, 10)); setPlan(String(item.plan)); setStatus(String(item.status)); setCurrency(String(item.currency)); setThemeId(String(item.themeId)); setFeatured(Boolean(item.featured)); }}>{tx(locale, "Edit", "تعديل")}</button></td>
                <td><Link href={`/s/${item.slug}`}>{tx(locale, "Open", "فتح")}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {store && (
        <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "update-store", id: store.id, subscriptionEndsAt: new Date(ends).toISOString(), plan, status, currency, themeId, featured, note }); }}>
          <h3>{String(store.slug)}</h3>
          <div className="grid-3">
            <label className="field"><span>{tx(locale, "Expiry", "الانتهاء")}</span><input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} /></label>
            <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}><option value="trial">trial</option><option value="monthly">monthly</option><option value="yearly">yearly</option><option value="custom">custom</option></select>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">active</option><option value="suspended">suspended</option></select>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{["BHD", "SAR", "KWD", "AED", "QAR", "OMR", "USD", "EUR"].map((code) => <option key={code}>{code}</option>)}</select>
            <select className="input" value={themeId} onChange={(e) => setThemeId(e.target.value)}>{data.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.nameEn}</option>)}</select>
            <label className="row"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> featured</label>
          </div>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tx(locale, "Override note", "ملاحظة التعديل")} />
          <button className="btn btn-emerald">{tx(locale, "Save override", "احفظ التعديل")}</button>
          <div>
            {data.domains.filter((domain) => domain.tenantId === store.id).map((domain) => (
              <div className="between" key={domain.id}>
                <span>{domain.host} · {domain.verified ? "verified" : "pending"}</span>
                {!domain.verified && <button className="btn btn-line btn-sm" type="button" onClick={() => act({ action: "update-store", id: store.id, subscriptionEndsAt: store.subscriptionEndsAt, plan: store.plan, status: store.status, currency: store.currency, themeId: store.themeId, featured: store.featured, verifyDomainId: domain.id })}>{tx(locale, "Verify domain", "وثّق النطاق")}</button>}
              </div>
            ))}
          </div>
          <pre style={{ whiteSpace: "pre-wrap", background: "#0f172a", color: "#e2e8f0", padding: 12, borderRadius: 12 }}>{proxySnippet(`${store.slug}.example.com`, String(store.slug))}</pre>
        </form>
      )}
    </div>
  );
}

function Geo({ locale, data, act }: { locale: Locale; data: Bundle; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [countryId, setCountryId] = useState(data.geo[0]?.id || "");
  const country = data.geo.find((item) => item.id === countryId);
  const [govId, setGovId] = useState(country?.governorates[0]?.id || "");
  const gov = country?.governorates.find((item) => item.id === govId);
  const [countryForm, setCountryForm] = useState({ code: "", nameEn: "", nameAr: "", vatDefault: "0" });
  const [govForm, setGovForm] = useState({ nameEn: "", nameAr: "" });
  const [areaForm, setAreaForm] = useState({ nameEn: "", nameAr: "" });
  return (
    <div className="grid-3">
      <div className="stack">
        <form className="stack" onSubmit={(e) => { e.preventDefault(); act({ action: "save-country", ...countryForm }); }}>
          <input className="input" placeholder="BH" value={countryForm.code} onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value })} required />
          <input className="input" placeholder="English" value={countryForm.nameEn} onChange={(e) => setCountryForm({ ...countryForm, nameEn: e.target.value })} required />
          <input className="input" placeholder="العربية" value={countryForm.nameAr} onChange={(e) => setCountryForm({ ...countryForm, nameAr: e.target.value })} required />
          <button className="btn btn-navy btn-sm">{tx(locale, "Add country", "أضف دولة")}</button>
        </form>
        {data.geo.map((item) => <button key={item.id} className={`btn btn-sm ${item.id === countryId ? "btn-emerald" : "btn-line"}`} type="button" onClick={() => { setCountryId(item.id); setGovId(item.governorates[0]?.id || ""); }}>{locale === "ar" ? item.nameAr : item.nameEn} <span onClick={() => act({ action: "delete-country", id: item.id })}>×</span></button>)}
      </div>
      <div className="stack">
        <form className="stack" onSubmit={(e) => { e.preventDefault(); act({ action: "save-governorate", countryId, ...govForm }); }}>
          <input className="input" value={govForm.nameEn} onChange={(e) => setGovForm({ ...govForm, nameEn: e.target.value })} placeholder="Governorate" required />
          <input className="input" value={govForm.nameAr} onChange={(e) => setGovForm({ ...govForm, nameAr: e.target.value })} placeholder="المحافظة" required />
          <button className="btn btn-navy btn-sm">{tx(locale, "Add governorate", "أضف محافظة")}</button>
        </form>
        {country?.governorates.map((item) => <button key={item.id} className={`btn btn-sm ${item.id === govId ? "btn-emerald" : "btn-line"}`} type="button" onClick={() => setGovId(item.id)}>{locale === "ar" ? item.nameAr : item.nameEn}</button>)}
        {gov && <button className="btn btn-danger btn-sm" type="button" onClick={() => act({ action: "delete-governorate", id: gov.id })}>{tx(locale, "Delete governorate", "احذف المحافظة")}</button>}
      </div>
      <div className="stack">
        <form className="stack" onSubmit={(e) => { e.preventDefault(); act({ action: "save-area", governorateId: govId, ...areaForm }); }}>
          <input className="input" value={areaForm.nameEn} onChange={(e) => setAreaForm({ ...areaForm, nameEn: e.target.value })} placeholder="Area" required />
          <input className="input" value={areaForm.nameAr} onChange={(e) => setAreaForm({ ...areaForm, nameAr: e.target.value })} placeholder="المنطقة" required />
          <button className="btn btn-navy btn-sm">{tx(locale, "Add area", "أضف منطقة")}</button>
        </form>
        {gov?.areas.map((area) => <div className="between" key={area.id}><span>{locale === "ar" ? area.nameAr : area.nameEn}</span><button className="btn btn-danger btn-sm" type="button" onClick={() => act({ action: "delete-area", id: area.id })}>×</button></div>)}
      </div>
    </div>
  );
}

function Logistics({ locale, data, act }: { locale: Locale; data: Bundle; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ code: "", nameEn: "", nameAr: "", descriptionEn: "", outboundUrl: "", webhookSecret: "" });
  return (
    <div className="stack">
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-provider", ...form }); }}>
        <div className="grid-2">
          <input className="input" placeholder="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <input className="input" placeholder="English" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required />
          <input className="input" placeholder="العربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} required />
          <input className="input" placeholder="https://carrier.example/shipments" value={form.outboundUrl} onChange={(e) => setForm({ ...form, outboundUrl: e.target.value })} />
        </div>
        <button className="btn btn-emerald">{tx(locale, "Add carrier", "أضف شركة")}</button>
      </form>
      {data.providers.map((provider) => (
        <article className="card" key={String(provider.id)} style={{ padding: 14 }}>
          <div className="between">
            <strong>{locale === "ar" ? String(provider.nameAr) : String(provider.nameEn)}</strong>
            <span className="tiny">/api/webhooks/logistics/{String(provider.code)}</span>
          </div>
          <p className="muted">{tx(locale, "Per-store activation", "تفعيل لكل متجر")}</p>
          <div className="checks">
            {data.stores.map((store) => {
              const enabled = data.carriers.some((row) => row.tenantId === store.id && row.providerId === provider.id && row.enabled);
              return <label key={String(store.id)}><input type="checkbox" checked={enabled} onChange={(e) => act({ action: "toggle-carrier", tenantId: store.id, providerId: provider.id, enabled: e.target.checked })} /> {String(store.slug)}</label>;
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

function Pricing({ locale, data, act }: { locale: Locale; data: Bundle; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState(data.settings);
  return (
    <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-pricing", ...form }); }}>
      <div className="grid-2">
        <label className="field"><span>{tx(locale, "Monthly", "شهري")}</span><input value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: Number(e.target.value) })} /></label>
        <label className="field"><span>{tx(locale, "Yearly", "سنوي")}</span><input value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: Number(e.target.value) })} /></label>
        <label className="field"><span>{tx(locale, "Commission %", "نسبة العمولة")}</span><input value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })} /></label>
        <label className="field"><span>{tx(locale, "Trial days", "أيام التجربة")}</span><input value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} /></label>
        <label className="field"><span>{tx(locale, "Bank", "البنك")}</span><input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></label>
        <label className="field"><span>IBAN</span><input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></label>
      </div>
      <textarea className="input" value={form.instructionsEn} onChange={(e) => setForm({ ...form, instructionsEn: e.target.value })} />
      <textarea className="input" value={form.instructionsAr} onChange={(e) => setForm({ ...form, instructionsAr: e.target.value })} />
      <button className="btn btn-emerald">{tx(locale, "Save pricing", "احفظ الأسعار")}</button>
    </form>
  );
}

function Themes({ locale, data, act }: { locale: Locale; data: Bundle; act: (body: Record<string, unknown>) => Promise<void> }) {
  return (
    <div className="table-wrap">
      <table>
        <tbody>
          {data.themes.map((theme) => (
            <tr key={theme.id}>
              <td>0{theme.number}</td>
              <td>{locale === "ar" ? theme.nameAr : theme.nameEn}</td>
              <td>{label(locale, theme.industry)}</td>
              <td><button className="btn btn-sm btn-line" type="button" onClick={() => act({ action: "set-theme", id: theme.id, active: !theme.active })}>{theme.active ? tx(locale, "Disable", "إيقاف") : tx(locale, "Enable", "تفعيل")}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Admins({ locale, data, act }: { locale: Locale; data: Bundle; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState<Record<string, unknown>>({ name: "", email: "", password: "", role: "platform_manager", permissions: {} });
  const permissions = (form.permissions || {}) as Record<string, boolean>;
  return (
    <div className="stack">
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-admin", ...form }); }}>
        <div className="grid-2">
          <input className="input" placeholder={tx(locale, "Name", "الاسم")} value={String(form.name)} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Email" value={String(form.email)} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder={tx(locale, "Password", "كلمة المرور")} value={String(form.password)} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="checks">{PLATFORM_FEATURES.map((feature) => <label key={feature}><input type="checkbox" checked={Boolean(permissions[feature])} onChange={(e) => setForm({ ...form, permissions: { ...permissions, [feature]: e.target.checked } })} /> {feature}</label>)}</div>
        <button className="btn btn-emerald">{tx(locale, "Save manager", "احفظ المدير")}</button>
      </form>
      {data.admins.map((admin) => <p key={String(admin.id)}>{String(admin.name)} · {String(admin.email)} · {label(locale, String(admin.role))}</p>)}
    </div>
  );
}

function Finance({ locale, data, act }: { locale: Locale; data: Bundle; act: (body: Record<string, unknown>) => Promise<void> }) {
  const pending = useMemo(() => data.renewals.filter((item) => item.status === "pending"), [data.renewals]);
  return (
    <div className="stack">
      <div className="kpis">
        <article className="kpi"><span>{tx(locale, "Approved plans", "خطط مقبولة")}</span><b>{money(data.metrics.subscriptionRevenue, data.settings.billingCurrency, locale)}</b></article>
        <article className="kpi"><span>{tx(locale, "Commission accrued", "عمولة مستحقة")}</span><b>{data.metrics.commission.toFixed(3)}</b></article>
      </div>
      {pending.map((item) => (
        <article className="card between" key={String(item.id)} style={{ padding: 14 }}>
          <div><b>{String(item.plan)}</b><p>{money(Number(item.amount), String(item.currency), locale)} · {String(item.note)}</p></div>
          <div className="row">
            <button className="btn btn-emerald btn-sm" type="button" onClick={() => act({ action: "resolve-renewal", id: item.id, approve: true })}>{tx(locale, "Approve", "قبول")}</button>
            <button className="btn btn-danger btn-sm" type="button" onClick={() => act({ action: "resolve-renewal", id: item.id, approve: false })}>{tx(locale, "Reject", "رفض")}</button>
          </div>
        </article>
      ))}
      {pending.length === 0 && <p className="muted">{tx(locale, "No renewal requests waiting.", "لا طلبات تجديد بانتظار المراجعة.")}</p>}
    </div>
  );
}
