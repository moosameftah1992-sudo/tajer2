"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/commerce";
import { money } from "@/lib/commerce";
import { postJson } from "@/lib/client";
import { errorText, label, tx } from "@/lib/i18n";

type Order = { id: string; number: string; status: string; total: number; currency: string; createdAt: string };

export function AccountPanel({ locale, slug }: { locale: Locale; slug: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const data = await fetch(`/api/store/${slug}?resource=account`).then((res) => res.json());
    if (data.ok) setOrders(data.orders);
  }

  useEffect(() => {
    load().catch(() => setOrders([]));
  }, [slug]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await postJson("/api/auth", { action: mode === "login" ? "customer-login" : "customer-register", slug, ...form });
      await load();
    } catch (err) {
      setError(errorText(locale, err instanceof Error ? err.message : "SERVER"));
    }
  }

  return (
    <div className="checkout-grid">
      <form className="stack card" style={{ padding: 16 }} onSubmit={submit}>
        <div className="row">
          <button type="button" className={`btn btn-sm ${mode === "login" ? "btn-navy" : "btn-line"}`} onClick={() => setMode("login")}>{tx(locale, "Login", "دخول")}</button>
          <button type="button" className={`btn btn-sm ${mode === "register" ? "btn-navy" : "btn-line"}`} onClick={() => setMode("register")}>{tx(locale, "Register", "تسجيل")}</button>
        </div>
        {mode === "register" && <label className="field"><span>{tx(locale, "Name", "الاسم")}</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>}
        <label className="field"><span>{tx(locale, "Email", "البريد")}</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        {mode === "register" && <label className="field"><span>{tx(locale, "Phone", "الهاتف")}</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>}
        <label className="field"><span>{tx(locale, "Password", "كلمة المرور")}</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-emerald">{mode === "login" ? tx(locale, "Enter", "دخول") : tx(locale, "Create account", "أنشئ الحساب")}</button>
        {slug === "noor" && <p className="muted">layla@example.com · Customer#2026</p>}
      </form>
      <div>
        <h2>{tx(locale, "Orders", "الطلبات")}</h2>
        {orders?.map((order) => (
          <article className="order-card" key={order.id}>
            <strong>{order.number}</strong>
            <p>{label(locale, order.status)} · {money(order.total, order.currency, locale)}</p>
          </article>
        ))}
        {orders && orders.length === 0 && <p className="muted">{tx(locale, "No orders on this account yet.", "لا طلبات على هذا الحساب بعد.")}</p>}
      </div>
    </div>
  );
}
