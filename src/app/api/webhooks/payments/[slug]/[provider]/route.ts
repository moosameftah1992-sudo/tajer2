import { createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, paymentGateways, payments } from "@/db/schema";
import { decryptSecret } from "@/lib/auth";
import { AppError, asError } from "@/lib/errors";
import { ready, tenantBySlug } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ slug: string; provider: string }> }) {
  try {
    await ready();
    const { slug, provider } = await context.params;
    const tenant = await tenantBySlug(slug);
    if (!tenant) throw new AppError("NOT_FOUND", 404);
    const raw = await request.text();
    const [gateway] = await db.select().from(paymentGateways).where(and(eq(paymentGateways.tenantId, tenant.id), eq(paymentGateways.provider, provider))).limit(1);
    if (!gateway) throw new AppError("NOT_FOUND", 404);
    const secret = decryptSecret(gateway.secretEnc);
    if (secret) {
      const expected = createHmac("sha256", secret).update(raw).digest("hex");
      const given = request.headers.get("x-tajer-signature") || "";
      const a = Buffer.from(expected);
      const b = Buffer.from(given);
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError("FORBIDDEN", 401);
    }
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const reference = String(payload.reference || payload.orderNumber || "");
    const status = String(payload.status || "paid");
    const [payment] = reference
      ? await db.select().from(payments).where(and(eq(payments.tenantId, tenant.id), eq(payments.reference, reference))).limit(1)
      : [];
    const orderNumber = String(payload.orderNumber || "");
    const [order] = payment
      ? await db.select().from(orders).where(and(eq(orders.id, payment.orderId), eq(orders.tenantId, tenant.id))).limit(1)
      : await db.select().from(orders).where(and(eq(orders.tenantId, tenant.id), eq(orders.number, orderNumber))).limit(1);
    if (!order) throw new AppError("NOT_FOUND", 404);
    const paid = status === "paid" || status === "captured" || status === "succeeded";
    await db.update(orders).set({ paymentStatus: paid ? "paid" : status === "failed" ? "failed" : order.paymentStatus, updatedAt: new Date() }).where(and(eq(orders.id, order.id), eq(orders.tenantId, tenant.id)));
    if (payment) {
      await db.update(payments).set({ status: paid ? "paid" : "failed", raw: payload }).where(and(eq(payments.id, payment.id), eq(payments.tenantId, tenant.id)));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const known = asError(error);
    if (!known) console.error(error);
    return NextResponse.json({ ok: false, code: known?.code || "SERVER" }, { status: known?.status || 500 });
  }
}
