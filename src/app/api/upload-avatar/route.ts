import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("avatar") as File | null;
    const tenant = (form.get("tenant") as string) || "default";

    if (!file) {
      return NextResponse.json({ error: "Archivo 'avatar' requerido" }, { status: 400 });
    }

    const bytes  = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${bytes.toString("base64")}`;

    const up = await cloudinary.uploader.upload(base64, {
      folder: `gnio/${tenant}/avatars`,
      transformation: [{ width: 512, height: 512, crop: "limit" }],
    });

    return NextResponse.json({ url: up.secure_url, publicId: up.public_id }, { status: 201 });
  } catch (e: any) {
    console.error("Cloudinary upload error:", e?.message, e);
    return NextResponse.json({ error: e?.message || "No se pudo subir la imagen" }, { status: 500 });
  }
}
