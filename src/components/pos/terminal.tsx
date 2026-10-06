"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/commerce";
import { money } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { errorText, tx } from "@/lib/i18n";

type Product = {
  id: string;
  categoryId: string | null;
  nameEn: string;
  nameAr: string;
  barcode: string;
  imageUrl: string;
  activePrice: number;
  originalPrice: number;
  stock: number;
  trackStock: boolean;
  variants: Array<{ id: string; nameEn: string; nameAr: string; barcode: string; price: number | null; stock: number }>;
};

type Payload = {
  tenant: { slug: string; nameEn: string; nameAr: string; currency: string; storeWideDiscountActive: boolean; storeWideDiscountPercent: number };
  categories: Array<{ id: string; nameEn: string; nameAr: string }>;
  products: Product[];
};

type Line = { productId: string; variantId: string | null; nameEn: string; nameAr: string; qty: number; active: number; original: number };

export function PosTerminal({ initial, locale }: { initial: Payload; locale: Locale }) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [coupon, setCoupon] = useState("");
  const [method, setMethod] = useState("cash");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ number: string; total: number; lines: Line[] } | null>(null);
  const scan = useRef<HTMLInputElement>(null);
  const products = initial.products.filter((product) => {
    if (category && product.categoryId !== category) return false;
    if (!query) return true;
    const hay = `${product.nameEn} ${product.nameAr} ${product.barcode}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  function add(product: Product, variantId?: string) {
    const variant = product.variants.find((item) => item.id === variantId);
    const active = variant?.price ?? product.activePrice;
    const original = variant?.price ?? product.originalPrice;
    setLines((current) => {
      const index = current.findIndex((line) => line.productId === product.id && line.variantId === (variantId || null));
      if (index === -1) return [...current, { productId: product.id, variantId: variantId || null, nameEn: variant ? `${product.nameEn} ${variant.nameEn}` : product.nameEn, nameAr: variant ? `${product.nameAr} ${variant.nameAr}` : product.nameAr, qty: 1, active, original }];
      return current.map((line, lineIndex) => lineIndex === index ? { ...line, qty: line.qty + 1 } : line);
    });
  }

  async function onScan(event: React.FormEvent) {
    event.preventDefault();
    const code = query.trim();
    if (!code) return;
    try {
      const found = await fetch(`/api/store/${initial.tenant.slug}?resource=barcode&code=${encodeURIComponent(code)}`).then((res) => res.json());
      const product = initial.products.find((item) => item.id === found.productId);
      if (product) add(product, found.variantId || undefined);
      setQuery("");
    } catch {
      setError(errorText(locale, "NOT_FOUND"));
    }
  }

  async function pay() {
    setError("");
    try {
      const result = await postJson<{ number: string; totals: { total: number } }>(`/api/store/${initial.tenant.slug}`, {
        action: "pos-sale",
        items: lines.map((line) => ({ productId: line.productId, variantId: line.variantId, qty: line.qty })),
        couponCode: coupon,
        paymentMethod: method,
        customerName: "Walk-in",
      });
      setReceipt({ number: result.number, total: result.totals.total, lines });
      setLines([]);
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    }
  }

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.active * line.qty, 0), [lines]);

  return (
    <div className="pos">
      <section className="pos-main">
        <div className="between">
          <div>
            <p className="tiny">TAJER POS</p>
            <h1 style={{ margin: 0 }}>{locale === "ar" ? initial.tenant.nameAr : initial.tenant.nameEn}</h1>
          </div>
          <Link className="btn btn-line btn-sm" href={`/s/${initial.tenant.slug}/manage`}>{tx(locale, "Desk", "المكتب")}</Link>
        </div>
        <form className="row" onSubmit={onScan} style={{ margin: "12px 0" }}>
          <input ref={scan} className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tx(locale, "Scan barcode or search", "امسح الباركود أو ابحث")} autoFocus />
          <button className="btn btn-emerald">{tx(locale, "Find", "بحث")}</button>
        </form>
        <div className="row">
          <button className={`btn btn-sm ${category === "" ? "btn-emerald" : "btn-line"}`} type="button" onClick={() => setCategory("")}>{tx(locale, "All", "الكل")}</button>
          {initial.categories.map((item) => <button key={item.id} className={`btn btn-sm ${category === item.id ? "btn-emerald" : "btn-line"}`} type="button" onClick={() => setCategory(item.id)}>{locale === "ar" ? item.nameAr : item.nameEn}</button>)}
        </div>
        <div className="pos-grid" style={{ marginTop: 12 }}>
          {products.map((product) => (
            <button className="pos-item" key={product.id} type="button" onClick={() => add(product)}>
              <img src={product.imageUrl || "/images/products/food-1.jpg"} alt="" />
              <div>
                <strong>{locale === "ar" ? product.nameAr : product.nameEn}</strong>
                <p>{money(product.activePrice, initial.tenant.currency, locale)} {product.activePrice < product.originalPrice && <s>{money(product.originalPrice, initial.tenant.currency, locale)}</s>}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
      <aside className="pos-side">
        <header>
          <strong>{tx(locale, "Ticket", "التذكرة")}</strong>
          {initial.tenant.storeWideDiscountActive && <p className="tiny">{initial.tenant.storeWideDiscountPercent}% {tx(locale, "store-wide", "على المتجر")}</p>}
        </header>
        <div className="pos-lines">
          {lines.map((line) => (
            <div className="between" key={`${line.productId}-${line.variantId}`} style={{ padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
              <span>{locale === "ar" ? line.nameAr : line.nameEn} × {line.qty}</span>
              <span>{money(line.active * line.qty, initial.tenant.currency, locale)}</span>
            </div>
          ))}
        </div>
        <footer className="stack">
          <input className="input" placeholder={tx(locale, "Coupon", "كوبون")} value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
          <div className="row">
            {["cash", "card", "benefit"].map((item) => <button key={item} type="button" className={`btn btn-sm ${method === item ? "btn-emerald" : "btn-line"}`} onClick={() => setMethod(item)}>{item}</button>)}
          </div>
          <div className="between"><span>{tx(locale, "Running", "الجاري")}</span><b>{money(subtotal, initial.tenant.currency, locale)}</b></div>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-emerald" type="button" disabled={!lines.length} onClick={pay}>{tx(locale, "Take payment", "استلم الدفع")}</button>
          <button className="btn btn-line" type="button" onClick={() => setLines([])}>{tx(locale, "Clear", "مسح")}</button>
        </footer>
      </aside>
      {receipt && (
        <div className="modal-back">
          <div className="modal receipt-live">
            <h2>{receipt.number}</h2>
            {receipt.lines.map((line) => <div className="between" key={`${line.productId}-${line.variantId}`}><span>{line.nameEn}</span><span>{money(line.active * line.qty, initial.tenant.currency, locale)}</span></div>)}
            <h3>{money(receipt.total, initial.tenant.currency, locale)}</h3>
            <div className="receipt">
              <h2>Tajer · {initial.tenant.nameEn}</h2>
              <p>{receipt.number}</p>
              {receipt.lines.map((line) => <p key={line.productId}>{line.nameEn} × {line.qty}</p>)}
              <p>{money(receipt.total, initial.tenant.currency, locale)}</p>
            </div>
            <div className="row">
              <button className="btn btn-navy" type="button" onClick={() => window.print()}>{tx(locale, "Print receipt", "اطبع الإيصال")}</button>
              <button className="btn btn-line" type="button" onClick={() => setReceipt(null)}>{tx(locale, "New sale", "بيع جديد")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
