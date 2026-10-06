import { redirect } from "next/navigation";
import { PlatformConsole } from "@/components/platform/console";
import { getLocale } from "@/lib/locale";
import { platformBundle } from "@/lib/service";

export const dynamic = "force-dynamic";

export default async function PlatformHome() {
  try {
    const data = await platformBundle();
    return <PlatformConsole initial={data} section="overview" locale={await getLocale()} />;
  } catch {
    redirect("/platform/login");
  }
}
