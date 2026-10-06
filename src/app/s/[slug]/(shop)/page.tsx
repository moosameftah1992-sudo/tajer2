import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StoreView } from "@/components/storefront/view";
import { TableBinder } from "@/components/storefront/table-binder";
import { getLocale } from "@/lib/locale";
import { getGeo, publicStore } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ previewTheme?: string; category?: string; q?: string; table?: string; tableCode?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const store = await publicStore(slug);
  if (!store) notFound();
  const h = await headers();
  const base = h.get("x-tajer-vanity") === "1" ? "" : `/s/${slug}`;
  const geo = await getGeo();
  return (
    <>
    <TableBinder code={query.tableCode} />
    <StoreView
      locale={await getLocale()}
      store={store}
      base={base}
      geo={geo}
      previewTheme={query.previewTheme}
      category={query.category}
      q={query.q}
      tableName={query.table}
    />
    </>
  );
}
