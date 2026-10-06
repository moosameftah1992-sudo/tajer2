import { LoginScreen } from "@/components/login-screen";
import { getLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  return <LoginScreen locale={await getLocale()} />;
}
