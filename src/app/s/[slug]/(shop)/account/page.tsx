import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AccountPanel } from "@/components/storefront/account-panel";
import { StoreChrome } from "@/components/storefront/chrome";
import { getLocale } from "@/lib/locale";
import { getGeo, publicStore } from "@/lib/service";
import { themeById, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await publicStore(slug);
  if (!store) notFound();
  const locale = await getLocale();
  const h = await headers();
  const base = h.get("x-tajer-vanity") === "1" ? "" : `/s/${slug}`;
  return (
    <div className={`store theme-${themeById(store.tenant.themeId).id}`} style={themeStyle(store.tenant.theme)}>
      <div className="store-wrap">
        <StoreChrome locale={locale} base={base} slug={slug} name={locale === "ar" ? store.tenant.nameAr : store.tenant.nameEn} logoUrl={store.tenant.logoUrl} categories={store.categories} geo={await getGeo()} />
        <AccountPanel locale={locale} slug={slug} />
      </div>
    </div>
  );
}
