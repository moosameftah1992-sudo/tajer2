import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";

export type SessionKind = "platform" | "staff" | "customer";

export type SessionPayload = {
  sub: string;
  kind: SessionKind;
  role: string;
  tenantId: string | null;
  tv: number;
  exp: number;
};

const COOKIE = "tajer_session";

function appSecret() {
  return process.env.APP_SECRET || "tajer-dev-secret-change-me-32b";
}

function sign(value: string) {
  return createHmac("sha256", appSecret()).update(value).digest("base64url");
}

export function sealSession(payload: Omit<SessionPayload, "exp">, days = 12) {
  const full: SessionPayload = { ...payload, exp: Date.now() + days * 24 * 60 * 60 * 1000 };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function openSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    if (!payload.sub || !payload.kind) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readSession() {
  const jar = await cookies();
  return openSession(jar.get(COOKIE)?.value);
}

export async function cookieSecure() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") || "http";
  return proto.split(",")[0].trim() === "https";
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 12,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function encKey() {
  return scryptSync(appSecret(), "tajer-gateway-v1", 32);
}

export function encryptSecret(plain: string) {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${data.toString("hex")}`;
}

export function decryptSecret(payload: string) {
  if (!payload) return "";
  const [ivHex, tagHex, dataHex] = payload.split(".");
  if (!ivHex || !tagHex || !dataHex) return "";
  const decipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const out = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return out.toString("utf8");
}

export function maskSecret(payload: string) {
  const plain = decryptSecret(payload);
  if (!plain) return "";
  if (plain.length <= 4) return "••••";
  return `••••${plain.slice(-4)}`;
}

export function newId() {
  return crypto.randomUUID();
}

const loginAttempts = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.reset < now) {
    loginAttempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || "local";
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!host) return;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("BAD_ORIGIN");
  }
  if (originHost !== host) throw new Error("BAD_ORIGIN");
}
