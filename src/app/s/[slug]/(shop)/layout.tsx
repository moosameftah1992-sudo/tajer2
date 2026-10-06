import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { subscriptionActive } from "@/lib/commerce";
import { tenantBySlug } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await tenantBySlug(slug);
  if (!tenant) notFound();
  if (!subscriptionActive(tenant.status, tenant.subscriptionEndsAt)) {
    const h = await headers();
    const vanity = h.get("x-tajer-vanity") === "1";
    redirect(vanity ? "/maintenance" : `/s/${slug}/maintenance`);
  }
  return children;
}
