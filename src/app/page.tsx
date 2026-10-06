import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, themeCatalog } from "@/db/schema";
import { Wordmark } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { money } from "@/lib/commerce";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getGeo, getSettings } from "@/lib/service";
import { THEMES } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const [settings, geo, themes, featured] = await Promise.all([
    getSettings(),
    getGeo(),
    db.select().from(themeCatalog).orderBy(themeCatalog.sort),
    db.select().from(tenants).where(eq(tenants.featured, true)).orderBy(desc(tenants.createdAt)),
  ]);
  const areas = geo.reduce((sum, country) => sum + country.governorates.reduce((inner, gov) => inner + gov.areas.length, 0), 0);
  return (
    <main className="landing">
      <header className="nav">
        <Wordmark />
        <nav className="nav-links">
          <a href="#features">{tx(locale, "Platform", "المنصة")}</a>
          <a href="#themes">{tx(locale, "20 templates", "٢٠ قالباً")}</a>
          <a href="#pricing">{tx(locale, "Pricing", "الأسعار")}</a>
        </nav>
        <div className="row">
          <LanguageSwitch locale={locale} />
          <Link className="btn btn-line btn-sm" href="/login">{tx(locale, "Merchant login", "تسجيل دخول التجار")}</Link>
          <Link className="btn btn-emerald btn-sm" href="/register">{tx(locale, "Create your store", "أنشئ متجرك")}</Link>
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="tiny" style={{ color: "#047857" }}>TAJER · {tx(locale, "GCC commerce cloud", "سحابة التجارة الخليجية")}</p>
          <h1>{locale === "ar" ? "متجرك، صندوقك، وتقاريرك. في رابط مستقل." : "Your store, counter, and books. On one independent link."}</h1>
          <p className="lede">
            {tx(
              locale,
              "Tajer opens a fully isolated storefront, vendor desk, and POS for every merchant. Trials run 30 days. Currencies, areas, coupons, and twenty production themes stay inside the tenant boundary.",
              "يفتح تاجر واجهة متجر ومكتب تاجر ونقطة بيع معزولة لكل متجر. التجربة ثلاثون يوماً. العملات والمناطق والكوبونات وعشرون قالباً إنتاجياً تبقى داخل حدود المتجر.",
            )}
          </p>
          <div className="row" style={{ marginTop: 22 }}>
            <Link className="btn btn-emerald" href="/register">{tx(locale, "Create your store", "أنشئ متجرك")}</Link>
            <Link className="btn btn-navy" href="/login">{tx(locale, "Merchant login", "تسجيل دخول التجار")}</Link>
          </div>
          <div className="currency-row">
            {["BHD", "SAR", "KWD", "AED", "QAR", "OMR", "USD", "EUR"].map((code) => <span key={code}>{code}</span>)}
          </div>
        </div>
        <div className="stage">
          <img className="shot a" src="/images/products/jewel-2.jpg" alt="" />
          <img className="shot b" src="/images/products/food-1.jpg" alt="" />
          <div className="ticket">
            <p className="tiny">POS · BHD</p>
            <p>{tx(locale, "Counter ticket", "تذكرة الصندوق")}</p>
            <p><b>12.400</b></p>
            <p className="tiny">{tx(locale, "Store-wide + coupon applied", "خصم المتجر والكوبون مطبّقان")}</p>
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="stat-row">
          <article className="stat"><span>{tx(locale, "Live stores", "متاجر حية")}</span><b>{featured.length}+</b></article>
          <article className="stat"><span>{tx(locale, "Countries", "دول")}</span><b>{geo.length}</b></article>
          <article className="stat"><span>{tx(locale, "Areas", "مناطق")}</span><b>{areas}</b></article>
          <article className="stat"><span>{tx(locale, "Templates", "قوالب")}</span><b>{themes.length || 20}</b></article>
        </div>
      </section>
      <section className="section" id="features">
        <p className="tiny">{tx(locale, "Operating system", "نظام التشغيل")}</p>
        <h2>{tx(locale, "Everything a GCC merchant actually runs.", "كل ما يديره تاجر الخليج فعلياً.")}</h2>
        <div className="feature-grid">
          {[
            ["Independent links", "روابط مستقلة", "Subdomains, custom domains, and a verified host router. No shared storefront URL.", "نطاقات فرعية ونطاقات خاصة وموجّه مضيف موثّق. لا رابط مشترك."],
            ["Trial lockout", "قفل التجربة", "Thirty days, then the storefront shows maintenance and the desk opens only the renewal page.", "ثلاثون يوماً، ثم صيانة للواجهة وصفحة تجديد فقط للمكتب."],
            ["Offer engine", "محرك العروض", "Store-wide percent, item sale prices, and coupons calculate together at checkout and POS.", "خصم شامل وسعر تخفيض وكوبونات تُحسب معاً في الدفع والصندوق."],
            ["Geo directory", "دليل المناطق", "Countries, governorates, and areas drive shipping rates for every cart.", "الدول والمحافظات والمناطق تحدد أسعار الشحن لكل سلة."],
            ["Merchant gateways", "بوابات التاجر", "Cash, Benefit, cards, and PayPal settle with the merchant's own credentials.", "النقد وبنفت والبطاقات وباي بال تُسوّى ببيانات التاجر نفسه."],
            ["Logistics hub", "مركز الشحن", "Unlimited carriers, per-store activation, and signed status webhooks.", "شركات بلا حد، وتفعيل لكل متجر، وويب هوك موقّع للحالة."],
            ["Reports", "التقارير", "Daily, monthly, yearly, and custom ranges export to Excel and PDF.", "يومي وشهري وسنوي ونطاق مخصص، مع تصدير إكسل وPDF."],
            ["RBAC", "الصلاحيات", "Platform managers and store roles with feature checkboxes, not shared logins.", "مديرو المنصة وأدوار المتجر بصناديق صلاحيات، بلا حسابات مشتركة."],
          ].map(([en, ar, bodyEn, bodyAr]) => (
            <article className="feature" key={en}>
              <span className="tiny">Tajer</span>
              <strong>{tx(locale, en, ar)}</strong>
              <p>{tx(locale, bodyEn, bodyAr)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section" id="themes" style={{ background: "#0f172a", color: "white" }}>
        <p className="tiny" style={{ color: "#34d399" }}>{tx(locale, "Template 01 is the registration default", "القالب ١ هو الافتراضي عند التسجيل")}</p>
        <h2>{tx(locale, "Twenty production storefronts.", "عشرون واجهة إنتاجية.")}</h2>
        <div className="theme-mosaic">
          {THEMES.map((theme) => (
            <Link key={theme.id} href={`/s/noor?previewTheme=${theme.id}`} className="theme-tile" style={{ background: `linear-gradient(160deg, ${theme.defaults.primary}, ${theme.defaults.background})`, color: theme.defaults.text }}>
              <i>0{theme.number}</i>
              <div>
                <strong>{locale === "ar" ? theme.nameAr : theme.nameEn}</strong>
                <p style={{ margin: "6px 0 0", opacity: 0.8 }}>{locale === "ar" ? theme.descriptionAr : theme.descriptionEn}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section" id="pricing">
        <h2>{tx(locale, "Simple plans. Exact expiry control.", "خطط واضحة. وتحكم دقيق بالانتهاء.")}</h2>
        <div className="price-grid">
          <article className="price featured">
            <p className="tiny">{tx(locale, "Trial", "التجربة")}</p>
            <h3>{tx(locale, `${settings.trialDays} days, unrestricted`, `${settings.trialDays} يوماً بلا قيود`)}</h3>
            <p>{tx(locale, "Every new store starts here. Super admin can extend or set any expiry date.", "كل متجر جديد يبدأ هنا. ويمكن لمالك المنصة تمديد التاريخ أو تحديده.")}</p>
            <Link className="btn btn-emerald" href="/register">{tx(locale, "Start a store", "ابدأ متجراً")}</Link>
          </article>
          <article className="price">
            <p className="tiny">{tx(locale, "Monthly", "شهري")}</p>
            <em>{money(Number(settings.monthlyPrice), settings.billingCurrency, locale)}</em>
          </article>
          <article className="price">
            <p className="tiny">{tx(locale, "Yearly", "سنوي")}</p>
            <em>{money(Number(settings.yearlyPrice), settings.billingCurrency, locale)}</em>
          </article>
        </div>
        {featured.length > 0 && (
          <div className="row" style={{ marginTop: 22 }}>
            {featured.map((store) => (
              <Link key={store.id} className="btn btn-line" href={`/s/${store.slug}`}>{locale === "ar" ? store.nameAr : store.nameEn}</Link>
            ))}
          </div>
        )}
      </section>
      <footer className="footer">
        <Wordmark />
        <p>{tx(locale, "Payments settle to the merchant gateway. Tajer keeps the operating system.", "المدفوعات تُسوّى في بوابة التاجر. تاجر يحتفظ بنظام التشغيل.")}</p>
      </footer>
      <Link href="/platform/login" className="admin-dot" aria-label="Platform access" />
    </main>
  );
}
