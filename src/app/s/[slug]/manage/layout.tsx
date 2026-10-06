import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { readSession } from "@/lib/auth";
import { subscriptionActive } from "@/lib/commerce";
import { tenantBySlug } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function ManageLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await readSession();
  if (!session || session.kind !== "staff") redirect(`/login?next=/s/${slug}/manage`);
  const tenant = await tenantBySlug(slug);
  if (!tenant || session.tenantId !== tenant.id) redirect("/login");
  if (!subscriptionActive(tenant.status, tenant.subscriptionEndsAt)) redirect(`/s/${slug}/renew`);
  return children;
}
