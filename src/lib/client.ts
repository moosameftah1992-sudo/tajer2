export async function postJson<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { ok?: boolean; code?: string };
  if (!response.ok || data.ok === false) {
    const error = new Error(data.code || "SERVER") as Error & { code: string };
    error.code = data.code || "SERVER";
    throw error;
  }
  return data;
}

export function moneyInput(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}
