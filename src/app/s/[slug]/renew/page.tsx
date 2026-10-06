import { redirect } from "next/navigation";
import { RenewPanel } from "@/components/renew-panel";
import { readSession } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { tenantBySlug } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function RenewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await readSession();
  const tenant = await tenantBySlug(slug);
  if (!session || session.kind !== "staff" || !tenant || session.tenantId !== tenant.id) redirect(`/login?next=/s/${slug}/renew`);
  return <RenewPanel slug={slug} locale={await getLocale()} />;
}
