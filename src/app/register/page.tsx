import { RegisterWizard } from "@/components/register-wizard";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  return <RegisterWizard locale={await getLocale()} />;
}
