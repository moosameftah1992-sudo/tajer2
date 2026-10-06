import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { money } from "@/lib/commerce";
import { label, tx } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { findOrder } from "@/lib/service";
import { themeById, themeStyle } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const found = await findOrder(slug, id);
  if (!found) notFound();
  const locale = await getLocale();
  const h = await headers();
  const base = h.get("x-tajer-vanity") === "1" ? "" : `/s/${slug}`;
  const order = found.order;
  return (
    <div className={`store theme-${themeById(found.tenant.themeId).id}`} style={themeStyle(found.tenant.theme)}>
      <div className="store-wrap" style={{ padding: "32px 0" }}>
        <p className="tiny">{tx(locale, "Order confirmed", "تم تأكيد الطلب")}</p>
        <h1>{order.number}</h1>
        <p>{label(locale, order.status)} · {label(locale, order.paymentStatus)} · {label(locale, order.paymentMethod)}</p>
        {found.items.map((item) => (
          <div className="between" key={item.id}><span>{locale === "ar" ? item.nameAr : item.nameEn} × {item.qty}</span><b>{money(item.lineTotal, order.currency, locale)}</b></div>
        ))}
        <h2>{money(order.total, order.currency, locale)}</h2>
        <Link className="btn btn-navy" href={base || "/"}>{tx(locale, "Back to the store", "العودة للمتجر")}</Link>
      </div>
    </div>
  );
}
