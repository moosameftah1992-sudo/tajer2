"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { useCart } from "@/components/cart-provider";
import type { Locale } from "@/lib/commerce";
import { tx } from "@/lib/i18n";

type Geo = { id: string; nameEn: string; nameAr: string; governorates: Array<{ id: string; nameEn: string; nameAr: string; areas: Array<{ id: string; nameEn: string; nameAr: string }> }> };

export function StoreChrome({
  locale,
  base,
  slug,
  name,
  logoUrl,
  categories,
  geo,
  discount,
}: {
  locale: Locale;
  base: string;
  slug: string;
  name: string;
  logoUrl: string;
  categories: Array<{ id: string; slug: string; nameEn: string; nameAr: string }>;
  geo: Geo[];
  discount?: string;
}) {
  const cart = useCart();
  const router = useRouter();
  const count = cart.items.reduce((sum, item) => sum + item.qty, 0);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [countryId, setCountryId] = useState("");
  const [govId, setGovId] = useState("");
  const [areaId, setAreaId] = useState("");
  const govs = useMemo(() => geo.find((item) => item.id === countryId)?.governorates || [], [geo, countryId]);
  const areas = useMemo(() => govs.find((item) => item.id === govId)?.areas || [], [govs, govId]);

  function saveGeo() {
    localStorage.setItem(`tajer-geo-${slug}`, JSON.stringify({ countryId, governorateId: govId, areaId }));
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <header className="store-header">
        <Link href={base || "/"} className="store-logo">
          {logoUrl ? <img src={logoUrl} alt="" /> : null}
          <span>{name}</span>
        </Link>
        <form className="search" action={base || "/"}>
          <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(locale, "Search the catalog", "ابحث في الكتالوج")} />
        </form>
        <nav className="store-nav">
          {discount && <span className="sale-flag">{discount}</span>}
          <button className="icon-btn" type="button" onClick={() => setOpen(true)}>{tx(locale, "Area", "المنطقة")}</button>
          <LanguageSwitch locale={locale} />
          <Link href={`${base}/cart`}>{tx(locale, "Cart", "السلة")} {count}</Link>
          <Link href={`${base}/account`}>{tx(locale, "Account", "حسابي")}</Link>
        </nav>
      </header>
      <div className="cats">
        <Link href={base || "/"}>{tx(locale, "All", "الكل")}</Link>
        {categories.map((category) => (
          <Link key={category.id} href={`${base || "/"}?category=${category.slug}`}>{locale === "ar" ? category.nameAr : category.nameEn}</Link>
        ))}
      </div>
      {open && (
        <div className="modal-back" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>{tx(locale, "Where should this order go?", "إلى أين يصل الطلب؟")}</h3>
            <div className="stack">
              <select className="input" value={countryId} onChange={(e) => { setCountryId(e.target.value); setGovId(""); setAreaId(""); }}>
                <option value="">{tx(locale, "Country", "الدولة")}</option>
                {geo.map((country) => <option key={country.id} value={country.id}>{locale === "ar" ? country.nameAr : country.nameEn}</option>)}
              </select>
              <select className="input" value={govId} onChange={(e) => { setGovId(e.target.value); setAreaId(""); }}>
                <option value="">{tx(locale, "Governorate", "المحافظة")}</option>
                {govs.map((gov) => <option key={gov.id} value={gov.id}>{locale === "ar" ? gov.nameAr : gov.nameEn}</option>)}
              </select>
              <select className="input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">{tx(locale, "Area", "المنطقة")}</option>
                {areas.map((area) => <option key={area.id} value={area.id}>{locale === "ar" ? area.nameAr : area.nameEn}</option>)}
              </select>
              <button className="btn btn-emerald" type="button" onClick={saveGeo}>{tx(locale, "Save area", "احفظ المنطقة")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
