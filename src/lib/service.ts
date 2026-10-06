import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  areas,
  auditLogs,
  categories,
  coupons,
  countries,
  governorates,
  mediaAssets,
  mediaFolders,
  orderItems,
  orders,
  paymentGateways,
  payments,
  platformSettings,
  platformUsers,
  productVariants,
  products,
  renewalRequests,
  restaurantTables,
  shippingProviders,
  shippingRates,
  subscriptionEvents,
  tenantCarriers,
  tenantDomains,
  tenants,
  themeCatalog,
  users,
} from "@/db/schema";
import { decryptSecret, encryptSecret, hashPassword, maskSecret, newId, readSession, verifyPassword } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { daysRemaining, num, quoteTotals, resolveUnitPrice, slugify, subscriptionActive, isEmail, addDays } from "@/lib/commerce";
import { CURRENCIES, PLATFORM_FEATURES, RESERVED_SLUGS, STAFF_FEATURES, canUseFeature, currencyMeta, defaultStaffPermissions } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { proxySnippet } from "@/lib/snippets";
import { THEMES, normalizeThemeConfig } from "@/lib/themes";

export { proxySnippet };

type ItemInput = { productId?: string; variantId?: string | null; qty?: number };
type QuoteBody = {
  items?: ItemInput[];
  couponCode?: string;
  fulfillment?: string;
  countryId?: string;
  governorateId?: string;
  areaId?: string;
  rateId?: string;
};

export async function ready() {
  await ensureBootstrapped();
}

function m(value: number, currency: string) {
  return value.toFixed(currencyMeta(currency).decimals);
}

function clean(value: unknown, max = 240) {
  return String(value ?? "").trim().slice(0, max);
}

export async function audit(entry: {
  tenantId?: string | null;
  actorId: string;
  actorKind: string;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id: newId(),
    tenantId: entry.tenantId ?? null,
    actorId: entry.actorId,
    actorKind: entry.actorKind,
    action: entry.action,
    entity: entry.entity || "",
    entityId: entry.entityId || "",
    meta: entry.meta || {},
  });
}

export async function getSettings() {
  await ready();
  const [row] = await db.select().from(platformSettings).where(eq(platformSettings.id, "default")).limit(1);
  if (!row) throw new AppError("NOT_FOUND", 404);
  return row;
}

export async function getGeo() {
  await ready();
  const countryRows = await db.select().from(countries).orderBy(asc(countries.sort));
  const govRows = await db.select().from(governorates).orderBy(asc(governorates.sort));
  const areaRows = await db.select().from(areas).orderBy(asc(areas.sort));
  return countryRows.map((country) => ({
    ...country,
    vatDefault: num(country.vatDefault),
    governorates: govRows
      .filter((gov) => gov.countryId === country.id)
      .map((gov) => ({
        ...gov,
        areas: areaRows.filter((area) => area.governorateId === gov.id),
      })),
  }));
}

export async function tenantBySlug(slug: string) {
  await ready();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  return tenant ?? null;
}

export function publicTenant(tenant: typeof tenants.$inferSelect) {
  const theme = normalizeThemeConfig(tenant.themeId, tenant.themeConfig);
  return {
    id: tenant.id,
    slug: tenant.slug,
    nameEn: tenant.nameEn,
    nameAr: tenant.nameAr,
    industry: tenant.industry,
    countryId: tenant.countryId,
    governorateId: tenant.governorateId,
    currency: tenant.currency,
    vatRate: num(tenant.vatRate),
    vatInclusive: tenant.vatInclusive,
    phone: tenant.phone,
    email: tenant.email,
    addressEn: tenant.addressEn,
    addressAr: tenant.addressAr,
    aboutEn: tenant.aboutEn,
    aboutAr: tenant.aboutAr,
    logoUrl: tenant.logoUrl,
    faviconUrl: tenant.faviconUrl,
    themeId: tenant.themeId,
    theme,
    storeWideDiscountPercent: num(tenant.storeWideDiscountPercent),
    storeWideDiscountActive: tenant.storeWideDiscountActive,
    plan: tenant.plan,
    status: tenant.status,
    featured: tenant.featured,
    trialEndsAt: tenant.trialEndsAt.toISOString(),
    subscriptionEndsAt: tenant.subscriptionEndsAt.toISOString(),
    active: subscriptionActive(tenant.status, tenant.subscriptionEndsAt),
    daysLeft: daysRemaining(tenant.subscriptionEndsAt),
  };
}

async function catalog(tenantId: string, includeHidden: boolean) {
  const categoryRows = await db.select().from(categories).where(eq(categories.tenantId, tenantId)).orderBy(asc(categories.sort));
  const productRows = await db
    .select()
    .from(products)
    .where(includeHidden ? eq(products.tenantId, tenantId) : and(eq(products.tenantId, tenantId), eq(products.active, true)))
    .orderBy(asc(products.sort), desc(products.createdAt));
  const ids = productRows.map((row) => row.id);
  const variantRows = ids.length
    ? await db.select().from(productVariants).where(and(eq(productVariants.tenantId, tenantId), inArray(productVariants.productId, ids)))
    : [];
  return {
    categories: categoryRows.filter((row) => includeHidden || row.active),
    products: productRows.map((row) => {
      const priced = resolveUnitPrice({
        price: num(row.price),
        salePrice: row.salePrice == null ? null : num(row.salePrice),
        discountPercent: row.discountPercent == null ? null : num(row.discountPercent),
      });
      return {
        id: row.id,
        categoryId: row.categoryId,
        nameEn: row.nameEn,
        nameAr: row.nameAr,
        descriptionEn: row.descriptionEn,
        descriptionAr: row.descriptionAr,
        sku: includeHidden ? row.sku : "",
        barcode: includeHidden ? row.barcode : "",
        price: num(row.price),
        salePrice: row.salePrice == null ? null : num(row.salePrice),
        discountPercent: row.discountPercent == null ? null : num(row.discountPercent),
        originalPrice: priced.original,
        activePrice: priced.active,
        imageUrl: row.imageUrl,
        images: row.images || [],
        stock: row.stock,
        trackStock: row.trackStock,
        active: row.active,
        featured: row.featured,
        weightValue: row.weightValue == null ? null : num(row.weightValue),
        weightUnit: row.weightUnit,
        purity: row.purity,
        unit: row.unit,
        variants: variantRows
          .filter((variant) => variant.productId === row.id && (includeHidden || variant.active))
          .sort((a, b) => a.sort - b.sort)
          .map((variant) => ({
            id: variant.id,
            nameEn: variant.nameEn,
            nameAr: variant.nameAr,
            sku: includeHidden ? variant.sku : "",
            barcode: includeHidden ? variant.barcode : "",
            price: variant.price == null ? null : num(variant.price),
            stock: variant.stock,
            active: variant.active,
          })),
      };
    }),
  };
}

export async function publicStore(slug: string) {
  const tenant = await tenantBySlug(slug);
  if (!tenant) return null;
  const data = await catalog(tenant.id, false);
  const gates = await db.select().from(paymentGateways).where(eq(paymentGateways.tenantId, tenant.id));
  return {
    tenant: publicTenant(tenant),
    ...data,
    payments: gates.map((gate) => ({ provider: gate.provider, enabled: gate.enabled, sandbox: gate.sandbox, configured: Boolean(gate.merchantId) || gate.provider === "cash" })),
  };
}

export async function productDetail(slug: string, id: string) {
  const store = await publicStore(slug);
  if (!store) return null;
  const product = store.products.find((item) => item.id === id);
  if (!product) return null;
  return { tenant: store.tenant, product, categories: store.categories, payments: store.payments };
}

async function enabledRates(tenantId: string) {
  const [rates, carriers, providers] = await Promise.all([
    db.select().from(shippingRates).where(and(eq(shippingRates.tenantId, tenantId), eq(shippingRates.active, true))),
    db.select().from(tenantCarriers).where(and(eq(tenantCarriers.tenantId, tenantId), eq(tenantCarriers.enabled, true))),
    db.select().from(shippingProviders).where(eq(shippingProviders.active, true)),
  ]);
  const allowed = new Set(carriers.map((row) => row.providerId));
  const names = new Map(providers.map((row) => [row.id, row]));
  return rates
    .filter((rate) => rate.providerId && allowed.has(rate.providerId) && names.has(rate.providerId))
    .map((rate) => ({
      id: rate.id,
      providerId: rate.providerId,
      providerEn: names.get(rate.providerId || "")?.nameEn || "",
      providerAr: names.get(rate.providerId || "")?.nameAr || "",
      countryId: rate.countryId,
      governorateId: rate.governorateId,
      areaId: rate.areaId,
      price: num(rate.price),
      etaEn: rate.etaEn,
      etaAr: rate.etaAr,
    }));
}

function rateMatches(rate: { countryId: string; governorateId: string | null; areaId: string | null }, body: QuoteBody) {
  if (rate.countryId !== body.countryId) return false;
  if (rate.areaId) return rate.areaId === body.areaId;
  if (rate.governorateId) return rate.governorateId === body.governorateId;
  return true;
}

function rateScore(rate: { areaId: string | null; governorateId: string | null }) {
  if (rate.areaId) return 3;
  if (rate.governorateId) return 2;
  return 1;
}

async function loadCoupon(tenantId: string, code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const rows = await db.select().from(coupons).where(eq(coupons.tenantId, tenantId));
  const coupon = rows.find((row) => row.code.toUpperCase() === normalized);
  if (!coupon) throw new AppError("COUPON");
  const now = Date.now();
  if (!coupon.active) throw new AppError("COUPON");
  if (coupon.startsAt && coupon.startsAt.getTime() > now) throw new AppError("COUPON");
  if (coupon.endsAt && coupon.endsAt.getTime() < now) throw new AppError("COUPON");
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) throw new AppError("COUPON");
  return coupon;
}

async function priceItems(tenantId: string, items: ItemInput[]) {
  const normalized = items
    .map((item) => ({ productId: clean(item.productId, 80), variantId: item.variantId ? clean(item.variantId, 80) : "", qty: Math.floor(Number(item.qty || 0)) }))
    .filter((item) => item.productId && item.qty > 0 && item.qty <= 99);
  if (!normalized.length) throw new AppError("REQUIRED");
  const ids = [...new Set(normalized.map((item) => item.productId))];
  const rows = await db.select().from(products).where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)));
  const variantRows = await db.select().from(productVariants).where(and(eq(productVariants.tenantId, tenantId), inArray(productVariants.productId, ids)));
  return normalized.map((item) => {
    const product = rows.find((row) => row.id === item.productId && row.active);
    if (!product) throw new AppError("NOT_FOUND", 404);
    const variant = item.variantId ? variantRows.find((row) => row.id === item.variantId && row.productId === product.id && row.active) : null;
    if (item.variantId && !variant) throw new AppError("NOT_FOUND", 404);
    const priced = resolveUnitPrice({
      price: num(product.price),
      salePrice: product.salePrice == null ? null : num(product.salePrice),
      discountPercent: product.discountPercent == null ? null : num(product.discountPercent),
      variantPrice: variant?.price == null ? null : num(variant.price),
    });
    const available = variant ? variant.stock : product.stock;
    if ((variant || product.trackStock) && available < item.qty) throw new AppError("STOCK");
    return {
      product,
      variant,
      qty: item.qty,
      original: priced.original,
      active: priced.active,
      nameEn: variant ? `${product.nameEn} · ${variant.nameEn}` : product.nameEn,
      nameAr: variant ? `${product.nameAr} · ${variant.nameAr}` : product.nameAr,
      sku: variant?.sku || product.sku,
      imageUrl: product.imageUrl,
    };
  });
}

export async function quote(slug: string, body: QuoteBody) {
  const tenant = await tenantBySlug(slug);
  if (!tenant) throw new AppError("NOT_FOUND", 404);
  if (!subscriptionActive(tenant.status, tenant.subscriptionEndsAt)) throw new AppError("EXPIRED", 402);
  const lines = await priceItems(tenant.id, body.items || []);
  const settings = await getSettings();
  let coupon: { type: "percent" | "fixed"; value: number; minSubtotal: number } | null = null;
  let couponCode = "";
  if (body.couponCode) {
    const row = await loadCoupon(tenant.id, body.couponCode);
    if (row) {
      coupon = { type: row.type === "fixed" ? "fixed" : "percent", value: num(row.value), minSubtotal: num(row.minSubtotal) };
      couponCode = row.code;
    }
  }
  const fulfillment = body.fulfillment === "pickup" || body.fulfillment === "dine_in" ? body.fulfillment : "delivery";
  const rates = await enabledRates(tenant.id);
  const matched = rates.filter((rate) => rateMatches(rate, body)).sort((a, b) => rateScore(b) - rateScore(a) || a.price - b.price);
  let shipping = 0;
  let chosen: (typeof matched)[number] | null = matched[0] ?? null;
  if (fulfillment === "delivery") {
    if (body.rateId) chosen = matched.find((rate) => rate.id === body.rateId) ?? null;
    if (!chosen) throw new AppError("SHIPPING");
    shipping = chosen.price;
  } else {
    chosen = null;
  }
  const totals = quoteTotals({
    lines: lines.map((line) => ({ original: line.original, active: line.active, qty: line.qty })),
    storeWidePercent: num(tenant.storeWideDiscountPercent),
    storeWideActive: tenant.storeWideDiscountActive,
    coupon,
    shipping,
    vatRate: num(tenant.vatRate),
    vatInclusive: tenant.vatInclusive,
    currency: tenant.currency,
    commissionPercent: num(settings.commissionPercent),
  });
  if (totals.couponError) throw new AppError(totals.couponError);
  return {
    currency: tenant.currency,
    couponCode,
    fulfillment,
    rate: chosen,
    rates: matched,
    lines: lines.map((line) => ({
      productId: line.product.id,
      variantId: line.variant?.id || null,
      nameEn: line.nameEn,
      nameAr: line.nameAr,
      sku: line.sku,
      imageUrl: line.imageUrl,
      qty: line.qty,
      original: line.original,
      active: line.active,
    })),
    totals,
  };
}

async function nextNumber(tx: Pick<typeof db, "update">, tenant: typeof tenants.$inferSelect) {
  const seq = tenant.orderSeq + 1;
  await tx.update(tenants).set({ orderSeq: seq, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
  return `${tenant.slug.slice(0, 12).toUpperCase()}-${1000 + seq}`;
}

async function decrement(tx: Pick<typeof db, "update">, tenantId: string, productId: string, variantId: string | null, qty: number, track: boolean) {
  if (variantId) {
    const updated = await tx
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} - ${qty}` })
      .where(and(eq(productVariants.id, variantId), eq(productVariants.tenantId, tenantId), gte(productVariants.stock, qty)))
      .returning({ id: productVariants.id });
    if (!updated.length) throw new AppError("STOCK");
  }
  if (track) {
    const updated = await tx
      .update(products)
      .set({ stock: sql`${products.stock} - ${qty}`, updatedAt: new Date() })
      .where(and(eq(products.id, productId), eq(products.tenantId, tenantId), gte(products.stock, qty)))
      .returning({ id: products.id });
    if (!updated.length) throw new AppError("STOCK");
  }
}

async function restore(tenantId: string, lines: Array<{ productId: string; variantId: string | null; qty: number; track: boolean }>) {
  for (const line of lines) {
    if (line.variantId) {
      await db.update(productVariants).set({ stock: sql`${productVariants.stock} + ${line.qty}` }).where(and(eq(productVariants.id, line.variantId), eq(productVariants.tenantId, tenantId)));
    }
    if (line.track) {
      await db.update(products).set({ stock: sql`${products.stock} + ${line.qty}` }).where(and(eq(products.id, line.productId), eq(products.tenantId, tenantId)));
    }
  }
}

async function capture(tenantId: string, provider: string, amount: number, currency: string, orderNumber: string) {
  const [gateway] = await db.select().from(paymentGateways).where(and(eq(paymentGateways.tenantId, tenantId), eq(paymentGateways.provider, provider))).limit(1);
  if (!gateway?.enabled) throw new AppError("PAYMENT_UNAVAILABLE");
  if (provider === "cash") return { status: "unpaid" as const, reference: "", raw: { method: "cash" } };
  if (!gateway.merchantId) throw new AppError("PAYMENT_CONFIG");
  const apiKey = decryptSecret(gateway.apiKeyEnc);
  const secret = decryptSecret(gateway.secretEnc);
  if (!gateway.sandbox) {
    if (!apiKey || !gateway.apiBaseUrl) throw new AppError("PAYMENT_CONFIG");
    const payload = { amount, currency, orderNumber, merchantId: gateway.merchantId, provider };
    const response = await fetch(gateway.apiBaseUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "x-merchant-id": gateway.merchantId,
        "x-tajer-secret": secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    }).catch(() => null);
    if (!response || !response.ok) throw new AppError("PAYMENT_FAILED");
    const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: "paid" as const, reference: String(raw.reference || raw.id || orderNumber), raw };
  }
  return { status: "paid" as const, reference: `sandbox-${provider}-${orderNumber}`, raw: { sandbox: true, merchantId: gateway.merchantId, provider } };
}

export async function checkout(slug: string, body: QuoteBody & {
  customerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  paymentMethod?: string;
  tableCode?: string;
}) {
  const session = await readSession();
  const quoted = await quote(slug, body);
  const tenant = await tenantBySlug(slug);
  if (!tenant) throw new AppError("NOT_FOUND", 404);
  const name = clean(body.customerName, 120);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 160).toLowerCase();
  if (name.length < 2 || phone.length < 6) throw new AppError("REQUIRED");
  if (quoted.fulfillment === "delivery" && clean(body.address, 240).length < 3) throw new AppError("GEO");
  const method = ["cash", "benefit", "card", "paypal"].includes(String(body.paymentMethod)) ? String(body.paymentMethod) : "";
  if (!method) throw new AppError("PAYMENT_UNAVAILABLE");
  let tableId: string | null = null;
  let tableName = "";
  if (body.tableCode) {
    const [table] = await db.select().from(restaurantTables).where(and(eq(restaurantTables.tenantId, tenant.id), eq(restaurantTables.code, clean(body.tableCode, 40)))).limit(1);
    if (table?.active) {
      tableId = table.id;
      tableName = table.name;
    }
  }
  const customerId = session?.kind === "customer" && session.tenantId === tenant.id ? session.sub : null;
  const orderId = newId();
  let number = "";
  const tracks = quoted.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    qty: line.qty,
    track: true,
  }));
  await db.transaction(async (tx) => {
    number = await nextNumber(tx, tenant);
    for (const line of quoted.lines) {
      const [product] = await tx.select().from(products).where(and(eq(products.id, line.productId), eq(products.tenantId, tenant.id))).limit(1);
      await decrement(tx, tenant.id, line.productId, line.variantId, line.qty, product?.trackStock !== false);
      tracks.find((item) => item.productId === line.productId)!.track = product?.trackStock !== false;
    }
    if (quoted.couponCode) {
      await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(and(eq(coupons.tenantId, tenant.id), eq(coupons.code, quoted.couponCode)));
    }
    await tx.insert(orders).values({
      id: orderId,
      tenantId: tenant.id,
      number,
      customerId,
      customerName: name,
      phone,
      email,
      fulfillment: quoted.fulfillment,
      tableId,
      tableName,
      countryId: body.countryId || null,
      governorateId: body.governorateId || null,
      areaId: body.areaId || null,
      address: clean(body.address, 240),
      channel: tableId ? "qr" : "web",
      status: "pending",
      paymentMethod: method,
      paymentStatus: method === "cash" ? "unpaid" : "pending",
      currency: tenant.currency,
      subtotal: m(quoted.totals.subtotal, tenant.currency),
      itemDiscount: m(quoted.totals.itemDiscount, tenant.currency),
      storeDiscount: m(quoted.totals.storeDiscount, tenant.currency),
      couponDiscount: m(quoted.totals.couponDiscount, tenant.currency),
      discountTotal: m(quoted.totals.discountTotal, tenant.currency),
      shippingTotal: m(quoted.totals.shipping, tenant.currency),
      vatTotal: m(quoted.totals.vat, tenant.currency),
      total: m(quoted.totals.total, tenant.currency),
      commissionAmount: m(quoted.totals.commission, tenant.currency),
      couponCode: quoted.couponCode,
      storeDiscountPercent: m(quoted.totals.storeDiscountPercent, tenant.currency),
      carrierId: quoted.rate?.providerId || null,
      carrierName: quoted.rate?.providerEn || "",
      notes: clean(body.notes, 500),
    });
    await tx.insert(orderItems).values(
      quoted.lines.map((line) => ({
        id: newId(),
        tenantId: tenant.id,
        orderId,
        productId: line.productId,
        variantId: line.variantId,
        nameEn: line.nameEn,
        nameAr: line.nameAr,
        sku: line.sku,
        qty: line.qty,
        originalPrice: m(line.original, tenant.currency),
        unitPrice: m(line.active, tenant.currency),
        lineDiscount: m((line.original - line.active) * line.qty, tenant.currency),
        lineTotal: m(line.active * line.qty, tenant.currency),
      })),
    );
  });
  if (method !== "cash") {
    try {
      const paid = await capture(tenant.id, method, quoted.totals.total, tenant.currency, number);
      await db.insert(payments).values({
        id: newId(),
        tenantId: tenant.id,
        orderId,
        provider: method,
        amount: m(quoted.totals.total, tenant.currency),
        currency: tenant.currency,
        status: paid.status,
        reference: paid.reference,
        raw: paid.raw,
      });
      await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(and(eq(orders.id, orderId), eq(orders.tenantId, tenant.id)));
    } catch (error) {
      await restore(tenant.id, tracks);
      await db.update(orders).set({ status: "cancelled", paymentStatus: "failed", updatedAt: new Date() }).where(eq(orders.id, orderId));
      if (quoted.couponCode) {
        await db.update(coupons).set({ usedCount: sql`greatest(${coupons.usedCount} - 1, 0)` }).where(and(eq(coupons.tenantId, tenant.id), eq(coupons.code, quoted.couponCode)));
      }
      throw error;
    }
  }
  if (quoted.rate?.providerId) {
    const [provider] = await db.select().from(shippingProviders).where(eq(shippingProviders.id, quoted.rate.providerId)).limit(1);
    if (provider?.outboundUrl) {
      fetch(provider.outboundUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-tajer-secret": provider.webhookSecret },
        body: JSON.stringify({ orderNumber: number, tenant: tenant.slug, address: clean(body.address, 240), phone }),
        signal: AbortSignal.timeout(8000),
      }).catch(() => undefined);
    }
  }
  return { id: orderId, number };
}

export async function posSale(slug: string, actorId: string, body: QuoteBody & { paymentMethod?: string; customerName?: string; notes?: string }) {
  const actor = await requireStaff(slug, "pos");
  const quoted = await quote(slug, { ...body, fulfillment: "pickup" });
  const method = body.paymentMethod === "card" || body.paymentMethod === "benefit" || body.paymentMethod === "paypal" ? body.paymentMethod : "cash";
  if (method !== "cash") await capture(actor.tenant.id, method, quoted.totals.total, actor.tenant.currency, "POS-HOLD");
  const orderId = newId();
  let number = "";
  await db.transaction(async (tx) => {
    number = await nextNumber(tx, actor.tenant);
    for (const line of quoted.lines) {
      const [product] = await tx.select().from(products).where(and(eq(products.id, line.productId), eq(products.tenantId, actor.tenant.id))).limit(1);
      await decrement(tx, actor.tenant.id, line.productId, line.variantId, line.qty, product?.trackStock !== false);
    }
    if (quoted.couponCode) {
      await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(and(eq(coupons.tenantId, actor.tenant.id), eq(coupons.code, quoted.couponCode)));
    }
    await tx.insert(orders).values({
      id: orderId,
      tenantId: actor.tenant.id,
      number,
      customerName: clean(body.customerName, 120) || "Walk-in",
      fulfillment: "pickup",
      channel: "pos",
      status: "fulfilled",
      paymentMethod: method,
      paymentStatus: "paid",
      currency: actor.tenant.currency,
      subtotal: m(quoted.totals.subtotal, actor.tenant.currency),
      itemDiscount: m(quoted.totals.itemDiscount, actor.tenant.currency),
      storeDiscount: m(quoted.totals.storeDiscount, actor.tenant.currency),
      couponDiscount: m(quoted.totals.couponDiscount, actor.tenant.currency),
      discountTotal: m(quoted.totals.discountTotal, actor.tenant.currency),
      shippingTotal: "0",
      vatTotal: m(quoted.totals.vat, actor.tenant.currency),
      total: m(quoted.totals.total, actor.tenant.currency),
      commissionAmount: m(quoted.totals.commission, actor.tenant.currency),
      couponCode: quoted.couponCode,
      storeDiscountPercent: m(quoted.totals.storeDiscountPercent, actor.tenant.currency),
      notes: clean(body.notes, 300),
    });
    await tx.insert(orderItems).values(
      quoted.lines.map((line) => ({
        id: newId(),
        tenantId: actor.tenant.id,
        orderId,
        productId: line.productId,
        variantId: line.variantId,
        nameEn: line.nameEn,
        nameAr: line.nameAr,
        sku: line.sku,
        qty: line.qty,
        originalPrice: m(line.original, actor.tenant.currency),
        unitPrice: m(line.active, actor.tenant.currency),
        lineDiscount: m((line.original - line.active) * line.qty, actor.tenant.currency),
        lineTotal: m(line.active * line.qty, actor.tenant.currency),
      })),
    );
    await tx.insert(payments).values({
      id: newId(),
      tenantId: actor.tenant.id,
      orderId,
      provider: method,
      amount: m(quoted.totals.total, actor.tenant.currency),
      currency: actor.tenant.currency,
      status: "paid",
      reference: `pos-${number}`,
      raw: { channel: "pos", actorId },
    });
  });
  return { id: orderId, number, totals: quoted.totals, lines: quoted.lines, currency: actor.tenant.currency };
}

export async function requireStaff(slug: string, feature: string) {
  await ready();
  const session = await readSession();
  if (!session || session.kind !== "staff") throw new AppError("FORBIDDEN", 401);
  const tenant = await tenantBySlug(slug);
  if (!tenant || tenant.id !== session.tenantId) throw new AppError("FORBIDDEN", 403);
  const [user] = await db.select().from(users).where(and(eq(users.id, session.sub), eq(users.tenantId, tenant.id))).limit(1);
  if (!user?.active || user.tokenVersion !== session.tv || user.role === "customer") throw new AppError("FORBIDDEN", 401);
  if (!canUseFeature(user.role, user.permissions || {}, feature)) throw new AppError("FORBIDDEN", 403);
  return { tenant, user, session };
}

export async function requirePlatform(feature: string) {
  await ready();
  const session = await readSession();
  if (!session || session.kind !== "platform") throw new AppError("FORBIDDEN", 401);
  const [user] = await db.select().from(platformUsers).where(eq(platformUsers.id, session.sub)).limit(1);
  if (!user?.active || user.tokenVersion !== session.tv) throw new AppError("FORBIDDEN", 401);
  if (user.role !== "platform_owner" && !user.permissions?.[feature]) throw new AppError("FORBIDDEN", 403);
  return user;
}

function assertLive(tenant: typeof tenants.$inferSelect) {
  if (!subscriptionActive(tenant.status, tenant.subscriptionEndsAt)) throw new AppError("EXPIRED", 402);
}

export async function orderBoard(tenantId: string, limit = 200) {
  const rows = await db.select().from(orders).where(eq(orders.tenantId, tenantId)).orderBy(desc(orders.createdAt)).limit(limit);
  const ids = rows.map((row) => row.id);
  const items = ids.length ? await db.select().from(orderItems).where(and(eq(orderItems.tenantId, tenantId), inArray(orderItems.orderId, ids))) : [];
  return rows.map((row) => ({
    ...serializeOrder(row),
    items: items.filter((item) => item.orderId === row.id).map((item) => ({
      id: item.id,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      sku: item.sku,
      qty: item.qty,
      unitPrice: num(item.unitPrice),
      originalPrice: num(item.originalPrice),
      lineTotal: num(item.lineTotal),
    })),
  }));
}

function serializeOrder(row: typeof orders.$inferSelect) {
  return {
    id: row.id,
    number: row.number,
    customerName: row.customerName,
    phone: row.phone,
    email: row.email,
    fulfillment: row.fulfillment,
    tableName: row.tableName,
    address: row.address,
    channel: row.channel,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    currency: row.currency,
    subtotal: num(row.subtotal),
    itemDiscount: num(row.itemDiscount),
    storeDiscount: num(row.storeDiscount),
    couponDiscount: num(row.couponDiscount),
    discountTotal: num(row.discountTotal),
    shippingTotal: num(row.shippingTotal),
    vatTotal: num(row.vatTotal),
    total: num(row.total),
    couponCode: row.couponCode,
    carrierName: row.carrierName,
    trackingNumber: row.trackingNumber,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findOrder(slug: string, id: string) {
  const tenant = await tenantBySlug(slug);
  if (!tenant) return null;
  const [row] = await db.select().from(orders).where(and(eq(orders.tenantId, tenant.id), eq(orders.id, id))).limit(1);
  if (!row) return null;
  const items = await db.select().from(orderItems).where(and(eq(orderItems.tenantId, tenant.id), eq(orderItems.orderId, row.id)));
  return { tenant: publicTenant(tenant), order: serializeOrder(row), items: items.map((item) => ({ ...item, unitPrice: num(item.unitPrice), originalPrice: num(item.originalPrice), lineTotal: num(item.lineTotal) })) };
}

export async function report(tenantId: string, from: Date, to: Date) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), gte(orders.createdAt, from), lte(orders.createdAt, to), ne(orders.status, "cancelled")));
  const ids = rows.map((row) => row.id);
  const items = ids.length ? await db.select().from(orderItems).where(and(eq(orderItems.tenantId, tenantId), inArray(orderItems.orderId, ids))) : [];
  const buckets = new Map<string, { label: string; revenue: number; orders: number }>();
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key) || { label: key, revenue: 0, orders: 0 };
    bucket.revenue += num(row.total);
    bucket.orders += 1;
    buckets.set(key, bucket);
  }
  const productMap = new Map<string, { nameEn: string; nameAr: string; qty: number; revenue: number }>();
  for (const item of items) {
    const current = productMap.get(item.nameEn) || { nameEn: item.nameEn, nameAr: item.nameAr, qty: 0, revenue: 0 };
    current.qty += item.qty;
    current.revenue += num(item.lineTotal);
    productMap.set(item.nameEn, current);
  }
  const paid = rows.filter((row) => row.paymentStatus === "paid");
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    series: [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label)),
    totals: {
      orders: rows.length,
      revenue: paid.reduce((sum, row) => sum + num(row.total), 0),
      discount: rows.reduce((sum, row) => sum + num(row.discountTotal), 0),
      vat: rows.reduce((sum, row) => sum + num(row.vatTotal), 0),
      shipping: rows.reduce((sum, row) => sum + num(row.shippingTotal), 0),
      average: paid.length ? paid.reduce((sum, row) => sum + num(row.total), 0) / paid.length : 0,
    },
    byStatus: countBy(rows.map((row) => row.status)),
    byChannel: countBy(rows.map((row) => row.channel)),
    byPayment: countBy(rows.map((row) => row.paymentMethod)),
    top: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 12),
    orders: rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(serializeOrder),
  };
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) map.set(value, (map.get(value) || 0) + 1);
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

export async function dashboard(slug: string) {
  const { tenant, user } = await requireStaff(slug, "overview");
  const [data, board, couponRows, staff, customers, folders, assets, gates, carriers, providers, rates, tables, domains, geo, summary] = await Promise.all([
    catalog(tenant.id, true),
    orderBoard(tenant.id, 180),
    db.select().from(coupons).where(eq(coupons.tenantId, tenant.id)).orderBy(desc(coupons.createdAt)),
    db.select().from(users).where(eq(users.tenantId, tenant.id)).orderBy(asc(users.createdAt)),
    db.select().from(users).where(and(eq(users.tenantId, tenant.id), eq(users.role, "customer"))).orderBy(desc(users.createdAt)),
    db.select().from(mediaFolders).where(eq(mediaFolders.tenantId, tenant.id)).orderBy(asc(mediaFolders.name)),
    db.select().from(mediaAssets).where(eq(mediaAssets.tenantId, tenant.id)).orderBy(desc(mediaAssets.createdAt)),
    db.select().from(paymentGateways).where(eq(paymentGateways.tenantId, tenant.id)),
    db.select().from(tenantCarriers).where(eq(tenantCarriers.tenantId, tenant.id)),
    db.select().from(shippingProviders).orderBy(asc(shippingProviders.nameEn)),
    db.select().from(shippingRates).where(eq(shippingRates.tenantId, tenant.id)),
    db.select().from(restaurantTables).where(eq(restaurantTables.tenantId, tenant.id)).orderBy(asc(restaurantTables.name)),
    db.select().from(tenantDomains).where(eq(tenantDomains.tenantId, tenant.id)),
    getGeo(),
    report(tenant.id, addDays(new Date(), -30), new Date()),
  ]);
  const themes = await db.select().from(themeCatalog).orderBy(asc(themeCatalog.sort));
  return {
    tenant: publicTenant(tenant),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: user.permissions || {} },
    features: STAFF_FEATURES.filter((feature) => canUseFeature(user.role, user.permissions || {}, feature)),
    ...data,
    orders: board,
    coupons: couponRows.map((row) => ({ ...row, value: num(row.value), minSubtotal: num(row.minSubtotal), startsAt: row.startsAt?.toISOString() || null, endsAt: row.endsAt?.toISOString() || null, createdAt: row.createdAt.toISOString() })),
    staff: staff.filter((row) => row.role !== "customer").map((row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role, permissions: row.permissions || {}, active: row.active })),
    customers: customers.map((row) => ({ id: row.id, name: row.name, email: row.email, phone: row.phone, createdAt: row.createdAt.toISOString(), orders: board.filter((order) => order.email === row.email).length })),
    folders,
    assets: assets.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    gateways: gates.map((row) => ({ provider: row.provider, enabled: row.enabled, merchantId: row.merchantId, apiBaseUrl: row.apiBaseUrl, sandbox: row.sandbox, apiKeyMask: maskSecret(row.apiKeyEnc), secretMask: maskSecret(row.secretEnc) })),
    carriers: carriers.map((row) => ({ ...row, provider: providers.find((item) => item.id === row.providerId) || null })),
    providers: providers.map((row) => ({ id: row.id, code: row.code, nameEn: row.nameEn, nameAr: row.nameAr, active: row.active })),
    rates: rates.map((row) => ({ ...row, price: num(row.price) })),
    tables,
    domains,
    geo,
    themes,
    summary,
    currencies: CURRENCIES,
  };
}

export async function posPayload(slug: string) {
  const { tenant } = await requireStaff(slug, "pos");
  assertLive(tenant);
  const data = await catalog(tenant.id, false);
  const couponRows = await db.select().from(coupons).where(and(eq(coupons.tenantId, tenant.id), eq(coupons.active, true)));
  return {
    tenant: publicTenant(tenant),
    ...data,
    coupons: couponRows.map((row) => row.code),
    products: (await catalog(tenant.id, true)).products.map((product) => ({ ...product, barcode: product.barcode, variants: product.variants })),
  };
}

export async function saveProduct(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "catalog");
  assertLive(tenant);
  const nameEn = clean(body.nameEn, 160);
  const nameAr = clean(body.nameAr, 160);
  const price = Number(body.price);
  if (!nameEn || !nameAr || !Number.isFinite(price) || price < 0) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const sale = body.salePrice === "" || body.salePrice == null ? null : Number(body.salePrice);
  const discount = body.discountPercent === "" || body.discountPercent == null ? null : Number(body.discountPercent);
  const values = {
    tenantId: tenant.id,
    categoryId: clean(body.categoryId, 80) || null,
    nameEn,
    nameAr,
    descriptionEn: clean(body.descriptionEn, 2000),
    descriptionAr: clean(body.descriptionAr, 2000),
    sku: clean(body.sku, 80),
    barcode: clean(body.barcode, 80),
    price: m(price, tenant.currency),
    salePrice: sale == null || !Number.isFinite(sale) ? null : m(sale, tenant.currency),
    discountPercent: discount == null || !Number.isFinite(discount) ? null : discount.toFixed(3),
    imageUrl: clean(body.imageUrl, 400),
    images: Array.isArray(body.images) ? body.images.map((item) => clean(item, 400)).filter(Boolean).slice(0, 8) : [],
    stock: Math.max(0, Math.floor(Number(body.stock || 0))),
    trackStock: body.trackStock !== false,
    active: body.active !== false,
    featured: Boolean(body.featured),
    weightValue: body.weightValue === "" || body.weightValue == null ? null : Number(body.weightValue).toFixed(3),
    weightUnit: clean(body.weightUnit, 20),
    purity: clean(body.purity, 40),
    unit: clean(body.unit, 40) || "piece",
    updatedAt: new Date(),
  };
  const existing = await db.select().from(products).where(and(eq(products.id, id), eq(products.tenantId, tenant.id))).limit(1);
  if (existing.length) await db.update(products).set(values).where(and(eq(products.id, id), eq(products.tenantId, tenant.id)));
  else await db.insert(products).values({ ...values, id });
  const variants = Array.isArray(body.variants) ? body.variants : [];
  const keep: string[] = [];
  for (const [index, raw] of variants.entries()) {
    const variant = raw as Record<string, unknown>;
    const variantId = clean(variant.id, 80) || newId();
    keep.push(variantId);
    const variantPrice = variant.price === "" || variant.price == null ? null : Number(variant.price);
    const record = {
      tenantId: tenant.id,
      productId: id,
      nameEn: clean(variant.nameEn, 120),
      nameAr: clean(variant.nameAr, 120),
      sku: clean(variant.sku, 80),
      barcode: clean(variant.barcode, 80),
      price: variantPrice == null || !Number.isFinite(variantPrice) ? null : m(variantPrice, tenant.currency),
      stock: Math.max(0, Math.floor(Number(variant.stock || 0))),
      active: variant.active !== false,
      sort: index,
    };
    if (!record.nameEn) continue;
    const found = await db.select().from(productVariants).where(and(eq(productVariants.id, variantId), eq(productVariants.tenantId, tenant.id))).limit(1);
    if (found.length) await db.update(productVariants).set(record).where(eq(productVariants.id, variantId));
    else await db.insert(productVariants).values({ ...record, id: variantId });
  }
  const current = await db.select().from(productVariants).where(and(eq(productVariants.tenantId, tenant.id), eq(productVariants.productId, id)));
  for (const row of current) {
    if (!keep.includes(row.id)) await db.delete(productVariants).where(and(eq(productVariants.id, row.id), eq(productVariants.tenantId, tenant.id)));
  }
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "save-product", entity: "product", entityId: id });
  return { id };
}

export async function removeProduct(slug: string, id: string) {
  const { tenant, user } = await requireStaff(slug, "catalog");
  await db.delete(productVariants).where(and(eq(productVariants.tenantId, tenant.id), eq(productVariants.productId, id)));
  await db.delete(products).where(and(eq(products.tenantId, tenant.id), eq(products.id, id)));
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "delete-product", entity: "product", entityId: id });
}

export async function saveCategory(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "catalog");
  const nameEn = clean(body.nameEn, 120);
  const nameAr = clean(body.nameAr, 120);
  if (!nameEn || !nameAr) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const slugValue = slugify(clean(body.slug, 80) || nameEn) || id.slice(0, 8);
  const values = { tenantId: tenant.id, nameEn, nameAr, slug: slugValue, imageUrl: clean(body.imageUrl, 400), sort: Number(body.sort || 0), active: body.active !== false };
  const existing = await db.select().from(categories).where(and(eq(categories.id, id), eq(categories.tenantId, tenant.id))).limit(1);
  if (existing.length) await db.update(categories).set(values).where(eq(categories.id, id));
  else await db.insert(categories).values({ ...values, id });
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "save-category", entity: "category", entityId: id });
  return { id };
}

export async function removeCategory(slug: string, id: string) {
  const { tenant } = await requireStaff(slug, "catalog");
  await db.update(products).set({ categoryId: null }).where(and(eq(products.tenantId, tenant.id), eq(products.categoryId, id)));
  await db.delete(categories).where(and(eq(categories.tenantId, tenant.id), eq(categories.id, id)));
}

export async function saveCoupon(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "offers");
  const code = clean(body.code, 40).toUpperCase();
  const type = body.type === "fixed" ? "fixed" : "percent";
  const value = Number(body.value);
  if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !Number.isFinite(value) || value <= 0) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const values = {
    tenantId: tenant.id,
    code,
    type,
    value: value.toFixed(3),
    active: body.active !== false,
    minSubtotal: Number(body.minSubtotal || 0).toFixed(3),
    maxUses: body.maxUses === "" || body.maxUses == null ? null : Math.max(0, Math.floor(Number(body.maxUses))),
    startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
    endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
  };
  const clash = await db.select().from(coupons).where(and(eq(coupons.tenantId, tenant.id), eq(coupons.code, code)));
  if (clash.some((row) => row.id !== id)) throw new AppError("DUPLICATE");
  const existing = await db.select().from(coupons).where(and(eq(coupons.id, id), eq(coupons.tenantId, tenant.id))).limit(1);
  if (existing.length) await db.update(coupons).set(values).where(eq(coupons.id, id));
  else await db.insert(coupons).values({ ...values, id, usedCount: 0 });
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "save-coupon", entity: "coupon", entityId: id });
  return { id };
}

export async function removeCoupon(slug: string, id: string) {
  const { tenant } = await requireStaff(slug, "offers");
  await db.delete(coupons).where(and(eq(coupons.tenantId, tenant.id), eq(coupons.id, id)));
}

export async function setStoreDiscount(slug: string, percent: number, active: boolean) {
  const { tenant, user } = await requireStaff(slug, "offers");
  const value = Math.min(100, Math.max(0, Number(percent) || 0));
  await db.update(tenants).set({ storeWideDiscountPercent: value.toFixed(3), storeWideDiscountActive: active && value > 0, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "store-discount", meta: { percent: value, active } });
}

export async function saveStaff(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "staff");
  const email = clean(body.email, 160).toLowerCase();
  const name = clean(body.name, 120);
  const role = STAFF_FEATURES.includes("pos") && ["store_admin", "manager", "cashier", "stock_keeper", "store_owner"].includes(String(body.role)) ? String(body.role) : "cashier";
  if (!isEmail(email) || name.length < 2) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const permissions = defaultStaffPermissions(role);
  if (body.permissions && typeof body.permissions === "object") {
    for (const feature of STAFF_FEATURES) permissions[feature] = Boolean((body.permissions as Record<string, boolean>)[feature]);
  }
  if (role === "store_owner") Object.assign(permissions, defaultStaffPermissions("store_owner"));
  const clash = await db.select().from(users).where(and(eq(users.tenantId, tenant.id), eq(users.email, email)));
  if (clash.some((row) => row.id !== id)) throw new AppError("EMAIL_TAKEN");
  const existing = await db.select().from(users).where(and(eq(users.id, id), eq(users.tenantId, tenant.id))).limit(1);
  const password = clean(body.password, 80);
  if (!existing.length && password.length < 8) throw new AppError("WEAK_PASSWORD");
  if (existing.length) {
    await db.update(users).set({
      email,
      name,
      phone: clean(body.phone, 40),
      role,
      permissions,
      active: body.active !== false,
      ...(password ? { passwordHash: await hashPassword(password), tokenVersion: existing[0].tokenVersion + 1 } : {}),
    }).where(eq(users.id, id));
  } else {
    await db.insert(users).values({
      id,
      tenantId: tenant.id,
      email,
      passwordHash: await hashPassword(password),
      name,
      phone: clean(body.phone, 40),
      role,
      permissions,
      active: true,
      tokenVersion: 1,
    });
  }
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "save-staff", entity: "user", entityId: id });
  return { id };
}

export async function removeStaff(slug: string, id: string) {
  const { tenant, user } = await requireStaff(slug, "staff");
  if (id === user.id) throw new AppError("FORBIDDEN", 403);
  const [target] = await db.select().from(users).where(and(eq(users.id, id), eq(users.tenantId, tenant.id))).limit(1);
  if (!target || target.role === "customer") throw new AppError("NOT_FOUND", 404);
  if (target.role === "store_owner") {
    const owners = await db.select().from(users).where(and(eq(users.tenantId, tenant.id), eq(users.role, "store_owner"), eq(users.active, true)));
    if (owners.length < 2) throw new AppError("FORBIDDEN", 403);
  }
  await db.delete(users).where(and(eq(users.id, id), eq(users.tenantId, tenant.id)));
}

export async function updateOrder(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "orders");
  const id = clean(body.id, 80);
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.tenantId, tenant.id))).limit(1);
  if (!order) throw new AppError("NOT_FOUND", 404);
  const status = ["pending", "processing", "out_for_delivery", "fulfilled", "cancelled"].includes(String(body.status)) ? String(body.status) : order.status;
  if (status === "cancelled" && order.status !== "cancelled") {
    const items = await db.select().from(orderItems).where(and(eq(orderItems.orderId, order.id), eq(orderItems.tenantId, tenant.id)));
    for (const item of items) {
      if (item.productId) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
        if (product?.trackStock) await db.update(products).set({ stock: sql`${products.stock} + ${item.qty}` }).where(and(eq(products.id, item.productId), eq(products.tenantId, tenant.id)));
      }
      if (item.variantId) await db.update(productVariants).set({ stock: sql`${productVariants.stock} + ${item.qty}` }).where(and(eq(productVariants.id, item.variantId), eq(productVariants.tenantId, tenant.id)));
    }
  }
  await db.update(orders).set({
    status,
    trackingNumber: body.trackingNumber == null ? order.trackingNumber : clean(body.trackingNumber, 80),
    carrierName: body.carrierName == null ? order.carrierName : clean(body.carrierName, 80),
    notes: body.notes == null ? order.notes : clean(body.notes, 500),
    updatedAt: new Date(),
  }).where(and(eq(orders.id, id), eq(orders.tenantId, tenant.id)));
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "update-order", entity: "order", entityId: id, meta: { status } });
}

export async function saveTheme(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "design");
  const themeId = clean(body.themeId, 20) || tenant.themeId;
  const [theme] = await db.select().from(themeCatalog).where(eq(themeCatalog.id, themeId)).limit(1);
  if (!theme?.active) throw new AppError("THEME");
  const config = normalizeThemeConfig(themeId, body.themeConfig || tenant.themeConfig);
  await db.update(tenants).set({
    themeId,
    themeConfig: config,
    logoUrl: body.logoUrl == null ? tenant.logoUrl : clean(body.logoUrl, 400),
    faviconUrl: body.faviconUrl == null ? tenant.faviconUrl : clean(body.faviconUrl, 400),
    updatedAt: new Date(),
  }).where(eq(tenants.id, tenant.id));
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "save-theme", meta: { themeId } });
}

export async function saveStoreSettings(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "settings");
  const currency = CURRENCIES.some((item) => item.code === body.currency) ? String(body.currency) : tenant.currency;
  await db.update(tenants).set({
    nameEn: clean(body.nameEn, 160) || tenant.nameEn,
    nameAr: clean(body.nameAr, 160) || tenant.nameAr,
    phone: clean(body.phone, 40),
    email: clean(body.email, 160),
    addressEn: clean(body.addressEn, 240),
    addressAr: clean(body.addressAr, 240),
    aboutEn: clean(body.aboutEn, 2000),
    aboutAr: clean(body.aboutAr, 2000),
    currency,
    vatRate: Math.max(0, Number(body.vatRate ?? num(tenant.vatRate))).toFixed(3),
    vatInclusive: Boolean(body.vatInclusive),
    countryId: clean(body.countryId, 80) || tenant.countryId,
    governorateId: clean(body.governorateId, 80) || tenant.governorateId,
    updatedAt: new Date(),
  }).where(eq(tenants.id, tenant.id));
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "save-settings" });
}

export async function saveGateway(slug: string, body: Record<string, unknown>) {
  const { tenant, user } = await requireStaff(slug, "payments");
  const provider = ["cash", "benefit", "card", "paypal"].includes(String(body.provider)) ? String(body.provider) : "";
  if (!provider) throw new AppError("REQUIRED");
  const [existing] = await db.select().from(paymentGateways).where(and(eq(paymentGateways.tenantId, tenant.id), eq(paymentGateways.provider, provider))).limit(1);
  const apiKey = clean(body.apiKey, 300);
  const secret = clean(body.secret, 300);
  const values = {
    enabled: Boolean(body.enabled),
    merchantId: clean(body.merchantId, 120),
    apiBaseUrl: clean(body.apiBaseUrl, 300),
    sandbox: body.sandbox !== false,
    apiKeyEnc: apiKey ? encryptSecret(apiKey) : existing?.apiKeyEnc || "",
    secretEnc: secret ? encryptSecret(secret) : existing?.secretEnc || "",
    extra: {},
    updatedAt: new Date(),
  };
  if (existing) await db.update(paymentGateways).set(values).where(eq(paymentGateways.id, existing.id));
  else await db.insert(paymentGateways).values({ ...values, id: newId(), tenantId: tenant.id, provider });
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "save-gateway", entity: provider });
}

export async function saveRate(slug: string, body: Record<string, unknown>) {
  const { tenant } = await requireStaff(slug, "settings");
  const id = clean(body.id, 80) || newId();
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0 || !clean(body.countryId, 80)) throw new AppError("REQUIRED");
  const values = {
    tenantId: tenant.id,
    providerId: clean(body.providerId, 80) || null,
    countryId: clean(body.countryId, 80),
    governorateId: clean(body.governorateId, 80) || null,
    areaId: clean(body.areaId, 80) || null,
    price: price.toFixed(3),
    etaEn: clean(body.etaEn, 80),
    etaAr: clean(body.etaAr, 80),
    active: body.active !== false,
  };
  const existing = await db.select().from(shippingRates).where(and(eq(shippingRates.id, id), eq(shippingRates.tenantId, tenant.id))).limit(1);
  if (existing.length) await db.update(shippingRates).set(values).where(eq(shippingRates.id, id));
  else await db.insert(shippingRates).values({ ...values, id });
  return { id };
}

export async function removeRate(slug: string, id: string) {
  const { tenant } = await requireStaff(slug, "settings");
  await db.delete(shippingRates).where(and(eq(shippingRates.id, id), eq(shippingRates.tenantId, tenant.id)));
}

export async function saveTable(slug: string, body: Record<string, unknown>) {
  const { tenant } = await requireStaff(slug, "tables");
  const name = clean(body.name, 40);
  const code = slugify(clean(body.code, 40) || name);
  if (!name || !code) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const clash = await db.select().from(restaurantTables).where(and(eq(restaurantTables.tenantId, tenant.id), eq(restaurantTables.code, code)));
  if (clash.some((row) => row.id !== id)) throw new AppError("DUPLICATE");
  const values = { tenantId: tenant.id, name, code, seats: Math.max(1, Math.floor(Number(body.seats || 4))), zone: clean(body.zone, 40), active: body.active !== false };
  const existing = await db.select().from(restaurantTables).where(and(eq(restaurantTables.id, id), eq(restaurantTables.tenantId, tenant.id))).limit(1);
  if (existing.length) await db.update(restaurantTables).set(values).where(eq(restaurantTables.id, id));
  else await db.insert(restaurantTables).values({ ...values, id });
  return { id, code };
}

export async function removeTable(slug: string, id: string) {
  const { tenant } = await requireStaff(slug, "tables");
  await db.delete(restaurantTables).where(and(eq(restaurantTables.id, id), eq(restaurantTables.tenantId, tenant.id)));
}

export async function addDomain(slug: string, hostRaw: string) {
  const { tenant, user } = await requireStaff(slug, "settings");
  const host = hostRaw.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host)) throw new AppError("DOMAIN");
  if (host.endsWith(".tajer.com") || host.endsWith(".localhost")) throw new AppError("DOMAIN");
  const clash = await db.select().from(tenantDomains).where(eq(tenantDomains.host, host)).limit(1);
  if (clash.length) throw new AppError("DUPLICATE");
  const id = newId();
  await db.insert(tenantDomains).values({ id, tenantId: tenant.id, host, type: "custom", verified: false, isPrimary: false });
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "add-domain", entityId: host });
  return { id };
}

export async function removeDomain(slug: string, id: string) {
  const { tenant } = await requireStaff(slug, "settings");
  const [domain] = await db.select().from(tenantDomains).where(and(eq(tenantDomains.id, id), eq(tenantDomains.tenantId, tenant.id))).limit(1);
  if (!domain || domain.type === "subdomain") throw new AppError("FORBIDDEN", 403);
  await db.delete(tenantDomains).where(eq(tenantDomains.id, id));
}

export async function createFolder(slug: string, name: string, parentId?: string) {
  const { tenant } = await requireStaff(slug, "media");
  const id = newId();
  await db.insert(mediaFolders).values({ id, tenantId: tenant.id, name: clean(name, 80) || "Folder", parentId: parentId || null });
  return { id };
}

export async function removeAsset(slug: string, id: string) {
  const { tenant } = await requireStaff(slug, "media");
  await db.delete(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.tenantId, tenant.id)));
}

export async function recordAsset(tenantId: string, asset: { url: string; filename: string; mime: string; size: number; width: number; height: number; folderId?: string | null }) {
  const id = newId();
  await db.insert(mediaAssets).values({ id, tenantId, folderId: asset.folderId || null, ...asset });
  return { id, url: asset.url };
}

export async function renewalRequest(slug: string, plan: string, note: string) {
  const { tenant, user } = await requireStaff(slug, "settings");
  const settings = await getSettings();
  const chosen = plan === "yearly" ? "yearly" : "monthly";
  const amount = chosen === "yearly" ? num(settings.yearlyPrice) : num(settings.monthlyPrice);
  const id = newId();
  await db.insert(renewalRequests).values({
    id,
    tenantId: tenant.id,
    plan: chosen,
    amount: amount.toFixed(3),
    currency: settings.billingCurrency,
    status: "pending",
    note: clean(note, 500),
  });
  await audit({ tenantId: tenant.id, actorId: user.id, actorKind: "staff", action: "renewal-request", entityId: id });
  return { id, amount, currency: settings.billingCurrency, instructionsEn: settings.instructionsEn, instructionsAr: settings.instructionsAr, bankName: settings.bankName, accountName: settings.accountName, iban: settings.iban };
}

export async function registerStore(body: Record<string, unknown>) {
  await ready();
  const nameEn = clean(body.nameEn, 160);
  const nameAr = clean(body.nameAr, 160);
  const slug = slugify(clean(body.slug, 40));
  const email = clean(body.email, 160).toLowerCase();
  const password = clean(body.password, 80);
  const owner = clean(body.ownerName, 120);
  const countryId = clean(body.countryId, 80);
  const governorateId = clean(body.governorateId, 80);
  const currency = CURRENCIES.some((item) => item.code === body.currency) ? String(body.currency) : "";
  if (!nameEn || !nameAr || !owner || !countryId || !governorateId || !currency) throw new AppError("REQUIRED");
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug) || RESERVED_SLUGS.has(slug)) throw new AppError("SLUG_INVALID");
  if (!isEmail(email)) throw new AppError("REQUIRED");
  if (password.length < 8) throw new AppError("WEAK_PASSWORD");
  const [country] = await db.select().from(countries).where(eq(countries.id, countryId)).limit(1);
  const [gov] = await db.select().from(governorates).where(and(eq(governorates.id, governorateId), eq(governorates.countryId, countryId))).limit(1);
  if (!country || !gov) throw new AppError("GEO");
  const taken = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (taken.length) throw new AppError("SLUG_TAKEN");
  const emailTaken = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (emailTaken.length) throw new AppError("EMAIL_TAKEN");
  const settings = await getSettings();
  const theme = THEMES[0];
  const now = new Date();
  const ends = addDays(now, settings.trialDays || 30);
  const tenantId = newId();
  const userId = newId();
  await db.insert(tenants).values({
    id: tenantId,
    slug,
    nameEn,
    nameAr,
    industry: clean(body.industry, 40) || "boutique",
    countryId,
    governorateId,
    currency,
    vatRate: num(country.vatDefault).toFixed(3),
    vatInclusive: country.vatInclusiveDefault,
    phone: clean(body.phone, 40),
    email,
    themeId: "t01",
    themeConfig: theme.defaults,
    plan: "trial",
    status: "active",
    trialEndsAt: ends,
    subscriptionEndsAt: ends,
    orderSeq: 0,
  });
  await db.insert(users).values({
    id: userId,
    tenantId,
    email,
    passwordHash: await hashPassword(password),
    name: owner,
    phone: clean(body.phone, 40),
    role: "store_owner",
    permissions: defaultStaffPermissions("store_owner"),
    active: true,
    tokenVersion: 1,
  });
  await db.insert(tenantDomains).values([
    { id: newId(), tenantId, host: `${slug}.tajer.com`, type: "subdomain", verified: true, isPrimary: true },
    { id: newId(), tenantId, host: `${slug}.localhost`, type: "subdomain", verified: true, isPrimary: false },
  ]);
  await db.insert(paymentGateways).values({ id: newId(), tenantId, provider: "cash", enabled: true, merchantId: "", apiKeyEnc: "", secretEnc: "", apiBaseUrl: "", sandbox: true, extra: {} });
  for (const provider of ["benefit", "card", "paypal"]) {
    await db.insert(paymentGateways).values({ id: newId(), tenantId, provider, enabled: false, merchantId: "", apiKeyEnc: "", secretEnc: "", apiBaseUrl: "", sandbox: true, extra: {} });
  }
  await db.insert(subscriptionEvents).values({ id: newId(), tenantId, type: "trial_started", note: "30-day trial opened at registration.", newEndsAt: ends, actorId: userId });
  return { slug, userId, email, role: "store_owner", tenantId };
}

export async function loginStaff(emailRaw: string, password: string, slug?: string) {
  await ready();
  const email = emailRaw.trim().toLowerCase();
  const rows = await db.select().from(users).where(eq(users.email, email));
  const staff = rows.filter((row) => row.role !== "customer" && row.active);
  const scoped = slug ? staff.filter((row) => row.tenantId) : staff;
  let matches = staff;
  if (slug) {
    const tenant = await tenantBySlug(slugify(slug));
    matches = staff.filter((row) => tenant && row.tenantId === tenant.id);
  }
  if (matches.length > 1) throw new AppError("REQUIRED");
  const user = matches[0];
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw new AppError("INVALID_CREDENTIALS", 401);
  const tenant = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
  void scoped;
  return { user, tenant: tenant[0] };
}

export async function loginPlatform(emailRaw: string, password: string) {
  await ready();
  const email = emailRaw.trim().toLowerCase();
  const [user] = await db.select().from(platformUsers).where(eq(platformUsers.email, email)).limit(1);
  if (!user?.active || !(await verifyPassword(password, user.passwordHash))) throw new AppError("INVALID_CREDENTIALS", 401);
  return user;
}

export async function loginCustomer(slug: string, emailRaw: string, password: string) {
  const tenant = await tenantBySlug(slug);
  if (!tenant) throw new AppError("NOT_FOUND", 404);
  const email = emailRaw.trim().toLowerCase();
  const [user] = await db.select().from(users).where(and(eq(users.tenantId, tenant.id), eq(users.email, email), eq(users.role, "customer"))).limit(1);
  if (!user?.active || !(await verifyPassword(password, user.passwordHash))) throw new AppError("INVALID_CREDENTIALS", 401);
  return { user, tenant };
}

export async function registerCustomer(slug: string, body: Record<string, unknown>) {
  const tenant = await tenantBySlug(slug);
  if (!tenant) throw new AppError("NOT_FOUND", 404);
  const email = clean(body.email, 160).toLowerCase();
  const name = clean(body.name, 120);
  const password = clean(body.password, 80);
  if (!isEmail(email) || name.length < 2) throw new AppError("REQUIRED");
  if (password.length < 8) throw new AppError("WEAK_PASSWORD");
  const clash = await db.select().from(users).where(and(eq(users.tenantId, tenant.id), eq(users.email, email))).limit(1);
  if (clash.length) throw new AppError("EMAIL_TAKEN");
  const id = newId();
  await db.insert(users).values({
    id,
    tenantId: tenant.id,
    email,
    passwordHash: await hashPassword(password),
    name,
    phone: clean(body.phone, 40),
    role: "customer",
    permissions: {},
    active: true,
    tokenVersion: 1,
  });
  await db.update(orders).set({ customerId: id }).where(and(eq(orders.tenantId, tenant.id), eq(orders.email, email)));
  return { id, tenant };
}

export async function customerOrders(slug: string) {
  const session = await readSession();
  const tenant = await tenantBySlug(slug);
  if (!tenant || !session || session.kind !== "customer" || session.tenantId !== tenant.id) return [];
  const rows = await db.select().from(orders).where(and(eq(orders.tenantId, tenant.id), eq(orders.customerId, session.sub))).orderBy(desc(orders.createdAt));
  return rows.map(serializeOrder);
}

export async function platformOverview() {
  const actor = await requirePlatform("overview");
  const storeRows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  const orderRows = await db.select().from(orders);
  const renewals = await db.select().from(renewalRequests).orderBy(desc(renewalRequests.createdAt));
  const settings = await getSettings();
  const paid = orderRows.filter((row) => row.paymentStatus === "paid" && row.status !== "cancelled");
  return {
    actor: { id: actor.id, name: actor.name, email: actor.email, role: actor.role, permissions: actor.role === "platform_owner" ? Object.fromEntries(PLATFORM_FEATURES.map((item) => [item, true])) : actor.permissions },
    settings: {
      ...settings,
      monthlyPrice: num(settings.monthlyPrice),
      yearlyPrice: num(settings.yearlyPrice),
      commissionPercent: num(settings.commissionPercent),
    },
    metrics: {
      stores: storeRows.length,
      active: storeRows.filter((row) => subscriptionActive(row.status, row.subscriptionEndsAt)).length,
      trials: storeRows.filter((row) => row.plan === "trial" && subscriptionActive(row.status, row.subscriptionEndsAt)).length,
      expired: storeRows.filter((row) => !subscriptionActive(row.status, row.subscriptionEndsAt)).length,
      gmv: paid.reduce((sum, row) => sum + num(row.total), 0),
      commission: paid.reduce((sum, row) => sum + num(row.commissionAmount), 0),
      subscriptionRevenue: renewals.filter((row) => row.status === "approved").reduce((sum, row) => sum + num(row.amount), 0),
    },
    stores: storeRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      currency: row.currency,
      plan: row.plan,
      status: row.status,
      themeId: row.themeId,
      featured: row.featured,
      subscriptionEndsAt: row.subscriptionEndsAt.toISOString(),
      active: subscriptionActive(row.status, row.subscriptionEndsAt),
      createdAt: row.createdAt.toISOString(),
    })),
    renewals: renewals.map((row) => ({ ...row, amount: num(row.amount), createdAt: row.createdAt.toISOString(), resolvedAt: row.resolvedAt?.toISOString() || null })),
  };
}

export async function platformBundle() {
  const overview = await platformOverview();
  const [geo, themes, providers, admins, carriers, domains] = await Promise.all([
    getGeo(),
    db.select().from(themeCatalog).orderBy(asc(themeCatalog.sort)),
    db.select().from(shippingProviders).orderBy(asc(shippingProviders.nameEn)),
    db.select().from(platformUsers).orderBy(asc(platformUsers.createdAt)),
    db.select().from(tenantCarriers),
    db.select().from(tenantDomains),
  ]);
  return {
    ...overview,
    geo,
    themes,
    providers,
    admins: admins.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role, permissions: row.permissions, active: row.active })),
    carriers,
    domains,
    features: PLATFORM_FEATURES,
  };
}

export async function savePlatformAdmin(actorId: string, body: Record<string, unknown>) {
  await requirePlatform("admins");
  const email = clean(body.email, 160).toLowerCase();
  const name = clean(body.name, 120);
  if (!isEmail(email) || name.length < 2) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const permissions: Record<string, boolean> = {};
  for (const feature of PLATFORM_FEATURES) permissions[feature] = Boolean((body.permissions as Record<string, boolean> | undefined)?.[feature]);
  const role = body.role === "platform_owner" ? "platform_owner" : "platform_manager";
  const existing = await db.select().from(platformUsers).where(eq(platformUsers.id, id)).limit(1);
  const password = clean(body.password, 80);
  if (!existing.length && password.length < 8) throw new AppError("WEAK_PASSWORD");
  const clash = await db.select().from(platformUsers).where(eq(platformUsers.email, email));
  if (clash.some((row) => row.id !== id)) throw new AppError("EMAIL_TAKEN");
  if (existing.length) {
    await db.update(platformUsers).set({
      email,
      name,
      role,
      permissions,
      active: body.active !== false,
      ...(password ? { passwordHash: await hashPassword(password), tokenVersion: existing[0].tokenVersion + 1 } : {}),
    }).where(eq(platformUsers.id, id));
  } else {
    await db.insert(platformUsers).values({ id, email, name, role, permissions, passwordHash: await hashPassword(password), active: true, tokenVersion: 1 });
  }
  await audit({ actorId, actorKind: "platform", action: "save-admin", entityId: id });
  return { id };
}

export async function saveCountry(body: Record<string, unknown>) {
  await requirePlatform("geo");
  const nameEn = clean(body.nameEn, 80);
  const nameAr = clean(body.nameAr, 80);
  const code = clean(body.code, 8).toUpperCase();
  if (!nameEn || !nameAr || !/^[A-Z]{2,3}$/.test(code)) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || `c-${code.toLowerCase()}-${newId().slice(0, 4)}`;
  const values = { code, nameEn, nameAr, vatDefault: Number(body.vatDefault || 0).toFixed(3), vatInclusiveDefault: body.vatInclusiveDefault !== false, active: body.active !== false, sort: Number(body.sort || 0) };
  const existing = await db.select().from(countries).where(eq(countries.id, id)).limit(1);
  if (existing.length) await db.update(countries).set(values).where(eq(countries.id, id));
  else await db.insert(countries).values({ ...values, id });
  return { id };
}

export async function removeCountry(id: string) {
  await requirePlatform("geo");
  const used = await db.select().from(tenants).where(eq(tenants.countryId, id)).limit(1);
  if (used.length) throw new AppError("FORBIDDEN", 409);
  const govs = await db.select().from(governorates).where(eq(governorates.countryId, id));
  for (const gov of govs) await db.delete(areas).where(eq(areas.governorateId, gov.id));
  await db.delete(governorates).where(eq(governorates.countryId, id));
  await db.delete(countries).where(eq(countries.id, id));
}

export async function saveGovernorate(body: Record<string, unknown>) {
  await requirePlatform("geo");
  const countryId = clean(body.countryId, 80);
  const nameEn = clean(body.nameEn, 80);
  const nameAr = clean(body.nameAr, 80);
  if (!countryId || !nameEn || !nameAr) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const values = { countryId, nameEn, nameAr, active: body.active !== false, sort: Number(body.sort || 0) };
  const existing = await db.select().from(governorates).where(eq(governorates.id, id)).limit(1);
  if (existing.length) await db.update(governorates).set(values).where(eq(governorates.id, id));
  else await db.insert(governorates).values({ ...values, id });
  return { id };
}

export async function removeGovernorate(id: string) {
  await requirePlatform("geo");
  const used = await db.select().from(tenants).where(eq(tenants.governorateId, id)).limit(1);
  if (used.length) throw new AppError("FORBIDDEN", 409);
  await db.delete(areas).where(eq(areas.governorateId, id));
  await db.delete(governorates).where(eq(governorates.id, id));
}

export async function saveArea(body: Record<string, unknown>) {
  await requirePlatform("geo");
  const governorateId = clean(body.governorateId, 80);
  const nameEn = clean(body.nameEn, 80);
  const nameAr = clean(body.nameAr, 80);
  if (!governorateId || !nameEn || !nameAr) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || newId();
  const values = { governorateId, nameEn, nameAr, active: body.active !== false, sort: Number(body.sort || 0) };
  const existing = await db.select().from(areas).where(eq(areas.id, id)).limit(1);
  if (existing.length) await db.update(areas).set(values).where(eq(areas.id, id));
  else await db.insert(areas).values({ ...values, id });
  return { id };
}

export async function removeArea(id: string) {
  await requirePlatform("geo");
  await db.delete(areas).where(eq(areas.id, id));
}

export async function updatePlatformStore(actorId: string, body: Record<string, unknown>) {
  await requirePlatform("stores");
  const id = clean(body.id, 80);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) throw new AppError("NOT_FOUND", 404);
  const ends = body.subscriptionEndsAt ? new Date(String(body.subscriptionEndsAt)) : tenant.subscriptionEndsAt;
  if (Number.isNaN(ends.getTime())) throw new AppError("REQUIRED");
  const plan = ["trial", "monthly", "yearly", "custom"].includes(String(body.plan)) ? String(body.plan) : tenant.plan;
  const status = ["active", "suspended"].includes(String(body.status)) ? String(body.status) : tenant.status;
  const currency = CURRENCIES.some((item) => item.code === body.currency) ? String(body.currency) : tenant.currency;
  const themeId = clean(body.themeId, 20) || tenant.themeId;
  await db.update(tenants).set({
    plan,
    status,
    currency,
    themeId,
    featured: Boolean(body.featured),
    subscriptionEndsAt: ends,
    updatedAt: new Date(),
  }).where(eq(tenants.id, id));
  if (ends.getTime() !== tenant.subscriptionEndsAt.getTime() || plan !== tenant.plan || status !== tenant.status) {
    await db.insert(subscriptionEvents).values({
      id: newId(),
      tenantId: id,
      type: "admin_override",
      note: clean(body.note, 300),
      previousEndsAt: tenant.subscriptionEndsAt,
      newEndsAt: ends,
      actorId,
    });
  }
  if (body.verifyDomainId) {
    await db.update(tenantDomains).set({ verified: true }).where(and(eq(tenantDomains.id, clean(body.verifyDomainId, 80)), eq(tenantDomains.tenantId, id)));
  }
  await audit({ tenantId: id, actorId, actorKind: "platform", action: "update-store" });
}

export async function savePricing(body: Record<string, unknown>) {
  await requirePlatform("pricing");
  await db.update(platformSettings).set({
    monthlyPrice: Math.max(0, Number(body.monthlyPrice || 0)).toFixed(3),
    yearlyPrice: Math.max(0, Number(body.yearlyPrice || 0)).toFixed(3),
    billingCurrency: CURRENCIES.some((item) => item.code === body.billingCurrency) ? String(body.billingCurrency) : "USD",
    commissionPercent: Math.max(0, Number(body.commissionPercent || 0)).toFixed(3),
    trialDays: Math.max(1, Math.floor(Number(body.trialDays || 30))),
    bankName: clean(body.bankName, 120),
    accountName: clean(body.accountName, 120),
    iban: clean(body.iban, 60),
    instructionsEn: clean(body.instructionsEn, 800),
    instructionsAr: clean(body.instructionsAr, 800),
    supportEmail: clean(body.supportEmail, 160),
    updatedAt: new Date(),
  }).where(eq(platformSettings.id, "default"));
}

export async function saveProvider(body: Record<string, unknown>) {
  await requirePlatform("logistics");
  const code = slugify(clean(body.code, 40));
  const nameEn = clean(body.nameEn, 80);
  const nameAr = clean(body.nameAr, 80);
  if (!code || !nameEn || !nameAr) throw new AppError("REQUIRED");
  const id = clean(body.id, 80) || `ship-${code}`;
  const values = {
    code,
    nameEn,
    nameAr,
    descriptionEn: clean(body.descriptionEn, 400),
    descriptionAr: clean(body.descriptionAr, 400),
    outboundUrl: clean(body.outboundUrl, 300),
    webhookSecret: clean(body.webhookSecret, 120),
    active: body.active !== false,
    configSchema: {
      fields: ["accountNumber", "apiKey", "pickupBranch"],
      webhook: `/api/webhooks/logistics/${code}`,
      events: ["picked_up", "in_transit", "delivered", "cancelled"],
    },
  };
  const existing = await db.select().from(shippingProviders).where(eq(shippingProviders.id, id)).limit(1);
  if (existing.length) await db.update(shippingProviders).set(values).where(eq(shippingProviders.id, id));
  else await db.insert(shippingProviders).values({ ...values, id });
  return { id, webhook: `/api/webhooks/logistics/${code}` };
}

export async function removeProvider(id: string) {
  await requirePlatform("logistics");
  await db.delete(tenantCarriers).where(eq(tenantCarriers.providerId, id));
  await db.delete(shippingProviders).where(eq(shippingProviders.id, id));
}

export async function toggleCarrier(tenantId: string, providerId: string, enabled: boolean) {
  await requirePlatform("logistics");
  const [existing] = await db.select().from(tenantCarriers).where(and(eq(tenantCarriers.tenantId, tenantId), eq(tenantCarriers.providerId, providerId))).limit(1);
  if (existing) await db.update(tenantCarriers).set({ enabled, updatedAt: new Date() }).where(eq(tenantCarriers.id, existing.id));
  else await db.insert(tenantCarriers).values({ id: newId(), tenantId, providerId, enabled, credentialsEnc: "", notes: "" });
}

export async function resolveRenewal(actorId: string, id: string, approve: boolean) {
  await requirePlatform("finance");
  const [request] = await db.select().from(renewalRequests).where(eq(renewalRequests.id, id)).limit(1);
  if (!request || request.status !== "pending") throw new AppError("NOT_FOUND", 404);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, request.tenantId)).limit(1);
  if (!tenant) throw new AppError("NOT_FOUND", 404);
  const now = new Date();
  if (!approve) {
    await db.update(renewalRequests).set({ status: "rejected", resolvedAt: now, resolvedBy: actorId }).where(eq(renewalRequests.id, id));
    return;
  }
  const base = tenant.subscriptionEndsAt.getTime() > now.getTime() ? tenant.subscriptionEndsAt : now;
  const next = addDays(base, request.plan === "yearly" ? 365 : 30);
  await db.update(tenants).set({ plan: request.plan, status: "active", subscriptionEndsAt: next, updatedAt: now }).where(eq(tenants.id, tenant.id));
  await db.update(renewalRequests).set({ status: "approved", resolvedAt: now, resolvedBy: actorId }).where(eq(renewalRequests.id, id));
  await db.insert(subscriptionEvents).values({ id: newId(), tenantId: tenant.id, type: "renewal_approved", note: request.plan, previousEndsAt: tenant.subscriptionEndsAt, newEndsAt: next, actorId });
}

export async function setThemeActive(id: string, active: boolean) {
  await requirePlatform("themes");
  await db.update(themeCatalog).set({ active }).where(eq(themeCatalog.id, id));
}

export async function lookupBarcode(slug: string, code: string) {
  const { tenant } = await requireStaff(slug, "pos");
  const barcode = clean(code, 80);
  const [variant] = await db.select().from(productVariants).where(and(eq(productVariants.tenantId, tenant.id), eq(productVariants.barcode, barcode), eq(productVariants.active, true))).limit(1);
  if (variant) return { productId: variant.productId, variantId: variant.id };
  const [product] = await db.select().from(products).where(and(eq(products.tenantId, tenant.id), eq(products.barcode, barcode), eq(products.active, true))).limit(1);
  if (!product) throw new AppError("NOT_FOUND", 404);
  return { productId: product.id, variantId: null };
}

export async function applyLogisticsWebhook(code: string, rawBody: string, signature: string | null, payload: Record<string, unknown>) {
  await ready();
  const [provider] = await db.select().from(shippingProviders).where(eq(shippingProviders.code, code)).limit(1);
  if (!provider) throw new AppError("NOT_FOUND", 404);
  if (provider.webhookSecret) {
    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = createHmac("sha256", provider.webhookSecret).update(rawBody).digest("hex");
    const given = signature || "";
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError("FORBIDDEN", 401);
  }
  const orderNumber = clean(payload.orderNumber, 40);
  const tenantSlug = clean(payload.tenantSlug || payload.tenant, 40);
  const tenant = tenantSlug ? await tenantBySlug(tenantSlug) : null;
  const filters = [eq(orders.number, orderNumber)];
  if (tenant) filters.push(eq(orders.tenantId, tenant.id));
  const [order] = await db.select().from(orders).where(and(...filters)).limit(1);
  if (!order) throw new AppError("NOT_FOUND", 404);
  const incoming = clean(payload.status, 40);
  const status = incoming === "delivered" ? "fulfilled" : incoming === "picked_up" || incoming === "in_transit" ? "out_for_delivery" : incoming === "cancelled" ? "cancelled" : incoming === "processing" ? "processing" : order.status;
  await db.update(orders).set({
    status,
    trackingNumber: clean(payload.trackingNumber, 80) || order.trackingNumber,
    carrierName: provider.nameEn,
    carrierId: provider.id,
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));
  return { ok: true, status };
}


