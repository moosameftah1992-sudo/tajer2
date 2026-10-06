"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Wordmark } from "@/components/brand";
import type { Locale } from "@/lib/commerce";
import { money } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { STAFF_FEATURES } from "@/lib/constants";
import { errorText, label, tx } from "@/lib/i18n";
import { THEMES } from "@/lib/themes";

type Data = {
  tenant: {
    id: string; slug: string; nameEn: string; nameAr: string; currency: string; phone: string; email: string;
    addressEn: string; addressAr: string; aboutEn: string; aboutAr: string; countryId: string; governorateId: string;
    vatRate: number; vatInclusive: boolean; logoUrl: string; faviconUrl: string; themeId: string;
    theme: Record<string, string | number | boolean>; storeWideDiscountPercent: number; storeWideDiscountActive: boolean;
    plan: string; daysLeft: number; subscriptionEndsAt: string;
  };
  user: { name: string; role: string };
  features: string[];
  categories: Array<Record<string, string | number | boolean | null>>;
  products: Array<Record<string, unknown>>;
  orders: Array<Record<string, unknown>>;
  coupons: Array<Record<string, unknown>>;
  staff: Array<Record<string, unknown>>;
  customers: Array<Record<string, unknown>>;
  assets: Array<Record<string, unknown>>;
  folders: Array<Record<string, unknown>>;
  gateways: Array<Record<string, unknown>>;
  providers: Array<Record<string, unknown>>;
  carriers: Array<Record<string, unknown>>;
  rates: Array<Record<string, unknown>>;
  tables: Array<Record<string, unknown>>;
  domains: Array<Record<string, unknown>>;
  geo: Array<{ id: string; nameEn: string; nameAr: string; governorates: Array<{ id: string; nameEn: string; nameAr: string; areas: Array<{ id: string; nameEn: string; nameAr: string }> }> }>;
  themes: Array<{ id: string; nameEn: string; nameAr: string; active: boolean; number: number }>;
  summary: { series: Array<{ label: string; revenue: number }>; totals: { orders: number; revenue: number; average: number } };
};

const NAV = [
  ["overview", "Overview", "نظرة عامة"],
  ["reports", "Reports", "التقارير"],
  ["offers", "Offers", "العروض"],
  ["design", "Design", "التصميم"],
  ["media", "Media", "الوسائط"],
  ["catalog", "Catalog", "الكتالوج"],
  ["orders", "Orders", "الطلبات"],
  ["customers", "Customers", "العملاء"],
  ["staff", "Staff", "الفريق"],
  ["tables", "QR tables", "طاولات QR"],
  ["settings", "Settings", "الإعدادات"],
] as const;

export function MerchantConsole({ initial, section, locale }: { initial: unknown; section: string; locale: Locale }) {
  const router = useRouter();
  const [data, setData] = useState(initial as Data);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const slug = data.tenant.slug;
  const allowed = new Set(data.features);

  async function reload() {
    const json = await fetch(`/api/store/${slug}?resource=dashboard`).then((res) => res.json());
    if (json.ok) setData(json.data);
  }
  async function act(body: Record<string, unknown>) {
    setError("");
    try {
      await postJson(`/api/store/${slug}`, body);
      await reload();
      setNotice(tx(locale, "Saved", "تم الحفظ"));
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    }
  }

  useEffect(() => {
    if (section !== "orders") return;
    const source = new EventSource(`/api/store/${slug}/stream`);
    source.onmessage = () => { reload().catch(() => undefined); };
    return () => source.close();
  }, [section, slug]);

  const sectionFeature: Record<string, string> = { overview: "overview", reports: "reports", offers: "offers", design: "design", media: "media", catalog: "catalog", orders: "orders", customers: "customers", staff: "staff", tables: "tables", settings: "settings" };
  if (section !== "overview" && !allowed.has(sectionFeature[section] || section)) {
    return <main className="lock"><article><h1>{tx(locale, "This desk is locked for your role.", "هذا القسم مقفل لدورك.")}</h1></article></main>;
  }
  const max = Math.max(...data.summary.series.map((item) => item.revenue), 1);

  return (
    <div className="shell">
      <aside className="side">
        <Wordmark light href={`/s/${slug}/manage`} />
        <p className="tiny" style={{ color: "#94a3b8" }}>{locale === "ar" ? data.tenant.nameAr : data.tenant.nameEn}</p>
        {NAV.filter(([key]) => key === "overview" || allowed.has(key === "tables" ? "tables" : key === "settings" ? "settings" : key)).map(([key, en, ar]) => (
          <Link key={key} className={section === key ? "on" : ""} href={key === "overview" ? `/s/${slug}/manage` : `/s/${slug}/manage/${key}`}>{tx(locale, en, ar)}</Link>
        ))}
        {allowed.has("pos") && <Link href={`/s/${slug}/pos`}>{tx(locale, "Open POS", "افتح الصندوق")}</Link>}
        <Link href={`/s/${slug}`}>{tx(locale, "View store", "عرض المتجر")}</Link>
        <button className="linkish" type="button" onClick={async () => { await postJson("/api/auth", { action: "logout" }); router.push("/login"); }}>{tx(locale, "Logout", "خروج")}</button>
      </aside>
      <section className="main">
        <div className="topbar">
          <div>
            <p className="tiny">{label(locale, data.user.role)} · {label(locale, data.tenant.plan)} · {data.tenant.daysLeft} {tx(locale, "days", "يوم")}</p>
            <h1 style={{ margin: 0 }}>{tx(locale, NAV.find((item) => item[0] === section)?.[1] || "Desk", NAV.find((item) => item[0] === section)?.[2] || "المكتب")}</h1>
          </div>
          <LanguageSwitch locale={locale} />
        </div>
        {notice && <p className="ok">{notice}</p>}
        {error && <p className="error">{error}</p>}
        {section === "overview" && (
          <>
            <div className="kpis">
              <article className="kpi"><span>{tx(locale, "30-day revenue", "إيراد ٣٠ يوماً")}</span><b>{money(data.summary.totals.revenue, data.tenant.currency, locale)}</b></article>
              <article className="kpi"><span>{tx(locale, "Orders", "الطلبات")}</span><b>{data.summary.totals.orders}</b></article>
              <article className="kpi"><span>{tx(locale, "Products", "المنتجات")}</span><b>{data.products.length}</b></article>
              <article className="kpi"><span>{tx(locale, "Average ticket", "متوسط الفاتورة")}</span><b>{money(data.summary.totals.average, data.tenant.currency, locale)}</b></article>
            </div>
            <div className="card chart" style={{ marginTop: 14 }}>
              {data.summary.series.map((item) => <div key={item.label} className="bar" title={item.label} style={{ height: `${Math.max(6, (item.revenue / max) * 140)}px` }} />)}
            </div>
          </>
        )}
        {section === "reports" && <Reports locale={locale} slug={slug} currency={data.tenant.currency} />}
        {section === "offers" && <Offers locale={locale} data={data} act={act} />}
        {section === "design" && <Design locale={locale} data={data} act={act} />}
        {section === "media" && <Media locale={locale} data={data} act={act} reload={reload} />}
        {section === "catalog" && <Catalog locale={locale} data={data} act={act} />}
        {section === "orders" && <Orders locale={locale} data={data} act={act} />}
        {section === "customers" && <Customers locale={locale} data={data} />}
        {section === "staff" && <Staff locale={locale} data={data} act={act} />}
        {section === "tables" && <Tables locale={locale} data={data} act={act} />}
        {section === "settings" && <Settings locale={locale} data={data} act={act} />}
      </section>
    </div>
  );
}

function Reports({ locale, slug, currency }: { locale: Locale; slug: string; currency: string }) {
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<{ totals: { orders: number; revenue: number; discount: number; vat: number }; series: Array<{ label: string; revenue: number }>; top: Array<{ nameEn: string; nameAr: string; qty: number; revenue: number }> } | null>(null);
  useEffect(() => {
    fetch(`/api/store/${slug}?resource=reports&from=${from}&to=${to}`).then((res) => res.json()).then((json) => setReport(json.report)).catch(() => undefined);
  }, [from, slug, to]);
  const max = Math.max(...(report?.series.map((item) => item.revenue) || [1]), 1);
  return (
    <div className="stack">
      <div className="row">
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <a className="btn btn-navy btn-sm" href={`/api/store/${slug}/export?format=xlsx&from=${from}&to=${to}`}>{tx(locale, "Export Excel", "تصدير إكسل")}</a>
        <a className="btn btn-line btn-sm" href={`/api/store/${slug}/export?format=pdf&from=${from}&to=${to}`}>{tx(locale, "Export PDF", "تصدير PDF")}</a>
      </div>
      {report && (
        <>
          <div className="kpis">
            <article className="kpi"><span>{tx(locale, "Revenue", "الإيراد")}</span><b>{money(report.totals.revenue, currency, locale)}</b></article>
            <article className="kpi"><span>{tx(locale, "Orders", "الطلبات")}</span><b>{report.totals.orders}</b></article>
            <article className="kpi"><span>{tx(locale, "Discounts", "الخصومات")}</span><b>{money(report.totals.discount, currency, locale)}</b></article>
            <article className="kpi"><span>{tx(locale, "VAT", "الضريبة")}</span><b>{money(report.totals.vat, currency, locale)}</b></article>
          </div>
          <div className="card chart">{report.series.map((item) => <div key={item.label} className="bar" title={item.label} style={{ height: `${Math.max(4, (item.revenue / max) * 140)}px` }} />)}</div>
          <div className="table-wrap"><table><tbody>{report.top.map((item) => <tr key={item.nameEn}><td>{locale === "ar" ? item.nameAr : item.nameEn}</td><td>{item.qty}</td><td>{money(item.revenue, currency, locale)}</td></tr>)}</tbody></table></div>
        </>
      )}
    </div>
  );
}

function Offers({ locale, data, act }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [percent, setPercent] = useState(String(data.tenant.storeWideDiscountPercent));
  const [active, setActive] = useState(data.tenant.storeWideDiscountActive);
  const [coupon, setCoupon] = useState({ code: "", type: "percent", value: "10", minSubtotal: "0", maxUses: "" });
  return (
    <div className="stack">
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "store-discount", percent, active }); }}>
        <h3>{tx(locale, "Store-wide discount", "خصم على كامل المتجر")}</h3>
        <div className="grid-2">
          <label className="field"><span>%</span><input value={percent} onChange={(e) => setPercent(e.target.value)} /></label>
          <label className="row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> {tx(locale, "Active now", "مفعّل الآن")}</label>
        </div>
        <button className="btn btn-emerald">{tx(locale, "Apply to every cart", "طبّق على كل السلات")}</button>
      </form>
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-coupon", ...coupon }); }}>
        <h3>{tx(locale, "New coupon", "كوبون جديد")}</h3>
        <div className="grid-3">
          <input className="input" placeholder="SAVE20" value={coupon.code} onChange={(e) => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })} required />
          <select className="input" value={coupon.type} onChange={(e) => setCoupon({ ...coupon, type: e.target.value })}><option value="percent">{label(locale, "percent")}</option><option value="fixed">{label(locale, "fixed")}</option></select>
          <input className="input" value={coupon.value} onChange={(e) => setCoupon({ ...coupon, value: e.target.value })} required />
        </div>
        <button className="btn btn-navy">{tx(locale, "Create coupon", "أنشئ الكوبون")}</button>
      </form>
      <div className="table-wrap">
        <table>
          <tbody>
            {data.coupons.map((row) => (
              <tr key={String(row.id)}>
                <td>{String(row.code)}</td>
                <td>{label(locale, String(row.type))} {String(row.value)}</td>
                <td>{row.active ? label(locale, "active") : label(locale, "expired")}</td>
                <td><button className="btn btn-danger btn-sm" type="button" onClick={() => act({ action: "delete-coupon", id: row.id })}>{tx(locale, "Delete", "حذف")}</button></td>
                <td><button className="btn btn-line btn-sm" type="button" onClick={() => act({ action: "save-coupon", ...row, active: !row.active })}>{row.active ? tx(locale, "Pause", "إيقاف") : tx(locale, "Activate", "تفعيل")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Design({ locale, data, act }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [themeId, setThemeId] = useState(data.tenant.themeId);
  const [config, setConfig] = useState(data.tenant.theme);
  const theme = THEMES.find((item) => item.id === themeId) || THEMES[0];
  return (
    <div className="stack">
      <div className="theme-mosaic">
        {data.themes.filter((item) => item.active).map((item) => (
          <button key={item.id} className="theme-tile" type="button" onClick={() => { setThemeId(item.id); const next = THEMES.find((themeItem) => themeItem.id === item.id); if (next) setConfig(next.defaults as unknown as Data["tenant"]["theme"]); }} style={{ background: THEMES.find((themeItem) => themeItem.id === item.id)?.defaults.background || "#111", color: "#fff", textAlign: "start" }}>
            <i>0{item.number}</i><strong>{locale === "ar" ? item.nameAr : item.nameEn}</strong>
          </button>
        ))}
      </div>
      <div className="grid-3">
        {["primary", "accent", "background", "surface", "text"].map((key) => (
          <label className="field" key={key}><span>{key}</span><input type="color" value={String(config[key] || "#000000")} onChange={(e) => setConfig({ ...config, [key]: e.target.value })} /></label>
        ))}
        <label className="field"><span>{tx(locale, "Font scale", "مقياس الخط")}</span><input type="range" min="0.85" max="1.2" step="0.05" value={Number(config.fontScale || 1)} onChange={(e) => setConfig({ ...config, fontScale: Number(e.target.value) })} /></label>
        <label className="field"><span>{tx(locale, "Radius", "الاستدارة")}</span><input type="range" min="0" max="36" value={Number(config.radius || 12)} onChange={(e) => setConfig({ ...config, radius: Number(e.target.value) })} /></label>
        <label className="field"><span>{tx(locale, "Layout", "التخطيط")}</span>
          <select value={String(config.orientation || "grid")} onChange={(e) => setConfig({ ...config, orientation: e.target.value })}>
            <option value="grid">{label(locale, "grid")}</option>
            <option value="showcase">{label(locale, "showcase")}</option>
            <option value="list">{label(locale, "list")}</option>
          </select>
        </label>
      </div>
      <label className="row"><input type="checkbox" checked={Boolean(config.gradient)} onChange={(e) => setConfig({ ...config, gradient: e.target.checked })} /> {tx(locale, "Gradient", "تدرج")}</label>
      <div className="row">
        <button className="btn btn-emerald" type="button" onClick={() => act({ action: "save-theme", themeId, themeConfig: config, logoUrl: data.tenant.logoUrl, faviconUrl: data.tenant.faviconUrl })}>{tx(locale, "Publish style", "انشر النمط")}</button>
        <a className="btn btn-line" href={`/s/${data.tenant.slug}?previewTheme=${theme.id}`} target="_blank">{tx(locale, "Preview", "معاينة")}</a>
      </div>
      <Uploader locale={locale} slug={data.tenant.slug} label={tx(locale, "Upload logo", "ارفع الشعار")} onUrl={(url) => act({ action: "save-theme", themeId, themeConfig: config, logoUrl: url })} />
      <Uploader locale={locale} slug={data.tenant.slug} label={tx(locale, "Upload favicon", "ارفع الأيقونة")} onUrl={(url) => act({ action: "save-theme", themeId, themeConfig: config, faviconUrl: url })} />
    </div>
  );
}

function Uploader({ locale, slug, label: text, onUrl, folderId }: { locale: Locale; slug: string; label: string; onUrl: (url: string) => void; folderId?: string }) {
  const [drag, setDrag] = useState(false);
  async function send(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("slug", slug);
    if (folderId) body.set("folderId", folderId);
    const json = await fetch("/api/upload", { method: "POST", body }).then((res) => res.json());
    if (json.url) onUrl(json.url);
  }
  return (
    <label className="card" style={{ padding: 16, borderStyle: drag ? "dashed" : "solid" }} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const file = e.dataTransfer.files[0]; if (file) send(file); }}>
      {text}
      <input type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) send(file); }} />
      <p className="muted">{tx(locale, "Drop an image. It is compressed on the server.", "أفلت صورة. تُضغط على الخادم.")}</p>
    </label>
  );
}

function Media({ locale, data, act, reload }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void>; reload: () => Promise<void> }) {
  const [name, setName] = useState("");
  return (
    <div className="stack">
      <Uploader locale={locale} slug={data.tenant.slug} label={tx(locale, "Add to library", "أضف إلى المكتبة")} onUrl={() => { reload(); }} />
      <form className="row" onSubmit={(e) => { e.preventDefault(); act({ action: "create-folder", name }); setName(""); }}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={tx(locale, "Folder name", "اسم المجلد")} />
        <button className="btn btn-line">{tx(locale, "Create folder", "أنشئ مجلداً")}</button>
      </form>
      <div className="row">{data.folders.map((folder) => <span className="badge" key={String(folder.id)}>{String(folder.name)}</span>)}</div>
      <div className="media-grid">
        {data.assets.map((asset) => (
          <div className="asset" key={String(asset.id)}>
            <img src={String(asset.url)} alt="" />
            <button type="button" onClick={() => act({ action: "delete-asset", id: asset.id })}>{tx(locale, "Delete", "حذف")}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Catalog({ locale, data, act }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void> }) {
  const blank = { nameEn: "", nameAr: "", descriptionEn: "", descriptionAr: "", price: "", salePrice: "", discountPercent: "", sku: "", barcode: "", stock: "10", categoryId: "", imageUrl: "", purity: "", weightValue: "", weightUnit: "g", active: true, featured: false, trackStock: true };
  const [form, setForm] = useState<Record<string, unknown>>(blank);
  const [category, setCategory] = useState({ nameEn: "", nameAr: "" });
  const [picker, setPicker] = useState(false);
  return (
    <div className="stack">
      <form className="row" onSubmit={(e) => { e.preventDefault(); act({ action: "save-category", ...category }); }}>
        <input className="input" placeholder="Rings" value={category.nameEn} onChange={(e) => setCategory({ ...category, nameEn: e.target.value })} required />
        <input className="input" placeholder="خواتم" value={category.nameAr} onChange={(e) => setCategory({ ...category, nameAr: e.target.value })} required />
        <button className="btn btn-line">{tx(locale, "Add category", "أضف تصنيفاً")}</button>
      </form>
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-product", ...form }); setForm(blank); }}>
        <div className="grid-2">
          <input className="input" placeholder="English name" value={String(form.nameEn)} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required />
          <input className="input" placeholder="الاسم العربي" value={String(form.nameAr)} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} required />
          <input className="input" placeholder={tx(locale, "Price", "السعر")} value={String(form.price)} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className="input" placeholder={tx(locale, "Sale price", "سعر التخفيض")} value={String(form.salePrice)} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          <input className="input" placeholder={tx(locale, "Discount %", "نسبة الخصم")} value={String(form.discountPercent)} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
          <input className="input" placeholder="SKU" value={String(form.sku)} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className="input" placeholder={tx(locale, "Barcode", "الباركود")} value={String(form.barcode)} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <input className="input" placeholder={tx(locale, "Stock", "المخزون")} value={String(form.stock)} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <input className="input" placeholder={tx(locale, "Purity", "العيار")} value={String(form.purity)} onChange={(e) => setForm({ ...form, purity: e.target.value })} />
          <input className="input" placeholder={tx(locale, "Weight", "الوزن")} value={String(form.weightValue)} onChange={(e) => setForm({ ...form, weightValue: e.target.value })} />
          <select className="input" value={String(form.categoryId)} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">{tx(locale, "Category", "التصنيف")}</option>
            {data.categories.map((item) => <option key={String(item.id)} value={String(item.id)}>{locale === "ar" ? String(item.nameAr) : String(item.nameEn)}</option>)}
          </select>
        </div>
        <textarea className="input" placeholder={tx(locale, "English description", "الوصف الإنجليزي")} value={String(form.descriptionEn)} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
        <textarea className="input" placeholder={tx(locale, "Arabic description", "الوصف العربي")} value={String(form.descriptionAr)} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
        <div className="row">
          <button className="btn btn-line" type="button" onClick={() => setPicker(true)}>{tx(locale, "Media library", "مكتبة الوسائط")}</button>
          {form.imageUrl ? <img src={String(form.imageUrl)} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} /> : null}
          <button className="btn btn-emerald">{tx(locale, "Save product", "احفظ المنتج")}</button>
        </div>
      </form>
      {picker && (
        <div className="modal-back" onClick={() => setPicker(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="media-grid">
              {data.assets.map((asset) => <button key={String(asset.id)} type="button" onClick={() => { setForm({ ...form, imageUrl: asset.url }); setPicker(false); }}><img src={String(asset.url)} alt="" /></button>)}
            </div>
          </div>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <tbody>
            {data.products.map((product) => (
              <tr key={String(product.id)}>
                <td>{locale === "ar" ? String(product.nameAr) : String(product.nameEn)}</td>
                <td>{money(Number(product.activePrice), data.tenant.currency, locale)} {Number(product.activePrice) < Number(product.originalPrice) && <s>{money(Number(product.originalPrice), data.tenant.currency, locale)}</s>}</td>
                <td>{String(product.stock)}</td>
                <td><button className="btn btn-danger btn-sm" type="button" onClick={() => act({ action: "delete-product", id: product.id })}>{tx(locale, "Delete", "حذف")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Orders({ locale, data, act }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void> }) {
  const columns = ["pending", "processing", "out_for_delivery", "fulfilled"];
  return (
    <div className="board">
      {columns.map((status) => (
        <div className="col" key={status}>
          <strong>{label(locale, status)}</strong>
          {data.orders.filter((order) => order.status === status).map((order) => (
            <article className="order-card" key={String(order.id)}>
              <b>{String(order.number)}</b>
              <p>{String(order.customerName)} · {money(Number(order.total), data.tenant.currency, locale)}</p>
              <p className="tiny">{label(locale, String(order.paymentMethod))} · {label(locale, String(order.channel))}</p>
              <div className="row">
                {status !== "fulfilled" && <button className="btn btn-sm btn-navy" type="button" onClick={() => act({ action: "update-order", id: order.id, status: columns[columns.indexOf(status) + 1] })}>{tx(locale, "Advance", "تقديم")}</button>}
                <button className="btn btn-sm btn-danger" type="button" onClick={() => act({ action: "update-order", id: order.id, status: "cancelled" })}>{tx(locale, "Cancel", "إلغاء")}</button>
              </div>
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}

function Customers({ locale, data }: { locale: Locale; data: Data }) {
  return (
    <div className="table-wrap">
      <table>
        <tbody>
          {data.customers.map((customer) => (
            <tr key={String(customer.id)}><td>{String(customer.name)}</td><td>{String(customer.email)}</td><td>{String(customer.phone)}</td><td>{String(customer.orders)}</td></tr>
          ))}
        </tbody>
      </table>
      {data.customers.length === 0 && <p className="muted" style={{ padding: 16 }}>{tx(locale, "No registered customers yet.", "لا عملاء مسجلون بعد.")}</p>}
    </div>
  );
}

function Staff({ locale, data, act }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState<Record<string, unknown>>({ name: "", email: "", phone: "", password: "", role: "cashier", permissions: {} });
  const permissions = (form.permissions || {}) as Record<string, boolean>;
  return (
    <div className="stack">
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-staff", ...form }); }}>
        <div className="grid-2">
          <input className="input" placeholder={tx(locale, "Name", "الاسم")} value={String(form.name)} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Email" value={String(form.email)} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input" placeholder={tx(locale, "Password", "كلمة المرور")} value={String(form.password)} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input" value={String(form.role)} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {["store_admin", "manager", "cashier", "stock_keeper"].map((role) => <option key={role} value={role}>{label(locale, role)}</option>)}
          </select>
        </div>
        <div className="checks">
          {STAFF_FEATURES.map((feature) => (
            <label key={feature}><input type="checkbox" checked={Boolean(permissions[feature])} onChange={(e) => setForm({ ...form, permissions: { ...permissions, [feature]: e.target.checked } })} /> {feature}</label>
          ))}
        </div>
        <button className="btn btn-emerald">{tx(locale, "Save staff", "احفظ الموظف")}</button>
      </form>
      <div className="table-wrap">
        <table><tbody>{data.staff.map((member) => <tr key={String(member.id)}><td>{String(member.name)}</td><td>{String(member.email)}</td><td>{label(locale, String(member.role))}</td><td>{member.role !== "store_owner" && <button className="btn btn-danger btn-sm" type="button" onClick={() => act({ action: "delete-staff", id: member.id })}>{tx(locale, "Remove", "إزالة")}</button>}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}

function Tables({ locale, data, act }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ name: "", code: "", seats: "4", zone: "" });
  const [qr, setQr] = useState<{ dataUrl: string; link: string } | null>(null);
  return (
    <div className="stack">
      <form className="row" onSubmit={(e) => { e.preventDefault(); act({ action: "save-table", ...form }); }}>
        <input className="input" placeholder="T7" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="t7" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className="input" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
        <input className="input" placeholder={tx(locale, "Zone", "المنطقة")} value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
        <button className="btn btn-emerald">{tx(locale, "Add table", "أضف طاولة")}</button>
      </form>
      <div className="table-wrap">
        <table>
          <tbody>
            {data.tables.map((table) => (
              <tr key={String(table.id)}>
                <td>{String(table.name)}</td>
                <td>{String(table.code)}</td>
                <td>{String(table.seats)}</td>
                <td>{String(table.zone)}</td>
                <td><button className="btn btn-line btn-sm" type="button" onClick={async () => { const json = await fetch(`/api/store/${data.tenant.slug}?resource=qr&code=${table.code}`).then((res) => res.json()); setQr(json); }}>{tx(locale, "QR", "QR")}</button></td>
                <td><button className="btn btn-danger btn-sm" type="button" onClick={() => act({ action: "delete-table", id: table.id })}>{tx(locale, "Delete", "حذف")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {qr && (
        <div className="card" style={{ padding: 16, width: 280 }}>
          <img src={qr.dataUrl} alt="QR" />
          <a className="btn btn-navy btn-sm" href={qr.dataUrl} download="table-qr.png">{tx(locale, "Download", "تنزيل")}</a>
          <p className="tiny">{qr.link}</p>
        </div>
      )}
    </div>
  );
}

function Settings({ locale, data, act }: { locale: Locale; data: Data; act: (body: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({ ...data.tenant });
  const govs = useMemo(() => data.geo.find((item) => item.id === form.countryId)?.governorates || [], [data.geo, form.countryId]);
  const [host, setHost] = useState("");
  const [rate, setRate] = useState({ countryId: data.tenant.countryId, governorateId: "", areaId: "", providerId: "", price: "1", etaEn: "", etaAr: "" });
  return (
    <div className="stack">
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-settings", ...form }); }}>
        <div className="grid-2">
          <input className="input" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          <input className="input" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
            {["BHD", "SAR", "KWD", "AED", "QAR", "OMR", "USD", "EUR"].map((code) => <option key={code}>{code}</option>)}
          </select>
          <input className="input" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })} />
          <select className="input" value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value, governorateId: "" })}>
            {data.geo.map((country) => <option key={country.id} value={country.id}>{locale === "ar" ? country.nameAr : country.nameEn}</option>)}
          </select>
          <select className="input" value={form.governorateId} onChange={(e) => setForm({ ...form, governorateId: e.target.value })}>
            {govs.map((gov) => <option key={gov.id} value={gov.id}>{locale === "ar" ? gov.nameAr : gov.nameEn}</option>)}
          </select>
        </div>
        <label className="row"><input type="checkbox" checked={form.vatInclusive} onChange={(e) => setForm({ ...form, vatInclusive: e.target.checked })} /> {tx(locale, "Prices include VAT", "الأسعار تشمل الضريبة")}</label>
        <button className="btn btn-emerald">{tx(locale, "Save store", "احفظ المتجر")}</button>
      </form>
      <div className="card stack" style={{ padding: 16 }}>
        <h3>{tx(locale, "Direct bank gateways", "بوابات البنك المباشرة")}</h3>
        <p className="muted">{tx(locale, "Credentials are encrypted. Leave a key blank to keep the saved one. Sandbox captures locally; live posts to your API base URL.", "البيانات مشفرة. اترك المفتاح فارغاً للإبقاء على المحفوظ. وضع التجربة يلتقط محلياً، والوضع الحي يرسل إلى رابطك.")}</p>
        {["cash", "benefit", "card", "paypal"].map((provider) => {
          const gate = data.gateways.find((item) => item.provider === provider) || { enabled: false, merchantId: "", apiBaseUrl: "", sandbox: true, apiKeyMask: "", secretMask: "" };
          return (
            <form key={provider} className="grid-3" onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              act({ action: "save-gateway", provider, enabled: fd.get("enabled") === "on", sandbox: fd.get("sandbox") === "on", merchantId: fd.get("merchantId"), apiBaseUrl: fd.get("apiBaseUrl"), apiKey: fd.get("apiKey"), secret: fd.get("secret") });
            }}>
              <strong>{label(locale, provider)}</strong>
              <label><input name="enabled" type="checkbox" defaultChecked={Boolean(gate.enabled)} /> {tx(locale, "Enabled", "مفعّل")}</label>
              <label><input name="sandbox" type="checkbox" defaultChecked={gate.sandbox !== false} /> sandbox</label>
              <input className="input" name="merchantId" defaultValue={String(gate.merchantId || "")} placeholder="Merchant ID" />
              <input className="input" name="apiKey" placeholder={String(gate.apiKeyMask || "API key")} />
              <input className="input" name="secret" placeholder={String(gate.secretMask || "Secret")} />
              <input className="input" name="apiBaseUrl" defaultValue={String(gate.apiBaseUrl || "")} placeholder="https://bank.example/charge" />
              <button className="btn btn-line btn-sm">{tx(locale, "Save", "حفظ")}</button>
            </form>
          );
        })}
      </div>
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "save-rate", ...rate }); }}>
        <h3>{tx(locale, "Shipping rate", "سعر الشحن")}</h3>
        <div className="grid-3">
          <select className="input" value={rate.providerId} onChange={(e) => setRate({ ...rate, providerId: e.target.value })}>
            <option value="">{tx(locale, "Carrier", "الناقل")}</option>
            {data.carriers.filter((item) => item.enabled).map((item) => <option key={String(item.id)} value={String(item.providerId)}>{String((item.provider as { nameEn?: string } | null)?.nameEn || item.providerId)}</option>)}
          </select>
          <input className="input" value={rate.price} onChange={(e) => setRate({ ...rate, price: e.target.value })} />
          <input className="input" placeholder="ETA" value={rate.etaEn} onChange={(e) => setRate({ ...rate, etaEn: e.target.value })} />
        </div>
        <button className="btn btn-navy">{tx(locale, "Add rate", "أضف سعراً")}</button>
        {data.rates.map((item) => <div className="between" key={String(item.id)}><span>{String(item.price)} · {String(item.etaEn)}</span><button type="button" className="btn btn-danger btn-sm" onClick={() => act({ action: "delete-rate", id: item.id })}>{tx(locale, "Delete", "حذف")}</button></div>)}
      </form>
      <form className="card stack" style={{ padding: 16 }} onSubmit={(e) => { e.preventDefault(); act({ action: "add-domain", host }); }}>
        <h3>{tx(locale, "Custom domain", "نطاق خاص")}</h3>
        <p className="muted">{data.tenant.slug}.tajer.com · /s/{data.tenant.slug}</p>
        <div className="row"><input className="input" value={host} onChange={(e) => setHost(e.target.value)} placeholder="shop.example.com" /><button className="btn btn-line">{tx(locale, "Request", "اطلب")}</button></div>
        {data.domains.map((domain) => <p key={String(domain.id)}>{String(domain.host)} · {domain.verified ? tx(locale, "Verified", "موثّق") : tx(locale, "Pending verification", "بانتظار التوثيق")}</p>)}
      </form>
    </div>
  );
}
