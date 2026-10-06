import { eq, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import {
  areas,
  categories,
  coupons,
  countries,
  governorates,
  orderItems,
  orders,
  paymentGateways,
  platformSettings,
  platformUsers,
  productVariants,
  products,
  restaurantTables,
  shippingProviders,
  shippingRates,
  subscriptionEvents,
  tenantCarriers,
  tenantDomains,
  tenants,
  themeCatalog,
  users,
} from "@/db/schema";
import { hashPassword, newId } from "@/lib/auth";
import { addDays, quoteTotals } from "@/lib/commerce";
import { allPermissions, defaultStaffPermissions, PLATFORM_FEATURES } from "@/lib/constants";
import { THEMES } from "@/lib/themes";

const globalState = globalThis as typeof globalThis & { __tajerReady?: Promise<void> };

export function ensureBootstrapped() {
  if (!globalState.__tajerReady) {
    globalState.__tajerReady = seed().catch((error) => {
      globalState.__tajerReady = undefined;
      throw error;
    });
  }
  return globalState.__tajerReady;
}

type Gov = [string, string, Array<[string, string]>];
type CountrySeed = [string, string, string, string, boolean, Gov[]];

const GEO: CountrySeed[] = [
  ["BH", "Bahrain", "البحرين", "10", true, [
    ["Capital", "العاصمة", [["Manama", "المنامة"], ["Hoora", "الحورة"], ["Juffair", "الجفير"], ["Seef", "السيف"], ["Adliya", "العدلية"], ["Zinj", "الزنج"]]],
    ["Muharraq", "المحرق", [["Muharraq", "المحرق"], ["Busaiteen", "البسيتين"], ["Amwaj", "أمواج"], ["Hidd", "الحد"], ["Arad", "عراد"]]],
    ["Northern", "الشمالية", [["Budaiya", "البديع"], ["Saar", "سار"], ["Janabiya", "الجنبية"], ["Barbar", "باربار"], ["Hamala", "الهملة"]]],
    ["Southern", "الجنوبية", [["Riffa", "الرفاع"], ["Isa Town", "مدينة عيسى"], ["Awali", "عوالي"], ["Zallaq", "الزلاق"], ["Durrat Al Bahrain", "درة البحرين"]]],
  ]],
  ["SA", "Saudi Arabia", "السعودية", "15", true, [
    ["Riyadh", "الرياض", [["Al Olaya", "العليا"], ["Al Malaz", "الملز"], ["Al Nakheel", "النخيل"], ["Diriyah", "الدرعية"], ["Al Yasmin", "الياسمين"]]],
    ["Makkah", "مكة المكرمة", [["Jeddah Al Hamra", "جدة الحمراء"], ["Al Balad", "البلد"], ["Al Zahra", "الزهراء"], ["Aziziyah", "العزيزية"], ["Taif", "الطائف"]]],
    ["Eastern Province", "المنطقة الشرقية", [["Dammam", "الدمام"], ["Khobar", "الخبر"], ["Dhahran", "الظهران"], ["Qatif", "القطيف"]]],
    ["Madinah", "المدينة المنورة", [["Al Haram", "الحرم"], ["Al Aziziyah", "العزيزية"], ["Quba", "قباء"]]],
    ["Asir", "عسير", [["Abha", "أبها"], ["Khamis Mushait", "خميس مشيط"]]],
  ]],
  ["KW", "Kuwait", "الكويت", "0", true, [
    ["Al Asimah", "العاصمة", [["Kuwait City", "مدينة الكويت"], ["Sharq", "الشرق"], ["Dasman", "دسمان"]]],
    ["Hawalli", "حولي", [["Salmiya", "السالمية"], ["Jabriya", "الجابرية"], ["Hawalli", "حولي"]]],
    ["Farwaniya", "الفروانية", [["Jleeb Al-Shuyoukh", "جليب الشيوخ"], ["Khaitan", "خيطان"]]],
    ["Ahmadi", "الأحمدي", [["Fahaheel", "الفحيحيل"], ["Mangaf", "المنقف"]]],
    ["Jahra", "الجهراء", [["Jahra", "الجهراء"], ["Saad Al Abdullah", "سعد العبدالله"]]],
    ["Mubarak Al-Kabeer", "مبارك الكبير", [["Sabah Al Salem", "صباح السالم"], ["Abu Fatira", "أبو فطيرة"]]],
  ]],
  ["AE", "United Arab Emirates", "الإمارات", "5", true, [
    ["Abu Dhabi", "أبوظبي", [["Al Khalidiyah", "الخالدية"], ["Al Reem", "الريم"], ["Yas Island", "جزيرة ياس"], ["Khalifa City", "مدينة خليفة"]]],
    ["Dubai", "دبي", [["Downtown", "وسط المدينة"], ["Marina", "المارينا"], ["Jumeirah", "جميرا"], ["Deira", "ديرة"], ["Business Bay", "الخليج التجاري"]]],
    ["Sharjah", "الشارقة", [["Al Majaz", "المجاز"], ["Al Nahda", "النهدة"]]],
    ["Ajman", "عجمان", [["Al Nuaimiya", "النعيمية"], ["Al Rashidiya", "الراشدية"]]],
    ["Ras Al Khaimah", "رأس الخيمة", [["Al Nakheel", "النخيل"], ["Al Hamra", "الحمراء"]]],
  ]],
  ["QA", "Qatar", "قطر", "0", true, [
    ["Doha", "الدوحة", [["West Bay", "الخليج الغربي"], ["The Pearl", "اللؤلؤة"], ["Al Sadd", "السد"], ["Lusail", "لوسيل"]]],
    ["Al Rayyan", "الريان", [["Al Rayyan", "الريان"], ["Education City", "المدينة التعليمية"]]],
    ["Al Wakrah", "الوكرة", [["Al Wakrah", "الوكرة"], ["Al Wukair", "الوكير"]]],
    ["Al Khor", "الخور", [["Al Khor", "الخور"], ["Al Thakhira", "الذخيرة"]]],
  ]],
  ["OM", "Oman", "عُمان", "5", true, [
    ["Muscat", "مسقط", [["Ruwi", "روي"], ["Qurum", "القرم"], ["Al Khuwair", "الخوير"], ["Seeb", "السيب"], ["Mutrah", "مطرح"]]],
    ["Dhofar", "ظفار", [["Salalah", "صلالة"], ["Awqad", "عوقد"]]],
    ["Ad Dakhiliyah", "الداخلية", [["Nizwa", "نزوى"], ["Bahla", "بهلاء"]]],
    ["Al Batinah North", "شمال الباطنة", [["Sohar", "صحار"], ["Shinas", "شناص"]]],
    ["Ash Sharqiyah South", "جنوب الشرقية", [["Sur", "صور"], ["Al Kamil", "الكامل"]]],
  ]],
  ["US", "United States", "الولايات المتحدة", "0", false, [
    ["California", "كاليفورنيا", [["Los Angeles", "لوس أنجلوس"], ["San Francisco", "سان فرانسيسكو"], ["San Diego", "سان دييغو"]]],
    ["New York", "نيويورك", [["Manhattan", "مانهاتن"], ["Brooklyn", "بروكلين"]]],
    ["Texas", "تكساس", [["Houston", "هيوستن"], ["Dallas", "دالاس"]]],
  ]],
  ["DE", "Germany", "ألمانيا", "19", false, [
    ["Berlin", "برلين", [["Mitte", "ميته"], ["Kreuzberg", "كروزبرغ"]]],
    ["Bavaria", "بافاريا", [["Munich", "ميونخ"], ["Nuremberg", "نورنبرغ"]]],
    ["Hamburg", "هامبورغ", [["Altona", "ألتونا"], ["HafenCity", "هافن سيتي"]]],
  ]],
];

async function seed() {
  await pool.query("select pg_advisory_lock(48291377)");
  try {
    const existing = await db.select({ id: platformUsers.id }).from(platformUsers).limit(1);
    if (existing.length) return;

    const now = new Date();
    const ownerHash = await hashPassword("TajerAdmin#2026");
    const managerHash = await hashPassword("Manager#2026");
    await db.insert(platformUsers).values([
      {
        id: "platform-owner",
        email: "admin@tajer.com",
        passwordHash: ownerHash,
        name: "Tajer Owner",
        role: "platform_owner",
        permissions: allPermissions(PLATFORM_FEATURES),
        active: true,
        tokenVersion: 1,
      },
      {
        id: "platform-manager",
        email: "manager@tajer.com",
        passwordHash: managerHash,
        name: "Platform Manager",
        role: "platform_manager",
        permissions: {
          overview: true,
          stores: true,
          geo: true,
          logistics: true,
          pricing: false,
          themes: true,
          admins: false,
          finance: true,
        },
        active: true,
        tokenVersion: 1,
      },
    ]);

    await db.insert(platformSettings).values({
      id: "default",
      monthlyPrice: "49.000",
      yearlyPrice: "470.000",
      billingCurrency: "USD",
      commissionPercent: "2.500",
      trialDays: 30,
      bankName: "National Bank of Bahrain",
      accountName: "Tajer Cloud W.L.L.",
      iban: "BH67NBOB00001299100123",
      instructionsEn: "Transfer the plan amount and include your store slug in the payment reference. Activation follows confirmation by Tajer finance.",
      instructionsAr: "حوّل قيمة الخطة واذكر معرف المتجر في مرجع الدفع. يتم التفعيل بعد تأكيد المالية في تاجر.",
      supportEmail: "support@tajer.com",
    });

    const countryIds = new Map<string, string>();
    const governorateIds = new Map<string, string>();
    const areaIds = new Map<string, string>();
    for (const [index, country] of GEO.entries()) {
      const [code, nameEn, nameAr, vat, inclusive, govs] = country;
      const countryId = `c-${code.toLowerCase()}`;
      countryIds.set(code, countryId);
      await db.insert(countries).values({
        id: countryId,
        code,
        nameEn,
        nameAr,
        vatDefault: vat,
        vatInclusiveDefault: inclusive,
        active: true,
        sort: index + 1,
      });
      govs.forEach(async () => undefined);
      for (const [govIndex, gov] of govs.entries()) {
        const govId = `g-${code.toLowerCase()}-${govIndex + 1}`;
        governorateIds.set(`${code}:${gov[0]}`, govId);
        await db.insert(governorates).values({
          id: govId,
          countryId,
          nameEn: gov[0],
          nameAr: gov[1],
          active: true,
          sort: govIndex + 1,
        });
        for (const [areaIndex, area] of gov[2].entries()) {
          const areaId = `a-${code.toLowerCase()}-${govIndex + 1}-${areaIndex + 1}`;
          areaIds.set(`${code}:${gov[0]}:${area[0]}`, areaId);
          await db.insert(areas).values({
            id: areaId,
            governorateId: govId,
            nameEn: area[0],
            nameAr: area[1],
            active: true,
            sort: areaIndex + 1,
          });
        }
      }
    }

    await db.insert(themeCatalog).values(
      THEMES.map((theme) => ({
        id: theme.id,
        number: theme.number,
        nameEn: theme.nameEn,
        nameAr: theme.nameAr,
        industry: theme.industry,
        descriptionEn: theme.descriptionEn,
        descriptionAr: theme.descriptionAr,
        active: true,
        sort: theme.number,
      })),
    );

    const providers = [
      ["parcel", "Parcel", "بارسل", "Same-day and next-day parcels across Bahrain and the GCC.", "طرود في نفس اليوم واليوم التالي داخل البحرين والخليج."],
      ["yabeh", "Yabeh", "يابه", "On-demand riders for restaurants and dark stores.", "مناديب عند الطلب للمطاعم والمتاجر السريعة."],
      ["aramex", "Aramex", "أرامكس", "Cross-border express for GCC fulfillment.", "شحن سريع عابر للحدود لتنفيذ طلبات الخليج."],
      ["smsa", "SMSA", "سمسا", "Domestic express with tracking webhooks.", "شحن داخلي سريع مع تتبع عبر الويب هوك."],
      ["local", "Store courier", "مندوب المتجر", "Merchant-owned riders dispatched from the store.", "مناديب المتجر أنفسهم."],
    ] as const;
    for (const [index, provider] of providers.entries()) {
      await db.insert(shippingProviders).values({
        id: `ship-${provider[0]}`,
        code: provider[0],
        nameEn: provider[1],
        nameAr: provider[2],
        descriptionEn: provider[3],
        descriptionAr: provider[4],
        outboundUrl: "",
        webhookSecret: `whsec_${provider[0]}_tajer`,
        active: true,
        configSchema: {
          fields: ["accountNumber", "apiKey", "pickupBranch"],
          webhook: `/api/webhooks/logistics/${provider[0]}`,
          events: ["picked_up", "in_transit", "delivered", "cancelled"],
        },
      });
      void index;
    }

    const noorTrial = addDays(now, 30);
    const noorEnd = addDays(now, 320);
    const sufraEnd = addDays(now, 18);
    const noorId = "tenant-noor";
    const sufraId = "tenant-sufra";
    const bh = countryIds.get("BH")!;
    const capital = governorateIds.get("BH:Capital")!;
    const manama = areaIds.get("BH:Capital:Manama")!;
    const seef = areaIds.get("BH:Capital:Seef")!;
    const muharraq = governorateIds.get("BH:Muharraq")!;
    const muharraqCity = areaIds.get("BH:Muharraq:Muharraq")!;

    await db.insert(tenants).values([
      {
        id: noorId,
        slug: "noor",
        nameEn: "Noor Maison",
        nameAr: "دار النور",
        industry: "jewelry",
        countryId: bh,
        governorateId: capital,
        currency: "BHD",
        vatRate: "10.000",
        vatInclusive: true,
        phone: "+973 1700 1144",
        email: "hello@noor.shop",
        addressEn: "Seef District, Manama",
        addressAr: "منطقة السيف، المنامة",
        aboutEn: "A Bahraini jewelry house for gold, pearls, and quiet luxury.",
        aboutAr: "دار مجوهرات بحرينية للذهب واللؤلؤ والفخامة الهادئة.",
        logoUrl: "",
        faviconUrl: "",
        themeId: "t03",
        themeConfig: THEMES[2].defaults,
        storeWideDiscountPercent: "5.000",
        storeWideDiscountActive: true,
        plan: "yearly",
        status: "active",
        featured: true,
        trialEndsAt: noorTrial,
        subscriptionEndsAt: noorEnd,
        orderSeq: 4,
      },
      {
        id: sufraId,
        slug: "sufra",
        nameEn: "Sufra",
        nameAr: "سفرة",
        industry: "restaurant",
        countryId: bh,
        governorateId: capital,
        currency: "BHD",
        vatRate: "10.000",
        vatInclusive: true,
        phone: "+973 1771 2200",
        email: "hello@sufra.shop",
        addressEn: "Adliya, Manama",
        addressAr: "العدلية، المنامة",
        aboutEn: "Gulf table: machboos, grill, and Arabic coffee from an open kitchen.",
        aboutAr: "سفرة خليجية: مجبوس ومشاوي وقهوة عربية من مطبخ مفتوح.",
        logoUrl: "",
        faviconUrl: "",
        themeId: "t01",
        themeConfig: THEMES[0].defaults,
        storeWideDiscountPercent: "0.000",
        storeWideDiscountActive: false,
        plan: "trial",
        status: "active",
        featured: true,
        trialEndsAt: sufraEnd,
        subscriptionEndsAt: sufraEnd,
        orderSeq: 6,
      },
    ]);

    await db.insert(subscriptionEvents).values({
      id: newId(),
      tenantId: noorId,
      type: "plan_approved",
      note: "Yearly plan confirmed after bank transfer.",
      previousEndsAt: noorTrial,
      newEndsAt: noorEnd,
      actorId: "platform-owner",
    });

    const noorOwner = "user-noor-owner";
    const sufraOwner = "user-sufra-owner";
    const cashier = "user-sufra-cashier";
    const layla = "user-noor-layla";
    await db.insert(users).values([
      {
        id: noorOwner,
        tenantId: noorId,
        email: "owner@noor.shop",
        passwordHash: await hashPassword("NoorOwner#2026"),
        name: "Huda Al Noor",
        phone: "+973 3900 1100",
        role: "store_owner",
        permissions: defaultStaffPermissions("store_owner"),
        active: true,
        tokenVersion: 1,
      },
      {
        id: sufraOwner,
        tenantId: sufraId,
        email: "owner@sufra.shop",
        passwordHash: await hashPassword("SufraOwner#2026"),
        name: "Yusuf Kamal",
        phone: "+973 3600 2200",
        role: "store_owner",
        permissions: defaultStaffPermissions("store_owner"),
        active: true,
        tokenVersion: 1,
      },
      {
        id: cashier,
        tenantId: sufraId,
        email: "cashier@sufra.shop",
        passwordHash: await hashPassword("Cashier#2026"),
        name: "Maryam Saleh",
        phone: "+973 3400 2211",
        role: "cashier",
        permissions: defaultStaffPermissions("cashier"),
        active: true,
        tokenVersion: 1,
      },
      {
        id: layla,
        tenantId: noorId,
        email: "layla@example.com",
        passwordHash: await hashPassword("Customer#2026"),
        name: "Layla Hassan",
        phone: "+973 3333 9090",
        role: "customer",
        permissions: {},
        active: true,
        tokenVersion: 1,
      },
    ]);

    for (const tenantId of [noorId, sufraId]) {
      for (const host of tenantId === noorId
        ? [["noor.tajer.com", true], ["noor.localhost", false]]
        : [["sufra.tajer.com", true], ["sufra.localhost", false]]) {
        await db.insert(tenantDomains).values({
          id: newId(),
          tenantId,
          host: host[0] as string,
          type: "subdomain",
          verified: true,
          isPrimary: Boolean(host[1]),
        });
      }
    }

    const noorCats = {
      rings: newId(),
      necklaces: newId(),
      earrings: newId(),
    };
    const sufraCats = {
      mains: newId(),
      grill: newId(),
      sweets: newId(),
      drinks: newId(),
    };
    await db.insert(categories).values([
      { id: noorCats.rings, tenantId: noorId, nameEn: "Rings", nameAr: "خواتم", slug: "rings", imageUrl: "/images/products/jewel-1.jpg", sort: 1, active: true },
      { id: noorCats.necklaces, tenantId: noorId, nameEn: "Necklaces", nameAr: "عقود", slug: "necklaces", imageUrl: "/images/products/jewel-2.jpg", sort: 2, active: true },
      { id: noorCats.earrings, tenantId: noorId, nameEn: "Earrings", nameAr: "أقراط", slug: "earrings", imageUrl: "/images/products/jewel-3.jpg", sort: 3, active: true },
      { id: sufraCats.mains, tenantId: sufraId, nameEn: "From the pot", nameAr: "من القدر", slug: "mains", imageUrl: "/images/products/food-1.jpg", sort: 1, active: true },
      { id: sufraCats.grill, tenantId: sufraId, nameEn: "Grill", nameAr: "المشوى", slug: "grill", imageUrl: "/images/products/food-2.jpg", sort: 2, active: true },
      { id: sufraCats.sweets, tenantId: sufraId, nameEn: "Sweets", nameAr: "حلويات", slug: "sweets", imageUrl: "/images/products/food-3.jpg", sort: 3, active: true },
      { id: sufraCats.drinks, tenantId: sufraId, nameEn: "Coffee & cold", nameAr: "قهوة وبارد", slug: "drinks", imageUrl: "/images/products/food-2.jpg", sort: 4, active: true },
    ]);

    const p = {
      ring: newId(),
      necklace: newId(),
      earrings: newId(),
      bracelet: newId(),
      signet: newId(),
      machboos: newId(),
      hamour: newId(),
      tikka: newId(),
      kunafa: newId(),
      coffee: newId(),
      mixed: newId(),
      soup: newId(),
      lemon: newId(),
    };

    await db.insert(products).values([
      product(p.ring, noorId, noorCats.rings, "Solitaire ring", "خاتم سوليتير", "18k yellow gold with a bright center stone, sized in-house.", "ذهب عيار 18 بحجر مركزي لامع، ويُفصّل المقاس داخل الدار.", "NR-RING-18", "1001001", "189.000", "169.000", null, "/images/products/jewel-1.jpg", 12, true, "3.200", "g", "18k"),
      product(p.necklace, noorId, noorCats.necklaces, "Bahrain pearl strand", "عقد لؤلؤ بحريني", "Hand-knotted natural pearls on a silk cord.", "لؤلؤ طبيعي معقود يدوياً على خيط حرير.", "NR-PEARL", "1001002", "240.000", null, null, "/images/products/jewel-2.jpg", 6, true, "18.000", "cm", "natural pearl"),
      product(p.earrings, noorId, noorCats.earrings, "Drop earrings", "أقراط متدلية", "21k gold drops with a quiet diamond line.", "ذهب عيار 21 بتدليّة هادئة من الألماس.", "NR-DROP", "1001003", "320.000", null, "15.000", "/images/products/jewel-3.jpg", 8, true, "6.400", "g", "21k"),
      product(p.bracelet, noorId, noorCats.necklaces, "Line bracelet", "سوار خطّي", "A slim diamond line made to sit alone or stacked.", "خط ألماس رفيع يُلبس وحده أو مع طبقات.", "NR-LINE", "1001004", "410.000", null, null, "/images/products/jewel-1.jpg", 4, false, "11.000", "g", "18k"),
      product(p.signet, noorId, noorCats.rings, "Sterling signet", "خاتم فضة بختم", "925 silver signet, engraved on request.", "خاتم فضة 925 يُنقش عند الطلب.", "NR-SIGNET", "1001005", "45.000", null, null, "/images/products/jewel-2.jpg", 20, true, "8.000", "g", "925"),
      product(p.machboos, sufraId, sufraCats.mains, "Lamb machboos", "مجبوس لحم", "Slow rice, dried lime, and Baharat, finished with toasted nuts.", "أرز هادئ بالنار مع لومي وبهارات، ويُزيّن بالمكسرات.", "SF-MACH", "2002001", "4.500", null, null, "/images/products/food-1.jpg", 40, true, null, "", ""),
      product(p.hamour, sufraId, sufraCats.grill, "Grilled hamour", "هامور مشوي", "Gulf hamour, charcoal, lemon, and green sauce.", "هامور خليجي على الفحم مع ليمون وصوص أخضر.", "SF-HAM", "2002002", "6.200", "5.400", null, "/images/products/food-2.jpg", 24, true, null, "", ""),
      product(p.tikka, sufraId, sufraCats.grill, "Chicken tikka", "تكة دجاج", "Yogurt marinade, charcoal, and warm bread.", "تتبيلة لبن على الفحم مع خبز دافئ.", "SF-TIK", "2002003", "3.800", null, null, "/images/products/food-3.jpg", 36, false, null, "", ""),
      product(p.kunafa, sufraId, sufraCats.sweets, "Warm kunafa", "كنافة دافئة", "Cheese kunafa, orange blossom, pistachio.", "كنافة جبن بماء الزهر والفستق.", "SF-KUN", "2002004", "2.200", null, null, "/images/products/food-1.jpg", 30, true, null, "", ""),
      product(p.coffee, sufraId, sufraCats.drinks, "Arabic coffee set", "دلة قهوة عربية", "Light roast, cardamom, and dates for two.", "تحميص خفيف وهيل وتمر لاثنين.", "SF-GHW", "2002005", "1.500", null, null, "/images/products/food-2.jpg", 50, false, null, "", ""),
      product(p.mixed, sufraId, sufraCats.grill, "Mixed grill", "مشاوي مشكلة", "Lamb chops, tikka, and kofta for the table.", "ريش وتكة وكفتة للطاولة.", "SF-MIX", "2002006", "7.900", null, null, "/images/products/food-3.jpg", 18, true, null, "", ""),
      product(p.soup, sufraId, sufraCats.mains, "Lentil soup", "شوربة عدس", "Cumin, lemon, and fried bread.", "كمون وليمون وخبز مقلي.", "SF-SOUP", "2002007", "1.200", null, null, "/images/products/food-1.jpg", 40, false, null, "", ""),
      product(p.lemon, sufraId, sufraCats.drinks, "Mint lemonade", "ليمون بالنعناع", "Crushed mint, lemon, and crushed ice.", "نعناع مهروس وليمون وثلج مجروش.", "SF-LEM", "2002008", "0.900", null, null, "/images/products/grocery-1.jpg", 60, false, null, "", ""),
    ]);

    const ringSize = newId();
    await db.insert(productVariants).values([
      { id: ringSize, tenantId: noorId, productId: p.ring, nameEn: "Size 6", nameAr: "مقاس 6", sku: "NR-RING-18-6", barcode: "10010016", price: "169.000", stock: 4, active: true, sort: 1 },
      { id: newId(), tenantId: noorId, productId: p.ring, nameEn: "Size 7", nameAr: "مقاس 7", sku: "NR-RING-18-7", barcode: "10010017", price: "169.000", stock: 5, active: true, sort: 2 },
      { id: newId(), tenantId: sufraId, productId: p.machboos, nameEn: "Family tray", nameAr: "صحن عائلي", sku: "SF-MACH-F", barcode: "20020019", price: "12.500", stock: 10, active: true, sort: 1 },
    ]);

    await db.insert(coupons).values([
      { id: newId(), tenantId: noorId, code: "NOOR10", type: "percent", value: "10.000", active: true, minSubtotal: "50.000", maxUses: 200, usedCount: 1, startsAt: addDays(now, -10), endsAt: addDays(now, 60) },
      { id: newId(), tenantId: sufraId, code: "SUFRA5", type: "fixed", value: "0.500", active: true, minSubtotal: "3.000", maxUses: 500, usedCount: 2, startsAt: addDays(now, -5), endsAt: addDays(now, 40) },
    ]);

    for (const tenantId of [noorId, sufraId]) {
      await db.insert(paymentGateways).values([
        gateway(tenantId, "cash", true, "", true),
        gateway(tenantId, "card", true, tenantId === noorId ? "NOOR-CARD-441" : "SUFRA-CARD-220", true),
        gateway(tenantId, "benefit", tenantId === noorId, tenantId === noorId ? "BEN-NOOR-18" : "", true),
        gateway(tenantId, "paypal", false, "", true),
      ]);
    }

    await db.insert(tenantCarriers).values([
      { id: newId(), tenantId: noorId, providerId: "ship-parcel", enabled: true, credentialsEnc: "", notes: "Seef pickup desk" },
      { id: newId(), tenantId: noorId, providerId: "ship-aramex", enabled: true, credentialsEnc: "", notes: "" },
      { id: newId(), tenantId: sufraId, providerId: "ship-yabeh", enabled: true, credentialsEnc: "", notes: "Kitchen dispatch" },
      { id: newId(), tenantId: sufraId, providerId: "ship-local", enabled: true, credentialsEnc: "", notes: "" },
      { id: newId(), tenantId: sufraId, providerId: "ship-parcel", enabled: false, credentialsEnc: "", notes: "Disabled by platform" },
    ]);

    await db.insert(shippingRates).values([
      rate(noorId, "ship-parcel", bh, capital, manama, "1.500", "Same day", "نفس اليوم"),
      rate(noorId, "ship-parcel", bh, capital, seef, "1.000", "2 hours", "ساعتان"),
      rate(noorId, "ship-parcel", bh, muharraq, muharraqCity, "2.000", "Next day", "اليوم التالي"),
      rate(sufraId, "ship-yabeh", bh, capital, null, "0.800", "35–50 min", "35–50 دقيقة"),
      rate(sufraId, "ship-local", bh, capital, manama, "0.500", "30 min", "30 دقيقة"),
      rate(sufraId, "ship-yabeh", bh, muharraq, null, "1.200", "45–70 min", "45–70 دقيقة"),
    ]);

    const tables = ["1", "2", "3", "4", "5", "6"];
    for (const name of tables) {
      await db.insert(restaurantTables).values({
        id: newId(),
        tenantId: sufraId,
        name: `T${name}`,
        code: `t${name}`,
        seats: name === "6" ? 8 : 4,
        zone: Number(name) <= 3 ? "Garden" : "Hall",
        active: true,
      });
    }

    await insertHistoricalOrder({
      tenantId: noorId,
      number: "NOOR-1001",
      createdAt: addDays(now, -12),
      status: "fulfilled",
      paymentStatus: "paid",
      method: "card",
      customerId: layla,
      name: "Layla Hassan",
      email: "layla@example.com",
      phone: "+973 3333 9090",
      areaId: seef,
      govId: capital,
      countryId: bh,
      address: "Seef Mall residence",
      currency: "BHD",
      vatRate: 10,
      storeWide: 5,
      storeWideActive: true,
      shipping: 1,
      coupon: null,
      lines: [{ id: p.signet, nameEn: "Sterling signet", nameAr: "خاتم فضة بختم", sku: "NR-SIGNET", qty: 1, price: 45, sale: null, discount: null }],
    });
    await insertHistoricalOrder({
      tenantId: noorId,
      number: "NOOR-1002",
      createdAt: addDays(now, -6),
      status: "processing",
      paymentStatus: "paid",
      method: "benefit",
      customerId: null,
      name: "Sara Ali",
      email: "sara@example.com",
      phone: "+973 3666 1212",
      areaId: manama,
      govId: capital,
      countryId: bh,
      address: "Hoora block 310",
      currency: "BHD",
      vatRate: 10,
      storeWide: 5,
      storeWideActive: true,
      shipping: 1.5,
      coupon: { type: "percent", value: 10, minSubtotal: 50 },
      lines: [{ id: p.ring, nameEn: "Solitaire ring", nameAr: "خاتم سوليتير", sku: "NR-RING-18", qty: 1, price: 189, sale: 169, discount: null, variantId: ringSize }],
    });
    await insertHistoricalOrder({
      tenantId: noorId,
      number: "NOOR-1003",
      createdAt: addDays(now, -2),
      status: "pending",
      paymentStatus: "unpaid",
      method: "cash",
      customerId: null,
      name: "Noor Fadel",
      email: "fadel@example.com",
      phone: "+973 3990 4040",
      areaId: muharraqCity,
      govId: muharraq,
      countryId: bh,
      address: "Muharraq souq",
      currency: "BHD",
      vatRate: 10,
      storeWide: 5,
      storeWideActive: true,
      shipping: 2,
      coupon: null,
      lines: [{ id: p.earrings, nameEn: "Drop earrings", nameAr: "أقراط متدلية", sku: "NR-DROP", qty: 1, price: 320, sale: null, discount: 15 }],
    });
    await insertHistoricalOrder({
      tenantId: noorId,
      number: "NOOR-1004",
      createdAt: addDays(now, -1),
      status: "out_for_delivery",
      paymentStatus: "paid",
      method: "card",
      customerId: null,
      name: "Ali Matar",
      email: "matar@example.com",
      phone: "+973 3777 8080",
      areaId: seef,
      govId: capital,
      countryId: bh,
      address: "Seef tower 2",
      currency: "BHD",
      vatRate: 10,
      storeWide: 5,
      storeWideActive: true,
      shipping: 1,
      coupon: null,
      lines: [{ id: p.necklace, nameEn: "Bahrain pearl strand", nameAr: "عقد لؤلؤ بحريني", sku: "NR-PEARL", qty: 1, price: 240, sale: null, discount: null }],
    });

    const sufraLines = [
      { id: p.machboos, nameEn: "Lamb machboos", nameAr: "مجبوس لحم", sku: "SF-MACH", price: 4.5 },
      { id: p.hamour, nameEn: "Grilled hamour", nameAr: "هامور مشوي", sku: "SF-HAM", price: 6.2, sale: 5.4 },
      { id: p.kunafa, nameEn: "Warm kunafa", nameAr: "كنافة دافئة", sku: "SF-KUN", price: 2.2 },
      { id: p.lemon, nameEn: "Mint lemonade", nameAr: "ليمون بالنعناع", sku: "SF-LEM", price: 0.9 },
    ];
    const sufraStatuses = ["fulfilled", "fulfilled", "processing", "out_for_delivery", "pending", "fulfilled"] as const;
    for (let i = 0; i < sufraStatuses.length; i += 1) {
      const line = sufraLines[i % sufraLines.length];
      await insertHistoricalOrder({
        tenantId: sufraId,
        number: `SUFRA-100${i + 1}`,
        createdAt: addDays(now, -(i * 3 + 1)),
        status: sufraStatuses[i],
        paymentStatus: sufraStatuses[i] === "pending" ? "unpaid" : "paid",
        method: i % 2 === 0 ? "cash" : "card",
        customerId: null,
        name: ["Hanan", "Omar", "Fatima", "Khalid", "Maha", "Salem"][i],
        email: `guest${i}@sufra.shop`,
        phone: `+973 3600 30${i}${i}`,
        areaId: manama,
        govId: capital,
        countryId: bh,
        address: "Adliya",
        currency: "BHD",
        vatRate: 10,
        storeWide: 0,
        storeWideActive: false,
        shipping: i === 4 ? 0 : 0.8,
        coupon: i === 1 ? { type: "fixed", value: 0.5, minSubtotal: 3 } : null,
        channel: i === 5 ? "pos" : "web",
        fulfillment: i === 5 ? "pickup" : "delivery",
        lines: [{ id: line.id, nameEn: line.nameEn, nameAr: line.nameAr, sku: line.sku, qty: i === 2 ? 2 : 1, price: line.price, sale: "sale" in line ? line.sale : null, discount: null }],
      });
    }

    await db.execute(sql`update products set stock = stock - 1 where id in (${p.signet}, ${p.ring}, ${p.earrings}, ${p.necklace}, ${p.machboos}, ${p.hamour}, ${p.kunafa}, ${p.lemon})`);
    await db.execute(sql`update products set stock = stock - 1 where id = ${p.tikka}`);
  } finally {
    await pool.query("select pg_advisory_unlock(48291377)");
  }
}

function product(
  id: string,
  tenantId: string,
  categoryId: string,
  nameEn: string,
  nameAr: string,
  descriptionEn: string,
  descriptionAr: string,
  sku: string,
  barcode: string,
  price: string,
  salePrice: string | null,
  discountPercent: string | null,
  imageUrl: string,
  stock: number,
  featured: boolean,
  weight: string | null,
  weightUnit: string,
  purity: string,
) {
  return {
    id,
    tenantId,
    categoryId,
    nameEn,
    nameAr,
    descriptionEn,
    descriptionAr,
    sku,
    barcode,
    price,
    salePrice,
    discountPercent,
    imageUrl,
    images: [imageUrl],
    stock,
    trackStock: true,
    active: true,
    featured,
    weightValue: weight,
    weightUnit,
    purity,
    unit: "piece",
    sort: 0,
  };
}

function gateway(tenantId: string, provider: string, enabled: boolean, merchantId: string, sandbox: boolean) {
  return {
    id: newId(),
    tenantId,
    provider,
    enabled,
    merchantId,
    apiKeyEnc: "",
    secretEnc: "",
    apiBaseUrl: "",
    sandbox,
    extra: {},
  };
}

function rate(
  tenantId: string,
  providerId: string,
  countryId: string,
  governorateId: string | null,
  areaId: string | null,
  price: string,
  etaEn: string,
  etaAr: string,
) {
  return {
    id: newId(),
    tenantId,
    providerId,
    countryId,
    governorateId,
    areaId,
    price,
    etaEn,
    etaAr,
    active: true,
  };
}

async function insertHistoricalOrder(input: {
  tenantId: string;
  number: string;
  createdAt: Date;
  status: string;
  paymentStatus: string;
  method: string;
  customerId: string | null;
  name: string;
  email: string;
  phone: string;
  areaId: string;
  govId: string;
  countryId: string;
  address: string;
  currency: string;
  vatRate: number;
  storeWide: number;
  storeWideActive: boolean;
  shipping: number;
  coupon: { type: "percent" | "fixed"; value: number; minSubtotal: number } | null;
  channel?: string;
  fulfillment?: string;
  lines: Array<{ id: string; nameEn: string; nameAr: string; sku: string; qty: number; price: number; sale: number | null | undefined; discount: number | null; variantId?: string }>;
}) {
  const quotedLines = input.lines.map((line) => {
    const original = line.price;
    let active = original;
    if (line.sale != null && line.sale < original) active = line.sale;
    else if (line.discount) active = original * (1 - line.discount / 100);
    return { ...line, original, active };
  });
  const totals = quoteTotals({
    lines: quotedLines.map((line) => ({ original: line.original, active: line.active, qty: line.qty })),
    storeWidePercent: input.storeWide,
    storeWideActive: input.storeWideActive,
    coupon: input.coupon,
    shipping: input.shipping,
    vatRate: input.vatRate,
    vatInclusive: true,
    currency: input.currency,
    commissionPercent: 2.5,
  });
  const orderId = newId();
  await db.insert(orders).values({
    id: orderId,
    tenantId: input.tenantId,
    number: input.number,
    customerId: input.customerId,
    customerName: input.name,
    phone: input.phone,
    email: input.email,
    fulfillment: input.fulfillment || "delivery",
    countryId: input.countryId,
    governorateId: input.govId,
    areaId: input.areaId,
    address: input.address,
    channel: input.channel || "web",
    status: input.status,
    paymentMethod: input.method,
    paymentStatus: input.paymentStatus,
    currency: input.currency,
    subtotal: totals.subtotal.toFixed(3),
    itemDiscount: totals.itemDiscount.toFixed(3),
    storeDiscount: totals.storeDiscount.toFixed(3),
    couponDiscount: totals.couponDiscount.toFixed(3),
    discountTotal: totals.discountTotal.toFixed(3),
    shippingTotal: totals.shipping.toFixed(3),
    vatTotal: totals.vat.toFixed(3),
    total: totals.total.toFixed(3),
    commissionAmount: totals.commission.toFixed(3),
    couponCode: input.coupon ? (input.coupon.type === "percent" ? "NOOR10" : "SUFRA5") : "",
    storeDiscountPercent: totals.storeDiscountPercent.toFixed(3),
    carrierName: input.shipping > 0 ? "Parcel" : "",
    notes: "",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });
  await db.insert(orderItems).values(
    quotedLines.map((line) => ({
      id: newId(),
      tenantId: input.tenantId,
      orderId,
      productId: line.id,
      variantId: line.variantId || null,
      nameEn: line.nameEn,
      nameAr: line.nameAr,
      sku: line.sku,
      qty: line.qty,
      originalPrice: line.original.toFixed(3),
      unitPrice: line.active.toFixed(3),
      lineDiscount: ((line.original - line.active) * line.qty).toFixed(3),
      lineTotal: (line.active * line.qty).toFixed(3),
    })),
  );
  void eq;
}
