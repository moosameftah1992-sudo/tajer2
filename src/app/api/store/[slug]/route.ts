import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/auth";
import { addDays } from "@/lib/commerce";
import { asError } from "@/lib/errors";
import {
  addDomain,
  checkout,
  createFolder,
  customerOrders,
  dashboard,
  lookupBarcode,
  posPayload,
  posSale,
  quote,
  removeAsset,
  removeCategory,
  removeCoupon,
  removeDomain,
  removeProduct,
  removeRate,
  removeStaff,
  removeTable,
  renewalRequest,
  report,
  requireStaff,
  saveCategory,
  saveCoupon,
  saveGateway,
  saveProduct,
  saveRate,
  saveStaff,
  saveStoreSettings,
  saveTable,
  saveTheme,
  setStoreDiscount,
  tenantBySlug,
  updateOrder,
} from "@/lib/service";

export const dynamic = "force-dynamic";

function fail(error: unknown) {
  const known = asError(error);
  if (known) return NextResponse.json({ ok: false, code: known.code, error: known.code }, { status: known.status });
  console.error(error);
  return NextResponse.json({ ok: false, code: "SERVER", error: "SERVER" }, { status: 500 });
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource") || "dashboard";
    if (resource === "dashboard") return NextResponse.json({ ok: true, data: await dashboard(slug) });
    if (resource === "pos") return NextResponse.json({ ok: true, data: await posPayload(slug) });
    if (resource === "orders") {
      const { tenant } = await requireStaff(slug, "orders");
      const { orderBoard } = await import("@/lib/service");
      return NextResponse.json({ ok: true, orders: await orderBoard(tenant.id, 180) });
    }
    if (resource === "reports") {
      const { tenant } = await requireStaff(slug, "reports");
      const from = new Date(url.searchParams.get("from") || addDays(new Date(), -30).toISOString());
      const to = new Date(url.searchParams.get("to") || new Date().toISOString());
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return NextResponse.json({ ok: false, code: "REQUIRED" }, { status: 400 });
      to.setHours(23, 59, 59, 999);
      return NextResponse.json({ ok: true, report: await report(tenant.id, from, to) });
    }
    if (resource === "account") return NextResponse.json({ ok: true, orders: await customerOrders(slug) });
    if (resource === "barcode") {
      const found = await lookupBarcode(slug, url.searchParams.get("code") || "");
      return NextResponse.json({ ok: true, ...found });
    }
    if (resource === "qr") {
      await requireStaff(slug, "tables");
      const QRCode = (await import("qrcode")).default;
      const code = url.searchParams.get("code") || "";
      const link = `${url.origin}/s/${slug}/table/${code}`;
      const dataUrl = await QRCode.toDataURL(link, { width: 512, margin: 1 });
      return NextResponse.json({ ok: true, dataUrl, link });
    }
    const tenant = await tenantBySlug(slug);
    if (!tenant) return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, slug: tenant.slug });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "quote") return NextResponse.json({ ok: true, ...(await quote(slug, body)) });
    if (action === "checkout") return NextResponse.json({ ok: true, ...(await checkout(slug, body)) });
    if (action === "pos-sale") return NextResponse.json({ ok: true, ...(await posSale(slug, "", body)) });
    if (action === "save-product") return NextResponse.json({ ok: true, ...(await saveProduct(slug, body)) });
    if (action === "delete-product") {
      await removeProduct(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "save-category") return NextResponse.json({ ok: true, ...(await saveCategory(slug, body)) });
    if (action === "delete-category") {
      await removeCategory(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "save-coupon") return NextResponse.json({ ok: true, ...(await saveCoupon(slug, body)) });
    if (action === "delete-coupon") {
      await removeCoupon(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "store-discount") {
      await setStoreDiscount(slug, Number(body.percent || 0), Boolean(body.active));
      return NextResponse.json({ ok: true });
    }
    if (action === "save-staff") return NextResponse.json({ ok: true, ...(await saveStaff(slug, body)) });
    if (action === "delete-staff") {
      await removeStaff(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "update-order") {
      await updateOrder(slug, body);
      return NextResponse.json({ ok: true });
    }
    if (action === "save-theme") {
      await saveTheme(slug, body);
      return NextResponse.json({ ok: true });
    }
    if (action === "save-settings") {
      await saveStoreSettings(slug, body);
      return NextResponse.json({ ok: true });
    }
    if (action === "save-gateway") {
      await saveGateway(slug, body);
      return NextResponse.json({ ok: true });
    }
    if (action === "save-rate") return NextResponse.json({ ok: true, ...(await saveRate(slug, body)) });
    if (action === "delete-rate") {
      await removeRate(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "save-table") return NextResponse.json({ ok: true, ...(await saveTable(slug, body)) });
    if (action === "delete-table") {
      await removeTable(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "add-domain") return NextResponse.json({ ok: true, ...(await addDomain(slug, String(body.host || ""))) });
    if (action === "delete-domain") {
      await removeDomain(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "create-folder") return NextResponse.json({ ok: true, ...(await createFolder(slug, String(body.name || ""), body.parentId ? String(body.parentId) : undefined)) });
    if (action === "delete-asset") {
      await removeAsset(slug, String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "renewal") return NextResponse.json({ ok: true, ...(await renewalRequest(slug, String(body.plan || "monthly"), String(body.note || ""))) });
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}
