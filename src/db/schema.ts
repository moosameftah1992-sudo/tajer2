import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const platformUsers = pgTable("platform_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("manager"),
  permissions: jsonb("permissions").$type<Record<string, boolean>>().notNull(),
  active: boolean("active").notNull().default(true),
  tokenVersion: integer("token_version").notNull().default(1),
  createdAt: createdAt(),
});

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey(),
  monthlyPrice: numeric("monthly_price", { precision: 12, scale: 3 }).notNull().default("49"),
  yearlyPrice: numeric("yearly_price", { precision: 12, scale: 3 }).notNull().default("470"),
  billingCurrency: text("billing_currency").notNull().default("USD"),
  commissionPercent: numeric("commission_percent", { precision: 6, scale: 3 }).notNull().default("2.5"),
  trialDays: integer("trial_days").notNull().default(30),
  bankName: text("bank_name").notNull().default(""),
  accountName: text("account_name").notNull().default(""),
  iban: text("iban").notNull().default(""),
  instructionsEn: text("instructions_en").notNull().default(""),
  instructionsAr: text("instructions_ar").notNull().default(""),
  supportEmail: text("support_email").notNull().default("support@tajer.com"),
  updatedAt: updatedAt(),
});

export const countries = pgTable("countries", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  vatDefault: numeric("vat_default", { precision: 6, scale: 3 }).notNull().default("0"),
  vatInclusiveDefault: boolean("vat_inclusive_default").notNull().default(true),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const governorates = pgTable(
  "governorates",
  {
    id: text("id").primaryKey(),
    countryId: text("country_id").notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (table) => [index("governorates_country_idx").on(table.countryId)],
);

export const areas = pgTable(
  "areas",
  {
    id: text("id").primaryKey(),
    governorateId: text("governorate_id").notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (table) => [index("areas_governorate_idx").on(table.governorateId)],
);

export const themeCatalog = pgTable("theme_catalog", {
  id: text("id").primaryKey(),
  number: integer("number").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  industry: text("industry").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionAr: text("description_ar").notNull(),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const shippingProviders = pgTable("shipping_providers", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  descriptionEn: text("description_en").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  outboundUrl: text("outbound_url").notNull().default(""),
  webhookSecret: text("webhook_secret").notNull().default(""),
  active: boolean("active").notNull().default(true),
  configSchema: jsonb("config_schema").$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
});

export const tenants = pgTable(
  "tenants",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    industry: text("industry").notNull().default("boutique"),
    countryId: text("country_id").notNull(),
    governorateId: text("governorate_id").notNull(),
    currency: text("currency").notNull().default("BHD"),
    vatRate: numeric("vat_rate", { precision: 6, scale: 3 }).notNull().default("0"),
    vatInclusive: boolean("vat_inclusive").notNull().default(true),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    addressEn: text("address_en").notNull().default(""),
    addressAr: text("address_ar").notNull().default(""),
    aboutEn: text("about_en").notNull().default(""),
    aboutAr: text("about_ar").notNull().default(""),
    logoUrl: text("logo_url").notNull().default(""),
    faviconUrl: text("favicon_url").notNull().default(""),
    themeId: text("theme_id").notNull().default("t01"),
    themeConfig: jsonb("theme_config").$type<Record<string, unknown>>().notNull(),
    storeWideDiscountPercent: numeric("store_wide_discount_percent", { precision: 6, scale: 3 })
      .notNull()
      .default("0"),
    storeWideDiscountActive: boolean("store_wide_discount_active").notNull().default(false),
    plan: text("plan").notNull().default("trial"),
    status: text("status").notNull().default("active"),
    featured: boolean("featured").notNull().default(false),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true, mode: "date" }).notNull(),
    subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true, mode: "date" }).notNull(),
    orderSeq: integer("order_seq").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("tenants_country_idx").on(table.countryId),
    index("tenants_status_idx").on(table.status),
    index("tenants_subscription_idx").on(table.subscriptionEndsAt),
  ],
);

export const tenantDomains = pgTable(
  "tenant_domains",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    host: text("host").notNull(),
    type: text("type").notNull().default("subdomain"),
    verified: boolean("verified").notNull().default(false),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("tenant_domains_host_idx").on(table.host),
    index("tenant_domains_tenant_idx").on(table.tenantId),
  ],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull().default(""),
    role: text("role").notNull(),
    permissions: jsonb("permissions").$type<Record<string, boolean>>().notNull(),
    active: boolean("active").notNull().default(true),
    tokenVersion: integer("token_version").notNull().default(1),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("users_tenant_email_idx").on(table.tenantId, table.email),
    index("users_tenant_idx").on(table.tenantId),
    index("users_email_idx").on(table.email),
    index("users_role_idx").on(table.tenantId, table.role),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    slug: text("slug").notNull(),
    imageUrl: text("image_url").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    index("categories_tenant_idx").on(table.tenantId),
    uniqueIndex("categories_tenant_slug_idx").on(table.tenantId, table.slug),
  ],
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    categoryId: text("category_id"),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    descriptionEn: text("description_en").notNull().default(""),
    descriptionAr: text("description_ar").notNull().default(""),
    sku: text("sku").notNull().default(""),
    barcode: text("barcode").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 3 }).notNull(),
    salePrice: numeric("sale_price", { precision: 12, scale: 3 }),
    discountPercent: numeric("discount_percent", { precision: 6, scale: 3 }),
    imageUrl: text("image_url").notNull().default(""),
    images: jsonb("images").$type<string[]>().notNull(),
    stock: integer("stock").notNull().default(0),
    trackStock: boolean("track_stock").notNull().default(true),
    active: boolean("active").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    weightValue: numeric("weight_value", { precision: 12, scale: 3 }),
    weightUnit: text("weight_unit").notNull().default(""),
    purity: text("purity").notNull().default(""),
    unit: text("unit").notNull().default("piece"),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("products_tenant_idx").on(table.tenantId),
    index("products_tenant_category_idx").on(table.tenantId, table.categoryId),
    index("products_tenant_barcode_idx").on(table.tenantId, table.barcode),
    index("products_tenant_sku_idx").on(table.tenantId, table.sku),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    productId: text("product_id").notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    sku: text("sku").notNull().default(""),
    barcode: text("barcode").notNull().default(""),
    price: numeric("price", { precision: 12, scale: 3 }),
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (table) => [
    index("variants_tenant_idx").on(table.tenantId),
    index("variants_product_idx").on(table.productId),
    index("variants_tenant_barcode_idx").on(table.tenantId, table.barcode),
  ],
);

export const mediaFolders = pgTable(
  "media_folders",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    parentId: text("parent_id"),
    createdAt: createdAt(),
  },
  (table) => [index("media_folders_tenant_idx").on(table.tenantId)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    folderId: text("folder_id"),
    url: text("url").notNull(),
    filename: text("filename").notNull(),
    mime: text("mime").notNull().default("image/jpeg"),
    size: integer("size").notNull().default(0),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [index("media_assets_tenant_idx").on(table.tenantId)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    code: text("code").notNull(),
    type: text("type").notNull(),
    value: numeric("value", { precision: 12, scale: 3 }).notNull(),
    active: boolean("active").notNull().default(true),
    minSubtotal: numeric("min_subtotal", { precision: 12, scale: 3 }).notNull().default("0"),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("coupons_tenant_code_idx").on(table.tenantId, table.code),
    index("coupons_tenant_idx").on(table.tenantId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    number: text("number").notNull(),
    customerId: text("customer_id"),
    customerName: text("customer_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    fulfillment: text("fulfillment").notNull().default("delivery"),
    tableId: text("table_id"),
    tableName: text("table_name").notNull().default(""),
    countryId: text("country_id"),
    governorateId: text("governorate_id"),
    areaId: text("area_id"),
    address: text("address").notNull().default(""),
    channel: text("channel").notNull().default("web"),
    status: text("status").notNull().default("pending"),
    paymentMethod: text("payment_method").notNull().default("cash"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    currency: text("currency").notNull(),
    subtotal: numeric("subtotal", { precision: 12, scale: 3 }).notNull(),
    itemDiscount: numeric("item_discount", { precision: 12, scale: 3 }).notNull().default("0"),
    storeDiscount: numeric("store_discount", { precision: 12, scale: 3 }).notNull().default("0"),
    couponDiscount: numeric("coupon_discount", { precision: 12, scale: 3 }).notNull().default("0"),
    discountTotal: numeric("discount_total", { precision: 12, scale: 3 }).notNull().default("0"),
    shippingTotal: numeric("shipping_total", { precision: 12, scale: 3 }).notNull().default("0"),
    vatTotal: numeric("vat_total", { precision: 12, scale: 3 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 3 }).notNull(),
    commissionAmount: numeric("commission_amount", { precision: 12, scale: 3 }).notNull().default("0"),
    couponCode: text("coupon_code").notNull().default(""),
    storeDiscountPercent: numeric("store_discount_percent", { precision: 6, scale: 3 }).notNull().default("0"),
    carrierId: text("carrier_id"),
    carrierName: text("carrier_name").notNull().default(""),
    trackingNumber: text("tracking_number").notNull().default(""),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("orders_tenant_number_idx").on(table.tenantId, table.number),
    index("orders_tenant_idx").on(table.tenantId),
    index("orders_tenant_status_idx").on(table.tenantId, table.status),
    index("orders_tenant_created_idx").on(table.tenantId, table.createdAt),
    index("orders_customer_idx").on(table.customerId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    orderId: text("order_id").notNull(),
    productId: text("product_id"),
    variantId: text("variant_id"),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    sku: text("sku").notNull().default(""),
    qty: integer("qty").notNull(),
    originalPrice: numeric("original_price", { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 3 }).notNull(),
    lineDiscount: numeric("line_discount", { precision: 12, scale: 3 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 12, scale: 3 }).notNull(),
  },
  (table) => [
    index("order_items_tenant_idx").on(table.tenantId),
    index("order_items_order_idx").on(table.orderId),
  ],
);

export const paymentGateways = pgTable(
  "payment_gateways",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    provider: text("provider").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    merchantId: text("merchant_id").notNull().default(""),
    apiKeyEnc: text("api_key_enc").notNull().default(""),
    secretEnc: text("secret_enc").notNull().default(""),
    apiBaseUrl: text("api_base_url").notNull().default(""),
    sandbox: boolean("sandbox").notNull().default(true),
    extra: jsonb("extra").$type<Record<string, unknown>>().notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("gateways_tenant_provider_idx").on(table.tenantId, table.provider),
    index("gateways_tenant_idx").on(table.tenantId),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    orderId: text("order_id").notNull(),
    provider: text("provider").notNull(),
    amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    reference: text("reference").notNull().default(""),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("payments_tenant_idx").on(table.tenantId),
    index("payments_order_idx").on(table.orderId),
  ],
);

export const tenantCarriers = pgTable(
  "tenant_carriers",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    providerId: text("provider_id").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    credentialsEnc: text("credentials_enc").notNull().default(""),
    notes: text("notes").notNull().default(""),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("tenant_carriers_unique_idx").on(table.tenantId, table.providerId),
    index("tenant_carriers_tenant_idx").on(table.tenantId),
  ],
);

export const shippingRates = pgTable(
  "shipping_rates",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    providerId: text("provider_id"),
    countryId: text("country_id").notNull(),
    governorateId: text("governorate_id"),
    areaId: text("area_id"),
    price: numeric("price", { precision: 12, scale: 3 }).notNull(),
    etaEn: text("eta_en").notNull().default(""),
    etaAr: text("eta_ar").notNull().default(""),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    index("shipping_rates_tenant_idx").on(table.tenantId),
    index("shipping_rates_geo_idx").on(table.tenantId, table.countryId, table.governorateId, table.areaId),
  ],
);

export const restaurantTables = pgTable(
  "restaurant_tables",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    seats: integer("seats").notNull().default(4),
    zone: text("zone").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("tables_tenant_code_idx").on(table.tenantId, table.code),
    index("tables_tenant_idx").on(table.tenantId),
  ],
);

export const renewalRequests = pgTable(
  "renewal_requests",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    plan: text("plan").notNull(),
    amount: numeric("amount", { precision: 12, scale: 3 }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("pending"),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "date" }),
    resolvedBy: text("resolved_by"),
  },
  (table) => [index("renewal_requests_tenant_idx").on(table.tenantId), index("renewal_requests_status_idx").on(table.status)],
);

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    type: text("type").notNull(),
    note: text("note").notNull().default(""),
    previousEndsAt: timestamp("previous_ends_at", { withTimezone: true, mode: "date" }),
    newEndsAt: timestamp("new_ends_at", { withTimezone: true, mode: "date" }),
    actorId: text("actor_id"),
    createdAt: createdAt(),
  },
  (table) => [index("subscription_events_tenant_idx").on(table.tenantId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id"),
    actorId: text("actor_id").notNull().default(""),
    actorKind: text("actor_kind").notNull().default(""),
    action: text("action").notNull(),
    entity: text("entity").notNull().default(""),
    entityId: text("entity_id").notNull().default(""),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("audit_logs_tenant_idx").on(table.tenantId), index("audit_logs_created_idx").on(table.createdAt)],
);
