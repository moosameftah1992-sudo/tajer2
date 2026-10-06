import { NextResponse } from "next/server";
import { asError } from "@/lib/errors";
import { applyLogisticsWebhook } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const raw = await request.text();
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const result = await applyLogisticsWebhook(code, raw, request.headers.get("x-tajer-signature"), payload);
    return NextResponse.json(result);
  } catch (error) {
    const known = asError(error);
    if (!known) console.error(error);
    return NextResponse.json({ ok: false, code: known?.code || "SERVER" }, { status: known?.status || 500 });
  }
}
