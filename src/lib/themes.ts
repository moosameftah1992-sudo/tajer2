export type ThemeConfig = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  fontScale: number;
  radius: number;
  gradient: boolean;
  gradientFrom: string;
  gradientTo: string;
  orientation: "grid" | "showcase" | "list";
  width: "narrow" | "wide";
};

export type ThemeDefinition = {
  id: string;
  number: number;
  nameEn: string;
  nameAr: string;
  industry: string;
  descriptionEn: string;
  descriptionAr: string;
  hero: "overlay" | "split" | "marquee" | "ticket" | "mosaic" | "band";
  card: "dish" | "tile" | "jewel" | "look" | "spec" | "soft" | "arch" | "sticker" | "row";
  pattern: string;
  defaults: ThemeConfig;
};

export const THEMES: ThemeDefinition[] = [
  {
    id: "t01",
    number: 1,
    nameEn: "Royal Table",
    nameAr: "المائدة الملكية",
    industry: "restaurant",
    descriptionEn: "A candlelit dining room with gold rules, course sections, and a reservation-grade menu.",
    descriptionAr: "قاعة طعام دافئة بخطوط ذهبية وأقسام أطباق تليق بالحجز الراقي.",
    hero: "ticket",
    card: "dish",
    pattern: "lines",
    defaults: theme("#1C1917", "#D6B25E", "#F6F1E7", "#FFFDF8", "#1C1917", "#78716C", 18),
  },
  {
    id: "t02",
    number: 2,
    nameEn: "Souk Fresh",
    nameAr: "سوق الطازج",
    industry: "grocery",
    descriptionEn: "A dense market grid with price tickets, sticky aisles, and harvest colors.",
    descriptionAr: "شبكة سوق كثيفة بتذاكر أسعار وممرات ثابتة وألوان الحصاد.",
    hero: "band",
    card: "tile",
    pattern: "dots",
    defaults: theme("#14532D", "#F59E0B", "#F3F7F1", "#FFFFFF", "#142318", "#4B6354", 14),
  },
  {
    id: "t03",
    number: 3,
    nameEn: "Lumière",
    nameAr: "لومير",
    industry: "jewelry",
    descriptionEn: "A dark atelier with shimmering product stages and champagne metal.",
    descriptionAr: "أتيليه داكن بمنصات متلألئة ولمسة شامبانيا معدنية.",
    hero: "overlay",
    card: "jewel",
    pattern: "shimmer",
    defaults: theme("#F5E6C8", "#C6A15B", "#0C0B0A", "#161411", "#F8F1E4", "#B7AA96", 8),
  },
  {
    id: "t04",
    number: 4,
    nameEn: "Atelier Mode",
    nameAr: "أتيليه الموضة",
    industry: "fashion",
    descriptionEn: "An editorial lookbook with oversized type and asymmetric imagery.",
    descriptionAr: "كتاب أزياء تحريري بأحرف كبيرة وصور غير متماثلة.",
    hero: "split",
    card: "look",
    pattern: "none",
    defaults: theme("#111111", "#E11D48", "#F6F4F1", "#FFFFFF", "#111111", "#6B6560", 0),
  },
  {
    id: "t05",
    number: 5,
    nameEn: "Volt",
    nameAr: "فولت",
    industry: "electronics",
    descriptionEn: "A precision tech catalog with spec chips, sharp corners, and electric blue.",
    descriptionAr: "كتالوج تقني دقيق برقائق مواصفات وزوايا حادة وأزرق كهربائي.",
    hero: "mosaic",
    card: "spec",
    pattern: "grid",
    defaults: theme("#38BDF8", "#22D3EE", "#0B1220", "#111827", "#E6F1FF", "#94A3B8", 6),
  },
  {
    id: "t06",
    number: 6,
    nameEn: "Linen",
    nameAr: "كتان",
    industry: "boutique",
    descriptionEn: "A quiet boutique with paper space, thin rules, and slow luxury.",
    descriptionAr: "بوتيك هادئ بمساحات ورقية وخطوط رفيعة وفخامة متأنية.",
    hero: "split",
    card: "soft",
    pattern: "none",
    defaults: theme("#3F3A36", "#A8A29E", "#F7F4EF", "#FFFcf8", "#292524", "#8A8178", 2),
  },
  {
    id: "t07",
    number: 7,
    nameEn: "Bahar Souk",
    nameAr: "سوق بهار",
    industry: "grocery",
    descriptionEn: "A spice souk of arches, terracotta, and patterned stalls.",
    descriptionAr: "سوق بهارات بأقواس وطين ونقوش الأكشاك.",
    hero: "marquee",
    card: "arch",
    pattern: "arch",
    defaults: theme("#9A3412", "#F5C16C", "#FBF3E8", "#FFF9F2", "#431407", "#9A6B4F", 22),
  },
  {
    id: "t08",
    number: 8,
    nameEn: "Qahwa",
    nameAr: "قهوة",
    industry: "cafe",
    descriptionEn: "A neighborhood coffee house with cream paper and rounded cups.",
    descriptionAr: "مقهى حي بورق كريمي وأكواب مستديرة.",
    hero: "band",
    card: "soft",
    pattern: "steam",
    defaults: theme("#6F4E37", "#D6A36A", "#F8F1E7", "#FFFBF5", "#3F2A1D", "#8C715E", 24),
  },
  {
    id: "t09",
    number: 9,
    nameEn: "Oud House",
    nameAr: "بيت العود",
    industry: "perfume",
    descriptionEn: "A plum perfume salon with foil lines and centered ritual.",
    descriptionAr: "صالون عطور بنفسجي بخطوط ذهبية وطقوس متوسطة.",
    hero: "overlay",
    card: "jewel",
    pattern: "foil",
    defaults: theme("#F3D7B0", "#E7C48A", "#2A1024", "#3A1630", "#F8EDE2", "#D7B8C6", 4),
  },
  {
    id: "t10",
    number: 10,
    nameEn: "Dunya Kids",
    nameAr: "دنيا الأطفال",
    industry: "kids",
    descriptionEn: "A playful sticker shop with sunshine chips and bouncy cards.",
    descriptionAr: "متجر ملصقات مرح برقائق مشمسة وبطاقات نابضة.",
    hero: "marquee",
    card: "sticker",
    pattern: "confetti",
    defaults: theme("#0284C7", "#FACC15", "#EFF8FF", "#FFFFFF", "#0C4A6E", "#64748B", 28),
  },
  {
    id: "t11",
    number: 11,
    nameEn: "Arena",
    nameAr: "الأرينا",
    industry: "sports",
    descriptionEn: "A bold sports floor with diagonal cuts and high-contrast tickets.",
    descriptionAr: "أرضية رياضية جريئة بقطوع مائلة وتذاكر عالية التباين.",
    hero: "band",
    card: "spec",
    pattern: "slash",
    defaults: theme("#EF4444", "#F8FAFC", "#09090B", "#18181B", "#FAFAFA", "#A1A1AA", 2),
  },
  {
    id: "t12",
    number: 12,
    nameEn: "Dar",
    nameAr: "دار",
    industry: "home",
    descriptionEn: "A calm home atelier in sage, linen, and room-sized frames.",
    descriptionAr: "أتيليه منزلي هادئ بالمريمية والكتان وإطارات واسعة.",
    hero: "mosaic",
    card: "soft",
    pattern: "linen",
    defaults: theme("#3F6212", "#D6D3C4", "#F4F1EA", "#FBFAF6", "#1C1917", "#78716C", 16),
  },
  {
    id: "t13",
    number: 13,
    nameEn: "Furn",
    nameAr: "فرن",
    industry: "bakery",
    descriptionEn: "A dawn bakery with wheat tones, pastry rows, and warm tickets.",
    descriptionAr: "مخبز فجر بألوان القمح وصفوف المعجنات وتذاكر دافئة.",
    hero: "ticket",
    card: "dish",
    pattern: "grain",
    defaults: theme("#B45309", "#FDE68A", "#FFF7ED", "#FFFBF5", "#431407", "#A16207", 20),
  },
  {
    id: "t14",
    number: 14,
    nameEn: "Chronos",
    nameAr: "كرونوس",
    industry: "watches",
    descriptionEn: "A watch vault of charcoal, silver rules, and numbered precision.",
    descriptionAr: "خزينة ساعات فحمية بخطوط فضية ودقة مرقمة.",
    hero: "overlay",
    card: "spec",
    pattern: "ticks",
    defaults: theme("#E5E7EB", "#A3A3A3", "#111113", "#1A1A1D", "#F5F5F5", "#A3A3A3", 2),
  },
  {
    id: "t15",
    number: 15,
    nameEn: "Warda",
    nameAr: "وردة",
    industry: "beauty",
    descriptionEn: "A glass beauty counter with blush light and soft glow cards.",
    descriptionAr: "ركن جمال زجاجي بضوء وردي وبطاقات متوهجة.",
    hero: "split",
    card: "soft",
    pattern: "glow",
    defaults: theme("#9D174D", "#F9A8D4", "#FFF5F7", "#FFFFFF", "#4A044E", "#9F6B86", 26),
  },
  {
    id: "t16",
    number: 16,
    nameEn: "Riwaq",
    nameAr: "رواق",
    industry: "books",
    descriptionEn: "A literary riwaq of ink, paper shelves, and quiet rows.",
    descriptionAr: "رواق أدبي بالحبر ورفوف الورق وصفوف هادئة.",
    hero: "band",
    card: "row",
    pattern: "rules",
    defaults: theme("#1E3A5F", "#C2410C", "#F7F3EA", "#FFFDF8", "#1C1917", "#78716C", 4),
  },
  {
    id: "t17",
    number: 17,
    nameEn: "Wafa Pets",
    nameAr: "وفا للحيوانات",
    industry: "pets",
    descriptionEn: "A friendly pet palace with teal badges and rounded treats.",
    descriptionAr: "قصر أليف بشارات فيروزية ومكافآت مستديرة.",
    hero: "marquee",
    card: "sticker",
    pattern: "paws",
    defaults: theme("#0F766E", "#FDBA74", "#F0FDFA", "#FFFFFF", "#134E4A", "#5E7A76", 26),
  },
  {
    id: "t18",
    number: 18,
    nameEn: "Makina",
    nameAr: "ماكينة",
    industry: "auto",
    descriptionEn: "An industrial parts bench with steel panels and amber warnings.",
    descriptionAr: "طاولة قطع صناعية بألواح فولاذية وتنبيهات كهرمانية.",
    hero: "mosaic",
    card: "row",
    pattern: "steel",
    defaults: theme("#F59E0B", "#94A3B8", "#E8EDF2", "#FFFFFF", "#0F172A", "#64748B", 4),
  },
  {
    id: "t19",
    number: 19,
    nameEn: "Zahr",
    nameAr: "زهر",
    industry: "flowers",
    descriptionEn: "A botanical studio with organic frames and petal color.",
    descriptionAr: "استوديو نباتي بإطارات عضوية وألوان البتلات.",
    hero: "split",
    card: "arch",
    pattern: "botanical",
    defaults: theme("#BE185D", "#86EFAC", "#F7FBF4", "#FFFFFF", "#1F2937", "#6B7280", 30),
  },
  {
    id: "t20",
    number: 20,
    nameEn: "Layl Market",
    nameAr: "سوق الليل",
    industry: "restaurant",
    descriptionEn: "A midnight street market with neon emerald tiles and night tickets.",
    descriptionAr: "سوق شارع منتصف الليل ببلاط زمردي نيون وتذاكر ليلية.",
    hero: "marquee",
    card: "tile",
    pattern: "neon",
    defaults: theme("#34D399", "#F472B6", "#070B14", "#101623", "#ECFDF5", "#94A3B8", 12),
  },
];

function theme(
  primary: string,
  accent: string,
  background: string,
  surface: string,
  text: string,
  muted: string,
  radius: number,
): ThemeConfig {
  return {
    primary,
    secondary: accent,
    accent,
    background,
    surface,
    text,
    muted,
    fontScale: 1,
    radius,
    gradient: true,
    gradientFrom: primary,
    gradientTo: accent,
    orientation: "grid",
    width: "wide",
  };
}

export function themeById(id: string) {
  return THEMES.find((item) => item.id === id) ?? THEMES[0];
}

export function normalizeThemeConfig(themeId: string, raw: unknown): ThemeConfig {
  const base = { ...themeById(themeId).defaults };
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<ThemeConfig>;
  const hex = (value: unknown, fallback: string) =>
    typeof value === "string" && /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback;
  return {
    primary: hex(input.primary, base.primary),
    secondary: hex(input.secondary, base.secondary),
    accent: hex(input.accent, base.accent),
    background: hex(input.background, base.background),
    surface: hex(input.surface, base.surface),
    text: hex(input.text, base.text),
    muted: hex(input.muted, base.muted),
    fontScale: clamp(Number(input.fontScale ?? base.fontScale), 0.85, 1.2),
    radius: clamp(Number(input.radius ?? base.radius), 0, 36),
    gradient: Boolean(input.gradient ?? base.gradient),
    gradientFrom: hex(input.gradientFrom, base.gradientFrom),
    gradientTo: hex(input.gradientTo, base.gradientTo),
    orientation: input.orientation === "showcase" || input.orientation === "list" ? input.orientation : input.orientation === "grid" ? "grid" : base.orientation,
    width: input.width === "narrow" ? "narrow" : input.width === "wide" ? "wide" : base.width,
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function themeStyle(config: ThemeConfig) {
  return {
    "--t-primary": config.primary,
    "--t-secondary": config.secondary,
    "--t-accent": config.accent,
    "--t-bg": config.background,
    "--t-surface": config.surface,
    "--t-text": config.text,
    "--t-muted": config.muted,
    "--t-radius": `${config.radius}px`,
    "--t-scale": String(config.fontScale),
    "--t-grad-from": config.gradientFrom,
    "--t-grad-to": config.gradientTo,
  } as Record<string, string>;
}
