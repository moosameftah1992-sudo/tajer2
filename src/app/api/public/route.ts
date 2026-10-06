import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, themeCatalog } from "@/db/schema";
import { asError } from "@/lib/errors";
import { getGeo, getSettings, publicTenant } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [geo, settings, themes, featured] = await Promise.all([
      getGeo(),
      getSettings(),
      db.select().from(themeCatalog).orderBy(themeCatalog.sort),
      db.select().from(tenants).where(eq(tenants.featured, true)).orderBy(desc(tenants.createdAt)),
    ]);
    return NextResponse.json({
      ok: true,
      geo,
      pricing: {
        monthlyPrice: Number(settings.monthlyPrice),
        yearlyPrice: Number(settings.yearlyPrice),
        billingCurrency: settings.billingCurrency,
        trialDays: settings.trialDays,
        commissionPercent: Number(settings.commissionPercent),
      },
      themes,
      featured: featured.map(publicTenant),
    });
  } catch (error) {
    const known = asError(error);
    console.error(error);
    return NextResponse.json({ ok: false, code: known?.code || "SERVER" }, { status: known?.status || 500 });
  }
}
