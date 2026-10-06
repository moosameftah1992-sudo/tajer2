import { redirect } from "next/navigation";
import { PosTerminal } from "@/components/pos/terminal";
import { AppError } from "@/lib/errors";
import { getLocale } from "@/lib/locale";
import { posPayload } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function PosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const data = await posPayload(slug);
    return <PosTerminal initial={data} locale={await getLocale()} />;
  } catch (error) {
    if (error instanceof AppError && error.code === "EXPIRED") redirect(`/s/${slug}/renew`);
    redirect(`/login?next=/s/${slug}/pos`);
  }
}
