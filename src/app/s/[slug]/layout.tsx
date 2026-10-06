import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart-provider";
import { tenantBySlug } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await tenantBySlug(slug);
  if (!tenant) notFound();
  return <CartProvider slug={slug}>{children}</CartProvider>;
}
