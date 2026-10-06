import { redirect } from "next/navigation";
import { MerchantConsole } from "@/components/manage/console";
import { AppError } from "@/lib/errors";
import { getLocale } from "@/lib/locale";
import { dashboard } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function ManageHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const data = await dashboard(slug);
    return <MerchantConsole initial={data} section="overview" locale={await getLocale()} />;
  } catch (error) {
    if (error instanceof AppError && error.code === "EXPIRED") redirect(`/s/${slug}/renew`);
    redirect(`/login?next=/s/${slug}/manage`);
  }
}
