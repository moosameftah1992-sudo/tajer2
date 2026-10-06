import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLocale } from "@/lib/locale";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tajer | تاجر",
  description: "Multi-tenant commerce, POS, and subscriptions for GCC merchants.",
  icons: { icon: "/brand/mark.svg" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>{children}</body>
    </html>
  );
}
