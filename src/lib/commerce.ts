import { currencyMeta } from "@/lib/constants";

export type Locale = "ar" | "en";

export function roundMoney(value: number, currency: string) {
  const digits = currencyMeta(currency).decimals;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function num(value: string | number | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(amount: number, currency: string, locale: Locale) {
  const digits = currencyMeta(currency).decimals;
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-BH" : "en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(digits)} ${currency}`;
  }
}

export function formatDate(value: Date | string | null | undefined, locale: Locale, withTime = false) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-BH" : "en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function resolveUnitPrice(input: {
  price: number;
  salePrice: number | null;
  discountPercent: number | null;
  variantPrice?: number | null;
}) {
  const original = input.variantPrice != null ? input.variantPrice : input.price;
  let active = original;
  if (input.variantPrice == null && input.salePrice != null && input.salePrice >= 0 && input.salePrice < original) {
    active = input.salePrice;
  } else if (input.discountPercent && input.discountPercent > 0) {
    active = original * (1 - Math.min(input.discountPercent, 100) / 100);
  }
  if (active < 0) active = 0;
  return { original, active };
}

export type QuoteLine = {
  original: number;
  active: number;
  qty: number;
};

export type QuoteCoupon = {
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
} | null;

export function quoteTotals(input: {
  lines: QuoteLine[];
  storeWidePercent: number;
  storeWideActive: boolean;
  coupon: QuoteCoupon;
  shipping: number;
  vatRate: number;
  vatInclusive: boolean;
  currency: string;
  commissionPercent: number;
}) {
  const r = (value: number) => roundMoney(value, input.currency);
  let netSubtotal = 0;
  let originalSubtotal = 0;
  for (const line of input.lines) {
    netSubtotal += line.active * line.qty;
    originalSubtotal += line.original * line.qty;
  }
  netSubtotal = r(netSubtotal);
  originalSubtotal = r(originalSubtotal);
  const itemDiscount = r(Math.max(0, originalSubtotal - netSubtotal));
  const storePercent = input.storeWideActive ? Math.min(Math.max(input.storeWidePercent, 0), 100) : 0;
  const storeDiscount = r(netSubtotal * (storePercent / 100));
  const afterStore = r(netSubtotal - storeDiscount);
  let couponDiscount = 0;
  let couponError: string | null = null;
  if (input.coupon) {
    if (netSubtotal + 0.0001 < input.coupon.minSubtotal) {
      couponError = "MIN_SUBTOTAL";
    } else if (input.coupon.type === "percent") {
      couponDiscount = r(afterStore * (Math.min(Math.max(input.coupon.value, 0), 100) / 100));
    } else {
      couponDiscount = r(Math.min(Math.max(input.coupon.value, 0), afterStore));
    }
  }
  const merchandise = r(afterStore - couponDiscount);
  const shipping = r(Math.max(input.shipping, 0));
  const gross = r(merchandise + shipping);
  const rate = Math.max(input.vatRate, 0);
  let vat = 0;
  let total = gross;
  if (rate > 0 && input.vatInclusive) {
    vat = r(gross - gross / (1 + rate / 100));
    total = gross;
  } else if (rate > 0) {
    vat = r(gross * (rate / 100));
    total = r(gross + vat);
  }
  const discountTotal = r(itemDiscount + storeDiscount + couponDiscount);
  const commission = r(total * (Math.max(input.commissionPercent, 0) / 100));
  return {
    originalSubtotal,
    subtotal: netSubtotal,
    itemDiscount,
    storeDiscount,
    storeDiscountPercent: storePercent,
    couponDiscount,
    discountTotal,
    shipping,
    vat,
    total,
    commission,
    couponError,
  };
}

export function subscriptionActive(status: string, endsAt: Date | string | null | undefined) {
  if (status === "suspended") return false;
  if (!endsAt) return false;
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  return end.getTime() > Date.now();
}

export function daysRemaining(endsAt: Date | string | null | undefined) {
  if (!endsAt) return 0;
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function safeHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

export function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function pickLocale(value: string | undefined | null): Locale {
  return value === "ar" ? "ar" : "en";
}

export function localized(locale: Locale, en: string, ar: string) {
  return locale === "ar" ? ar || en : en || ar;
}
