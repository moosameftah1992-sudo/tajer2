import { NextResponse } from "next/server";
import { assertSameOrigin, clearSessionCookie, clientKey, rateLimit, readSession, sealSession, setSessionCookie } from "@/lib/auth";
import { asError } from "@/lib/errors";
import { loginCustomer, loginPlatform, loginStaff, registerCustomer, registerStore } from "@/lib/service";

export const dynamic = "force-dynamic";

function fail(error: unknown) {
  const known = asError(error);
  if (known) return NextResponse.json({ ok: false, code: known.code, error: known.code }, { status: known.status });
  console.error(error);
  return NextResponse.json({ ok: false, code: "SERVER", error: "SERVER" }, { status: 500 });
}

export async function GET() {
  const session = await readSession();
  return NextResponse.json({
    ok: true,
    session: session ? { kind: session.kind, role: session.role, tenantId: session.tenantId, sub: session.sub } : null,
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "logout") {
      await clearSessionCookie();
      return NextResponse.json({ ok: true });
    }
    const key = `${clientKey(request)}:${action}:${String(body.email || "")}`;
    if (!rateLimit(key)) return NextResponse.json({ ok: false, code: "RATE_LIMIT", error: "RATE_LIMIT" }, { status: 429 });
    if (action === "register-store") {
      const created = await registerStore(body);
      await setSessionCookie(sealSession({ sub: created.userId, kind: "staff", role: "store_owner", tenantId: created.tenantId, tv: 1 }));
      return NextResponse.json({ ok: true, slug: created.slug });
    }
    if (action === "login") {
      const result = await loginStaff(String(body.email || ""), String(body.password || ""), body.slug ? String(body.slug) : undefined);
      await setSessionCookie(sealSession({ sub: result.user.id, kind: "staff", role: result.user.role, tenantId: result.user.tenantId, tv: result.user.tokenVersion }));
      return NextResponse.json({ ok: true, slug: result.tenant?.slug, role: result.user.role });
    }
    if (action === "platform-login") {
      const user = await loginPlatform(String(body.email || ""), String(body.password || ""));
      await setSessionCookie(sealSession({ sub: user.id, kind: "platform", role: user.role, tenantId: null, tv: user.tokenVersion }));
      return NextResponse.json({ ok: true });
    }
    if (action === "customer-login") {
      const result = await loginCustomer(String(body.slug || ""), String(body.email || ""), String(body.password || ""));
      await setSessionCookie(sealSession({ sub: result.user.id, kind: "customer", role: "customer", tenantId: result.tenant.id, tv: result.user.tokenVersion }));
      return NextResponse.json({ ok: true });
    }
    if (action === "customer-register") {
      const result = await registerCustomer(String(body.slug || ""), body);
      await setSessionCookie(sealSession({ sub: result.id, kind: "customer", role: "customer", tenantId: result.tenant.id, tv: 1 }));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, code: "NOT_FOUND", error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}
