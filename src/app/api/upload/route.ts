import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { newId } from "@/lib/auth";
import { asError, AppError } from "@/lib/errors";
import { recordAsset, requireStaff } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const slug = String(form.get("slug") || "");
    const file = form.get("file");
    const folderId = String(form.get("folderId") || "");
    const { tenant } = await requireStaff(slug, "media");
    if (!(file instanceof File)) throw new AppError("FILE");
    if (file.size <= 0 || file.size > 8 * 1024 * 1024) throw new AppError("FILE");
    const source = Buffer.from(await file.arrayBuffer());
    const image = sharp(source, { failOn: "none" }).rotate();
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp", "jpg"].includes(meta.format)) throw new AppError("FILE");
    const output = await image.resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    const info = await sharp(output).metadata();
    const id = newId();
    const dir = path.join(process.cwd(), "public", "uploads", tenant.id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${id}.jpg`), output);
    const url = `/uploads/${tenant.id}/${id}.jpg`;
    const saved = await recordAsset(tenant.id, {
      url,
      filename: file.name.slice(0, 180) || `${id}.jpg`,
      mime: "image/jpeg",
      size: output.length,
      width: info.width || 0,
      height: info.height || 0,
      folderId: folderId || null,
    });
    return NextResponse.json({ ok: true, ...saved, width: info.width || 0, height: info.height || 0 });
  } catch (error) {
    const known = asError(error);
    if (!known) console.error(error);
    return NextResponse.json({ ok: false, code: known?.code || "FILE" }, { status: known?.status || 400 });
  }
}
