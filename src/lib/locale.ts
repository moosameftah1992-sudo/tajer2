import { cookies } from "next/headers";
import { pickLocale, type Locale } from "@/lib/commerce";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return pickLocale(jar.get("tajer_locale")?.value);
}
