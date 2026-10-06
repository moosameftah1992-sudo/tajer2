import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AddButton } from "@/components/storefront/add-button";
import { StoreChrome } from "@/components/storefront/chrome";
import { money } from "@/lib/commerce";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getGeo, productDetail } from "@/lib/service";
import { themeById, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const detail = await productDetail(slug, id);
  if (!detail) notFound();
  const locale = await getLocale();
  const h = await headers();
  const base = h.get("x-tajer-vanity") === "1" ? "" : `/s/${slug}`;
  const theme = themeById(detail.tenant.themeId);
  const product = detail.product;
  const title = locale === "ar" ? product.nameAr : product.nameEn;
  const onSale = product.activePrice < product.originalPrice;
  return (
    <div className={`store theme-${theme.id}`} style={themeStyle(detail.tenant.theme)}>
      <div className="store-wrap">
        <StoreChrome locale={locale} base={base} slug={slug} name={locale === "ar" ? detail.tenant.nameAr : detail.tenant.nameEn} logoUrl={detail.tenant.logoUrl} categories={detail.categories} geo={await getGeo()} />
        <article className="checkout-grid">
          <img src={product.imageUrl} alt={title} style={{ width: "100%", borderRadius: 24, maxHeight: 640, objectFit: "cover" }} />
          <div className="stack">
            <Link href={base || "/"}>{tx(locale, "Back to catalog", "العودة للكتالوج")}</Link>
            <h1>{title}</h1>
            <p>{locale === "ar" ? product.descriptionAr : product.descriptionEn}</p>
            {(product.purity || product.weightValue) && <p className="tiny">{product.purity} {product.weightValue ? `· ${product.weightValue} ${product.weightUnit}` : ""}</p>}
            <div className="price-row">
              <span style={{ fontSize: 32 }}>{money(product.activePrice, detail.tenant.currency, locale)}</span>
              {onSale && <s>{money(product.originalPrice, detail.tenant.currency, locale)}</s>}
            </div>
            {product.variants.length > 0 && (
              <div className="stack">
                {product.variants.map((variant) => (
                  <div className="between card" key={variant.id} style={{ padding: 12 }}>
                    <span>{locale === "ar" ? variant.nameAr : variant.nameEn} {variant.price != null ? `· ${money(variant.price, detail.tenant.currency, locale)}` : ""}</span>
                    <AddButton productId={product.id} variantId={variant.id} label={tx(locale, "Add", "أضف")} disabled={variant.stock <= 0} />
                  </div>
                ))}
              </div>
            )}
            {product.variants.length === 0 && <AddButton productId={product.id} label={tx(locale, "Add to cart", "أضف إلى السلة")} disabled={product.trackStock && product.stock <= 0} />}
          </div>
        </article>
      </div>
    </div>
  );
}
