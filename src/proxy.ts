import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";

const RESERVED = new Set(["www", "admin", "platform", "api", "app", "static", "mail", "s", "assets"]);
const cache = new Map<string, { slug: string | null; exp: number }>();

function hostname(request: NextRequest) {
  const raw = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  return raw.split(",")[0].trim().split(":")[0].toLowerCase();
}

function platformHosts() {
  const extra = (process.env.PLATFORM_HOSTS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return new Set(["localhost", "127.0.0.1", "tajer.com", "www.tajer.com", "tajer.local", ...extra]);
}

function subdomainSlug(host: string) {
  const suffixes = [".localhost", ".tajer.com", ".tajer.local"];
  for (const suffix of suffixes) {
    if (!host.endsWith(suffix)) continue;
    const sub = host.slice(0, -suffix.length);
    if (!sub || sub.includes(".") || RESERVED.has(sub)) return null;
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(sub)) return null;
    return sub;
  }
  return null;
}

async function lookupHost(host: string) {
  const hit = cache.get(host);
  if (hit && hit.exp > Date.now()) return hit.slug;
  try {
    const result = await pool.query<{ slug: string }>(
      `select t.slug from tenant_domains d join tenants t on t.id = d.tenant_id where lower(d.host) = $1 and d.verified = true limit 1`,
      [host],
    );
    const slug = result.rows[0]?.slug ?? null;
    cache.set(host, { slug, exp: Date.now() + 15000 });
    return slug;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = hostname(request);
  const headers = new Headers(request.headers);
  headers.set("x-tajer-host", host);

  if (host === "admin.tajer.com" || host === "platform.tajer.com" || host === "admin.localhost") {
    const dest = url.clone();
    dest.pathname = url.pathname === "/" ? "/platform" : `/platform${url.pathname}`;
    headers.set("x-pathname", dest.pathname);
    return NextResponse.rewrite(dest, { request: { headers } });
  }

  const forced = request.headers.get("x-tajer-tenant");
  let slug = forced && !forced.includes(".") ? forced : subdomainSlug(host);
  let vanity = Boolean(slug);
  if (!slug && host && !platformHosts().has(host)) {
    slug = await lookupHost(host);
    vanity = Boolean(slug);
  }

  if (slug && !url.pathname.startsWith("/api") && !url.pathname.startsWith("/s/") && !url.pathname.startsWith("/_next")) {
    const dest = url.clone();
    dest.pathname = `/s/${slug}${url.pathname === "/" ? "" : url.pathname}`;
    headers.set("x-pathname", dest.pathname);
    headers.set("x-tajer-slug", slug);
    headers.set("x-tajer-vanity", "1");
    return NextResponse.rewrite(dest, { request: { headers } });
  }

  headers.set("x-pathname", url.pathname);
  headers.set("x-tajer-slug", slug || "");
  headers.set("x-tajer-vanity", vanity ? "1" : "0");
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/|.*\\..*).*)"],
};
