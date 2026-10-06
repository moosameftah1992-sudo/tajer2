export const CURRENCIES = [
  { code: "BHD", decimals: 3, nameEn: "Bahraini Dinar", nameAr: "دينار بحريني" },
  { code: "SAR", decimals: 2, nameEn: "Saudi Riyal", nameAr: "ريال سعودي" },
  { code: "KWD", decimals: 3, nameEn: "Kuwaiti Dinar", nameAr: "دينار كويتي" },
  { code: "AED", decimals: 2, nameEn: "UAE Dirham", nameAr: "درهم إماراتي" },
  { code: "QAR", decimals: 2, nameEn: "Qatari Riyal", nameAr: "ريال قطري" },
  { code: "OMR", decimals: 3, nameEn: "Omani Rial", nameAr: "ريال عماني" },
  { code: "USD", decimals: 2, nameEn: "US Dollar", nameAr: "دولار أمريكي" },
  { code: "EUR", decimals: 2, nameEn: "Euro", nameAr: "يورو" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

export const STAFF_FEATURES = [
  "overview",
  "reports",
  "offers",
  "design",
  "media",
  "catalog",
  "staff",
  "orders",
  "customers",
  "settings",
  "pos",
  "tables",
  "payments",
] as const;

export type StaffFeature = (typeof STAFF_FEATURES)[number];

export const PLATFORM_FEATURES = [
  "overview",
  "stores",
  "geo",
  "logistics",
  "pricing",
  "themes",
  "admins",
  "finance",
] as const;

export type PlatformFeature = (typeof PLATFORM_FEATURES)[number];

export const STAFF_ROLES = ["store_owner", "store_admin", "manager", "cashier", "stock_keeper"] as const;
export const ORDER_STATUSES = ["pending", "processing", "out_for_delivery", "fulfilled", "cancelled"] as const;
export const PAYMENT_METHODS = ["cash", "benefit", "card", "paypal"] as const;

export const RESERVED_SLUGS = new Set([
  "www",
  "admin",
  "platform",
  "api",
  "app",
  "static",
  "mail",
  "s",
  "login",
  "register",
  "assets",
  "uploads",
  "health",
  "tajer",
]);

export function currencyMeta(code: string) {
  return CURRENCIES.find((item) => item.code === code) ?? CURRENCIES[0];
}

export function allPermissions(keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

export function defaultStaffPermissions(role: string): Record<string, boolean> {
  const all = allPermissions(STAFF_FEATURES);
  if (role === "store_owner" || role === "store_admin") return all;
  if (role === "manager") {
    return { ...all, staff: false };
  }
  if (role === "cashier") {
    return Object.fromEntries(STAFF_FEATURES.map((key) => [key, key === "pos" || key === "orders" || key === "customers" || key === "overview"]));
  }
  if (role === "stock_keeper") {
    return Object.fromEntries(
      STAFF_FEATURES.map((key) => [key, key === "catalog" || key === "media" || key === "orders" || key === "overview"]),
    );
  }
  return Object.fromEntries(STAFF_FEATURES.map((key) => [key, false]));
}

export function canUseFeature(role: string, permissions: Record<string, boolean> | null | undefined, feature: string) {
  if (role === "store_owner" || role === "platform_owner") return true;
  return Boolean(permissions?.[feature]);
}
