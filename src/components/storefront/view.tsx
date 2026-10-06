import Link from "next/link";
import { AddButton } from "@/components/storefront/add-button";
import { StoreChrome } from "@/components/storefront/chrome";
import { money, type Locale } from "@/lib/commerce";
import { tx } from "@/lib/i18n";
import { themeById, themeStyle, type ThemeConfig } from "@/lib/themes";

type Product = {
  id: string;
  categoryId: string | null;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  activePrice: number;
  originalPrice: number;
  imageUrl: string;
  stock: number;
  trackStock: boolean;
  featured: boolean;
  purity: string;
  weightValue: number | null;
  weightUnit: string;
  variants: Array<{ id: string; nameEn: string; nameAr: string; price: number | null; stock: number }>;
};

type Store = {
  tenant: {
    slug: string;
    nameEn: string;
    nameAr: string;
    aboutEn: string;
    aboutAr: string;
    logoUrl: string;
    currency: string;
    themeId: string;
    theme: ThemeConfig;
    storeWideDiscountActive: boolean;
    storeWideDiscountPercent: number;
    phone: string;
    featured: boolean;
  };
  categories: Array<{ id: string; slug: string; nameEn: string; nameAr: string; active?: boolean }>;
  products: Product[];
};

export function StoreView({
  locale,
  store,
  base,
  geo,
  previewTheme,
  category,
  q,
  tableName,
}: {
  locale: Locale;
  store: Store;
  base: string;
  geo: Array<{ id: string; nameEn: string; nameAr: string; governorates: Array<{ id: string; nameEn: string; nameAr: string; areas: Array<{ id: string; nameEn: string; nameAr: string }> }> }>;
  previewTheme?: string;
  category?: string;
  q?: string;
  tableName?: string;
}) {
  const theme = themeById(previewTheme || store.tenant.themeId);
  const config = previewTheme ? theme.defaults : store.tenant.theme;
  const name = locale === "ar" ? store.tenant.nameAr : store.tenant.nameEn;
  const activeCategory = store.categories.find((item) => item.slug === category);
  const products = store.products.filter((product) => {
    if (activeCategory && product.categoryId !== activeCategory.id) return false;
    if (!q) return true;
    const hay = `${product.nameEn} ${product.nameAr}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const heroImage = products[0]?.imageUrl || store.products[0]?.imageUrl || "/images/products/food-1.jpg";
  return (
    <div className={`store theme-${theme.id} pattern-${theme.pattern} hero-${theme.hero} card-${theme.card} orient-${config.orientation} width-${config.width}`} style={themeStyle(config)}>
      <div className="store-wrap">
        <StoreChrome
          locale={locale}
          base={base}
          slug={store.tenant.slug}
          name={name}
          logoUrl={store.tenant.logoUrl}
          categories={store.categories}
          geo={geo}
          discount={store.tenant.storeWideDiscountActive ? `${store.tenant.storeWideDiscountPercent}%` : undefined}
        />
        {tableName && <p className="ok">{tx(locale, `You are ordering for ${tableName}`, `طلبك لطاولة ${tableName}`)}</p>}
        <section className="hero-block">
          {theme.hero !== "marquee" && <img className="cover" src={heroImage} alt="" />}
          <div className="hero-copy">
            {theme.hero === "marquee" ? (
              <div className="marquee"><span>{name} · {name} · {name}</span></div>
            ) : (
              <>
                <p className="tiny">{locale === "ar" ? theme.nameAr : theme.nameEn}</p>
                <h1 style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.05, margin: "8px 0" }}>{name}</h1>
                <p style={{ maxWidth: 520 }}>{locale === "ar" ? store.tenant.aboutAr : store.tenant.aboutEn}</p>
              </>
            )}
          </div>
        </section>
        <section className="product-grid" style={{ marginTop: 22 }}>
          {products.map((product) => {
            const title = locale === "ar" ? product.nameAr : product.nameEn;
            const onSale = product.activePrice < product.originalPrice;
            const soldOut = product.trackStock && product.stock <= 0 && product.variants.length === 0;
            return (
              <article className="pcard" key={product.id}>
                <Link href={`${base}/product/${product.id}`}><img src={product.imageUrl || "/images/products/grocery-1.jpg"} alt={title} /></Link>
                <div className="body">
                  <div className="between">
                    <strong>{title}</strong>
                    {onSale && <span className="sale-flag">{tx(locale, "Sale", "تخفيض")}</span>}
                  </div>
                  <p className="muted" style={{ margin: 0 }}>{locale === "ar" ? product.descriptionAr : product.descriptionEn}</p>
                  {(product.purity || product.weightValue) && <p className="tiny">{[product.purity, product.weightValue ? `${product.weightValue} ${product.weightUnit}` : ""].filter(Boolean).join(" · ")}</p>}
                  <div className="price-row">
                    <span>{money(product.activePrice, store.tenant.currency, locale)}</span>
                    {onSale && <s>{money(product.originalPrice, store.tenant.currency, locale)}</s>}
                  </div>
                  <AddButton productId={product.id} label={soldOut ? tx(locale, "Sold out", "نفد") : tx(locale, "Add", "أضف")} disabled={soldOut} />
                </div>
              </article>
            );
          })}
        </section>
        {products.length === 0 && <p>{tx(locale, "Nothing matches this aisle.", "لا شيء في هذا الممر.")}</p>}
        <footer className="store-foot">
          <span>{store.tenant.phone}</span>
          <span>{previewTheme ? tx(locale, "Template preview", "معاينة قالب") : store.tenant.slug + ".tajer.com"}</span>
        </footer>
      </div>
    </div>
  );
}
