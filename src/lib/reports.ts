import ExcelJS from "exceljs";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import { money } from "@/lib/commerce";

const FORMS: Record<string, [string, string, string, string]> = {
  ا: ["ﺍ", "ﺍ", "ﺎ", "ﺎ"],
  أ: ["ﺃ", "ﺃ", "ﺄ", "ﺄ"],
  إ: ["ﺇ", "ﺇ", "ﺈ", "ﺈ"],
  آ: ["ﺁ", "ﺁ", "ﺂ", "ﺂ"],
  ب: ["ﺏ", "ﺑ", "ﺒ", "ﺐ"],
  ت: ["ﺕ", "ﺗ", "ﺘ", "ﺖ"],
  ث: ["ﺙ", "ﺛ", "ﺜ", "ﺚ"],
  ج: ["ﺝ", "ﺟ", "ﺠ", "ﺞ"],
  ح: ["ﺡ", "ﺣ", "ﺤ", "ﺢ"],
  خ: ["ﺥ", "ﺧ", "ﺨ", "ﺦ"],
  د: ["ﺩ", "ﺩ", "ﺪ", "ﺪ"],
  ذ: ["ﺫ", "ﺫ", "ﺬ", "ﺬ"],
  ر: ["ﺭ", "ﺭ", "ﺮ", "ﺮ"],
  ز: ["ﺯ", "ﺯ", "ﺰ", "ﺰ"],
  س: ["ﺱ", "ﺳ", "ﺴ", "ﺲ"],
  ش: ["ﺵ", "ﺷ", "ﺸ", "ﺶ"],
  ص: ["ﺹ", "ﺻ", "ﺼ", "ﺺ"],
  ض: ["ﺽ", "ﺿ", "ﻀ", "ﺾ"],
  ط: ["ﻁ", "ﻃ", "ﻄ", "ﻂ"],
  ظ: ["ﻅ", "ﻇ", "ﻈ", "ﻆ"],
  ع: ["ﻉ", "ﻋ", "ﻌ", "ﻊ"],
  غ: ["ﻍ", "ﻏ", "ﻐ", "ﻎ"],
  ف: ["ﻑ", "ﻓ", "ﻔ", "ﻒ"],
  ق: ["ﻕ", "ﻗ", "ﻘ", "ﻖ"],
  ك: ["ﻙ", "ﻛ", "ﻜ", "ﻚ"],
  ل: ["ﻝ", "ﻟ", "ﻠ", "ﻞ"],
  م: ["ﻡ", "ﻣ", "ﻤ", "ﻢ"],
  ن: ["ﻥ", "ﻧ", "ﻨ", "ﻦ"],
  ه: ["ﻩ", "ﻫ", "ﻬ", "ﻪ"],
  و: ["ﻭ", "ﻭ", "ﻮ", "ﻮ"],
  ؤ: ["ﺅ", "ﺅ", "ﺆ", "ﺆ"],
  ي: ["ﻱ", "ﻳ", "ﻴ", "ﻲ"],
  ى: ["ﻯ", "ﻯ", "ﻰ", "ﻰ"],
  ئ: ["ﺉ", "ﺋ", "ﺌ", "ﺊ"],
  ة: ["ﺓ", "ﺓ", "ﺔ", "ﺔ"],
  ء: ["ء", "ء", "ء", "ء"],
};

const NON_JOIN = new Set(["ا", "أ", "إ", "آ", "د", "ذ", "ر", "ز", "و", "ؤ", "ء", "ة", "ى"]);
const LAM_ALEF: Record<string, [string, string]> = {
  ا: ["ﻻ", "ﻼ"],
  أ: ["ﻷ", "ﻸ"],
  إ: ["ﻹ", "ﻺ"],
  آ: ["ﻵ", "ﻶ"],
};

export function shapeArabic(input: string) {
  const chars = Array.from(input);
  const shaped: string[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const form = FORMS[ch];
    if (!form) {
      shaped.push(ch);
      continue;
    }
    const prev = chars[i - 1];
    const next = chars[i + 1];
    const prevJoins = Boolean(prev && FORMS[prev] && !NON_JOIN.has(prev));
    if (ch === "ل" && next && LAM_ALEF[next]) {
      shaped.push(prevJoins ? LAM_ALEF[next][1] : LAM_ALEF[next][0]);
      i += 1;
      continue;
    }
    const nextArabic = Boolean(next && FORMS[next]);
    if (prevJoins && nextArabic) shaped.push(form[2]);
    else if (prevJoins) shaped.push(form[3]);
    else if (nextArabic) shaped.push(form[1]);
    else shaped.push(form[0]);
  }
  return shaped.reverse().join("");
}

export type ReportOrder = {
  number: string;
  createdAt: string;
  status: string;
  channel: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  total: number;
  discountTotal: number;
  shippingTotal: number;
  vatTotal: number;
  currency: string;
};

export type ReportPayload = {
  storeEn: string;
  storeAr: string;
  currency: string;
  from: string;
  to: string;
  orders: ReportOrder[];
  totals: { orders: number; revenue: number; discount: number; vat: number; shipping: number };
  top: Array<{ nameEn: string; nameAr: string; qty: number; revenue: number }>;
};

export async function buildWorkbook(report: ReportPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tajer";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Sales");
  sheet.columns = [
    { header: "Order / الطلب", key: "number", width: 18 },
    { header: "Date / التاريخ", key: "createdAt", width: 22 },
    { header: "Status / الحالة", key: "status", width: 20 },
    { header: "Channel / القناة", key: "channel", width: 14 },
    { header: "Payment / الدفع", key: "paymentMethod", width: 16 },
    { header: "Customer / العميل", key: "customerName", width: 24 },
    { header: "Discount / الخصم", key: "discountTotal", width: 16 },
    { header: "Shipping / الشحن", key: "shippingTotal", width: 16 },
    { header: "VAT / الضريبة", key: "vatTotal", width: 14 },
    { header: "Total / الإجمالي", key: "total", width: 16 },
    { header: "Currency", key: "currency", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const order of report.orders) sheet.addRow(order);
  sheet.addRow({});
  sheet.addRow({ customerName: "Revenue", total: report.totals.revenue, currency: report.currency });
  const products = workbook.addWorksheet("Products");
  products.columns = [
    { header: "Product", key: "nameEn", width: 32 },
    { header: "المنتج", key: "nameAr", width: 32 },
    { header: "Qty", key: "qty", width: 12 },
    { header: "Revenue", key: "revenue", width: 16 },
  ];
  products.getRow(1).font = { bold: true };
  for (const item of report.top) products.addRow(item);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPdf(report: ReportPayload) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(`Tajer sales ${report.storeEn}`);
  let arabic = null as Awaited<ReturnType<PDFDocument["embedFont"]>> | null;
  let latin = null as Awaited<ReturnType<PDFDocument["embedFont"]>> | null;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public/fonts/IBMPlexSansArabic-Regular.ttf"));
    arabic = await pdf.embedFont(bytes, { subset: true });
  } catch {
    arabic = null;
  }
  try {
    const bytes = await readFile(path.join(process.cwd(), "public/fonts/IBMPlexSans-Regular.ttf"));
    latin = await pdf.embedFont(bytes, { subset: true });
  } catch {
    latin = await pdf.embedFont(StandardFonts.Helvetica);
  }
  const font = latin || (await pdf.embedFont(StandardFonts.Helvetica));
  const arFont = arabic || font;
  const pageSize: [number, number] = [595, 842];
  let page = pdf.addPage(pageSize);
  let y = 800;
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.33, 0.39, 0.47);
  const draw = (text: string, size: number, color = ink, useArabic = false) => {
    if (y < 56) {
      page = pdf.addPage(pageSize);
      y = 800;
    }
    const chosen = useArabic && arabic ? arFont : font;
    const value = useArabic && arabic ? shapeArabic(text) : text;
    page.drawText(value.slice(0, 110), { x: 40, y, size, font: chosen, color });
    y -= size + 8;
  };
  draw("Tajer / Advanced sales report", 16);
  draw(report.storeEn, 12);
  if (arabic) draw(report.storeAr, 12, ink, true);
  draw(`${report.from.slice(0, 10)} - ${report.to.slice(0, 10)}`, 10, muted);
  draw(
    `Orders ${report.totals.orders}    Revenue ${money(report.totals.revenue, report.currency, "en")}    VAT ${money(report.totals.vat, report.currency, "en")}`,
    10,
  );
  y -= 6;
  draw("Order          Date          Status           Total", 9, muted);
  for (const order of report.orders.slice(0, 400)) {
    draw(
      `${order.number.padEnd(14)} ${order.createdAt.slice(0, 10)}   ${order.status.padEnd(16)} ${money(order.total, report.currency, "en")}`,
      9,
    );
  }
  y -= 8;
  draw("Top products", 12);
  for (const item of report.top.slice(0, 20)) {
    draw(`${item.nameEn}  ×${item.qty}  ${money(item.revenue, report.currency, "en")}`, 9);
    if (arabic) draw(item.nameAr, 9, ink, true);
  }
  draw("Generated by Tajer. Payments settle to the merchant gateway; this file is an operational report.", 8, muted);
  return Buffer.from(await pdf.save());
}
