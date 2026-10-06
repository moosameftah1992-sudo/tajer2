import { notFound, redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { subscriptionActive } from "@/lib/commerce";
import { tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { tenantBySlug } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function MaintenancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await tenantBySlug(slug);
  if (!tenant) notFound();
  if (subscriptionActive(tenant.status, tenant.subscriptionEndsAt)) redirect(`/s/${slug}`);
  const locale = await getLocale();
  return (
    <main className="lock">
      <article>
        <Wordmark />
        <p className="tiny">{locale === "ar" ? tenant.nameAr : tenant.nameEn}</p>
        <h1>{tx(locale, "Store under maintenance", "المتجر تحت الصيانة")}</h1>
        <p>{tx(locale, "This storefront is paused until the merchant renews Tajer. Your cart was not charged.", "واجهة المتجر متوقفة حتى يجدد التاجر اشتراك تاجر. لم تُخصم السلة.")}</p>
      </article>
    </main>
  );
}
