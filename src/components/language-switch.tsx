"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/commerce";

export function LanguageSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  function choose(next: Locale) {
    document.cookie = `tajer_locale=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button type="button" className={locale === "en" ? "on" : ""} onClick={() => choose("en")}>
        EN
      </button>
      <button type="button" className={locale === "ar" ? "on" : ""} onClick={() => choose("ar")}>
        ع
      </button>
    </div>
  );
}
