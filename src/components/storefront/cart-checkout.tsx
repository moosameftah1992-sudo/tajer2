"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { Locale } from "@/lib/commerce";
import { money } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { errorText, label, tx } from "@/lib/i18n";

type Quote = {
  currency: string;
  couponCode: string;
  rates: Array<{ id: string; providerEn: string; providerAr: string; price: number; etaEn: string; etaAr: string }>;
  lines: Array<{ productId: string; variantId: string | null; nameEn: string; nameAr: string; imageUrl: string; qty: number; original: number; active: number }>;
  totals: { subtotal: number; itemDiscount: number; storeDiscount: number; couponDiscount: number; shipping: number; vat: number; total: number };
};

export function CartCheckout({
  locale,
  slug,
  base,
  mode,
  payments,
}: {
  locale: Locale;
  slug: string;
  base: string;
  mode: "cart" | "checkout";
  payments: Array<{ provider: string; enabled: boolean; configured: boolean }>;
}) {
  const cart = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [coupon, setCoupon] = useState("");
  const [rateId, setRateId] = useState("");
  const [fulfillment, setFulfillment] = useState(cart.tableCode ? "dine_in" : "pickup");
  const [form, setForm] = useState({ customerName: "", phone: "", email: "", address: "", notes: "", paymentMethod: "cash" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!cart.items.length) {
      setQuote(null);
      return;
    }
    const geo = JSON.parse(localStorage.getItem(`tajer-geo-${slug}`) || "{}") as { countryId?: string; governorateId?: string; areaId?: string };
    postJson<Quote>(`/api/store/${slug}`, {
      action: "quote",
      items: cart.items,
      couponCode: coupon,
      fulfillment,
      rateId,
      ...geo,
    }).then((data) => {
      setQuote(data);
      setError("");
      if (!rateId && data.rates?.[0]) setRateId(data.rates[0].id);
    }).catch((err: Error) => {
      setQuote(null);
      setError(errorText(locale, err.message));
    });
  }, [cart.items, coupon, fulfillment, locale, rateId, slug]);

  async function place(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const geo = JSON.parse(localStorage.getItem(`tajer-geo-${slug}`) || "{}") as { countryId?: string; governorateId?: string; areaId?: string };
    try {
      const result = await postJson<{ id: string }>(`/api/store/${slug}`, {
        action: "checkout",
        items: cart.items,
        couponCode: coupon,
        fulfillment,
        rateId,
        ...geo,
        ...form,
        tableCode: cart.tableCode,
      });
      cart.clear();
      router.push(`${base}/order/${result.id}`);
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="cart-layout">
      <div>
        {!cart.items.length && <p>{tx(locale, "The cart is empty.", "السلة فارغة.")}</p>}
        {quote?.lines.map((line) => (
          <div className="line" key={`${line.productId}-${line.variantId}`}>
            <img src={line.imageUrl} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12 }} />
            <div>
              <strong>{locale === "ar" ? line.nameAr : line.nameEn}</strong>
              <div className="qty">
                <button type="button" onClick={() => cart.setQty(line.productId, line.variantId, line.qty - 1)}>-</button>
                <span style={{ padding: "0 8px" }}>{line.qty}</span>
                <button type="button" onClick={() => cart.setQty(line.productId, line.variantId, line.qty + 1)}>+</button>
              </div>
            </div>
            <div>
              <b>{money(line.active * line.qty, quote.currency, locale)}</b>
              {line.active < line.original && <div><s>{money(line.original, quote.currency, locale)}</s></div>}
            </div>
          </div>
        ))}
      </div>
      <aside className="card" style={{ padding: 16, alignSelf: "start" }}>
        <label className="field"><span>{tx(locale, "Coupon", "كوبون")}</span><input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="SAVE20" /></label>
        <div className="row" style={{ margin: "10px 0" }}>
          {["delivery", "pickup", "dine_in"].map((item) => (
            <button key={item} type="button" className={`btn btn-sm ${fulfillment === item ? "btn-navy" : "btn-line"}`} onClick={() => setFulfillment(item)}>{label(locale, item)}</button>
          ))}
        </div>
        {fulfillment === "delivery" && quote?.rates?.map((rate) => (
          <label key={rate.id} className="row">
            <input type="radio" checked={rateId === rate.id} onChange={() => setRateId(rate.id)} />
            <span>{locale === "ar" ? rate.providerAr : rate.providerEn} · {money(rate.price, quote.currency, locale)} · {locale === "ar" ? rate.etaAr : rate.etaEn}</span>
          </label>
        ))}
        {quote && (
          <div className="stack" style={{ marginTop: 12 }}>
            <div className="between"><span>{tx(locale, "Items", "السلع")}</span><b>{money(quote.totals.subtotal, quote.currency, locale)}</b></div>
            <div className="between"><span>{tx(locale, "Item sales", "تخفيض السلع")}</span><b>-{money(quote.totals.itemDiscount, quote.currency, locale)}</b></div>
            <div className="between"><span>{tx(locale, "Store-wide", "خصم المتجر")}</span><b>-{money(quote.totals.storeDiscount, quote.currency, locale)}</b></div>
            <div className="between"><span>{tx(locale, "Coupon", "الكوبون")}</span><b>-{money(quote.totals.couponDiscount, quote.currency, locale)}</b></div>
            <div className="between"><span>{tx(locale, "Shipping", "الشحن")}</span><b>{money(quote.totals.shipping, quote.currency, locale)}</b></div>
            <div className="between"><span>{tx(locale, "VAT", "الضريبة")}</span><b>{money(quote.totals.vat, quote.currency, locale)}</b></div>
            <div className="between"><span>{tx(locale, "Total", "الإجمالي")}</span><b>{money(quote.totals.total, quote.currency, locale)}</b></div>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        {mode === "cart" ? (
          <Link className="btn btn-emerald" href={`${base}/checkout`}>{tx(locale, "Checkout", "إتمام الطلب")}</Link>
        ) : (
          <form className="stack" onSubmit={place}>
            <label className="field"><span>{tx(locale, "Name", "الاسم")}</span><input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} /></label>
            <label className="field"><span>{tx(locale, "Phone", "الهاتف")}</span><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label className="field"><span>{tx(locale, "Email", "البريد")}</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            {fulfillment === "delivery" && <label className="field"><span>{tx(locale, "Address", "العنوان")}</span><textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>}
            <label className="field"><span>{tx(locale, "Notes", "ملاحظات")}</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <label className="field"><span>{tx(locale, "Payment", "الدفع")}</span>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {payments.filter((item) => item.enabled && (item.provider === "cash" || item.configured)).map((item) => <option key={item.provider} value={item.provider}>{label(locale, item.provider)}</option>)}
              </select>
            </label>
            <button className="btn btn-emerald" disabled={pending || !cart.items.length}>{tx(locale, "Place order", "أكد الطلب")}</button>
          </form>
        )}
      </aside>
    </div>
  );
}
