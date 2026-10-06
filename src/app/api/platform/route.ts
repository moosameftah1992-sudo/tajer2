import { NextResponse } from "next/server";
import { assertSameOrigin, readSession } from "@/lib/auth";
import { asError } from "@/lib/errors";
import {
  platformBundle,
  removeArea,
  removeCountry,
  removeGovernorate,
  removeProvider,
  resolveRenewal,
  saveArea,
  saveCountry,
  saveGovernorate,
  savePlatformAdmin,
  savePricing,
  saveProvider,
  setThemeActive,
  toggleCarrier,
  updatePlatformStore,
} from "@/lib/service";

export const dynamic = "force-dynamic";

function fail(error: unknown) {
  const known = asError(error);
  if (known) return NextResponse.json({ ok: false, code: known.code, error: known.code }, { status: known.status });
  console.error(error);
  return NextResponse.json({ ok: false, code: "SERVER", error: "SERVER" }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await platformBundle() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await readSession();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "save-admin") return NextResponse.json({ ok: true, ...(await savePlatformAdmin(session?.sub || "", body)) });
    if (action === "save-country") return NextResponse.json({ ok: true, ...(await saveCountry(body)) });
    if (action === "delete-country") {
      await removeCountry(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "save-governorate") return NextResponse.json({ ok: true, ...(await saveGovernorate(body)) });
    if (action === "delete-governorate") {
      await removeGovernorate(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "save-area") return NextResponse.json({ ok: true, ...(await saveArea(body)) });
    if (action === "delete-area") {
      await removeArea(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "update-store") {
      await updatePlatformStore(session?.sub || "", body);
      return NextResponse.json({ ok: true });
    }
    if (action === "save-pricing") {
      await savePricing(body);
      return NextResponse.json({ ok: true });
    }
    if (action === "save-provider") return NextResponse.json({ ok: true, ...(await saveProvider(body)) });
    if (action === "delete-provider") {
      await removeProvider(String(body.id || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "toggle-carrier") {
      await toggleCarrier(String(body.tenantId || ""), String(body.providerId || ""), Boolean(body.enabled));
      return NextResponse.json({ ok: true });
    }
    if (action === "resolve-renewal") {
      await resolveRenewal(session?.sub || "", String(body.id || ""), Boolean(body.approve));
      return NextResponse.json({ ok: true });
    }
    if (action === "set-theme") {
      await setThemeActive(String(body.id || ""), Boolean(body.active));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return fail(error);
  }
}
