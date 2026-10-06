import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CartCheckout } from "@/components/storefront/cart-checkout";
import { StoreChrome } from "@/components/storefront/chrome";
import { getLocale } from "@/lib/locale";
import { getGeo, publicStore } from "@/lib/service";
import { themeById, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await publicStore(slug);
  if (!store) notFound();
  const locale = await getLocale();
  const h = await headers();
  const base = h.get("x-tajer-vanity") === "1" ? "" : `/s/${slug}`;
  const theme = themeById(store.tenant.themeId);
  return (
    <div className={`store theme-${theme.id}`} style={themeStyle(store.tenant.theme)}>
      <div className="store-wrap">
        <StoreChrome locale={locale} base={base} slug={slug} name={locale === "ar" ? store.tenant.nameAr : store.tenant.nameEn} logoUrl={store.tenant.logoUrl} categories={store.categories} geo={await getGeo()} />
        <CartCheckout locale={locale} slug={slug} base={base} mode="checkout" payments={store.payments} />
      </div>
    </div>
  );
}
