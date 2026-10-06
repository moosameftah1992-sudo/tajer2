import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurantTables } from "@/db/schema";
import { tenantBySlug } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function TableEntry({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params;
  const tenant = await tenantBySlug(slug);
  if (!tenant) notFound();
  const [table] = await db.select().from(restaurantTables).where(and(eq(restaurantTables.tenantId, tenant.id), eq(restaurantTables.code, code), eq(restaurantTables.active, true))).limit(1);
  if (!table) notFound();
  const h = await headers();
  const vanity = h.get("x-tajer-vanity") === "1";
  redirect(`${vanity ? "" : `/s/${slug}`}?table=${encodeURIComponent(table.name)}&tableCode=${encodeURIComponent(table.code)}`);
}
