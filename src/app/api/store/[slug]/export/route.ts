import { addDays } from "@/lib/commerce";
import { buildPdf, buildWorkbook, type ReportPayload } from "@/lib/reports";
import { report, requireStaff } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const { tenant } = await requireStaff(slug, "reports");
  const url = new URL(request.url);
  const from = new Date(url.searchParams.get("from") || addDays(new Date(), -30).toISOString());
  const to = new Date(url.searchParams.get("to") || new Date().toISOString());
  to.setHours(23, 59, 59, 999);
  const data = await report(tenant.id, from, to);
  const payload: ReportPayload = {
    storeEn: tenant.nameEn,
    storeAr: tenant.nameAr,
    currency: tenant.currency,
    from: from.toISOString(),
    to: to.toISOString(),
    orders: data.orders.map((order) => ({
      number: order.number,
      createdAt: order.createdAt,
      status: order.status,
      channel: order.channel,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      total: order.total,
      discountTotal: order.discountTotal,
      shippingTotal: order.shippingTotal,
      vatTotal: order.vatTotal,
      currency: order.currency,
    })),
    totals: {
      orders: data.totals.orders,
      revenue: data.totals.revenue,
      discount: data.totals.discount,
      vat: data.totals.vat,
      shipping: data.totals.shipping,
    },
    top: data.top,
  };
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  if (format === "pdf") {
    const file = await buildPdf(payload);
    return new Response(file, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${slug}-sales.pdf"`,
      },
    });
  }
  const file = await buildWorkbook(payload);
  return new Response(file, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${slug}-sales.xlsx"`,
    },
  });
}
