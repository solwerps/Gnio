//src/app/api/users/route
import { NextResponse } from "next/server";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";
const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// GET: listar usuarios
export async function GET() {
  try {
    const users = await prisma.user.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(users);
  } catch (err) {
    console.error("Error en GET /api/users:", err);
    return NextResponse.json({ error: "Error cargando usuarios" }, { status: 500 });
  }
}

// POST: crear usuario
export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.password || data.password !== data.passwordConfirm) {
      return NextResponse.json({ error: "Contraseña inválida o no coincide" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        name: data.name ?? null,
        email: data.email,
        passwordHash,
        role: data.role as Role,
        phone: data.phone ?? null,
        companyName: data.companyName ?? null,
        nit: data.nit ?? null,
        dpi: data.dpi ?? null,
        appointmentDate: data.appointmentDate ? new Date(data.appointmentDate) : null,
        prestationType: data.prestationType ?? null,
        status: data.status ?? null,
        country: data.country ?? null,
        address: data.address ?? null,
        // 👇 NUEVO
        photoUrl: data.photoUrl ?? null,
        photoPublicId: data.photoPublicId ?? null,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("Error en POST /api/users:", err);
    return NextResponse.json({ error: "Error creando usuario" }, { status: 500 });
  }
}

// PUT: actualizar usuario (reemplazo de foto con borrado en Cloudinary)
export async function PUT(req: Request) {
  try {
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

    // 🚫 Proteger al admin principal (id=1)
    if (Number(data.id) === 1) {
      return NextResponse.json({ error: "El usuario admin principal no se puede editar." }, { status: 403 });
    }

    const {
      id,
      password,
      passwordConfirm,
      photoUrl,          // potencialmente NUEVO
      photoPublicId,     // potencialmente NUEVO
      oldPhotoPublicId,  // el anterior para borrar si cambió
      ...rest
    } = data;

    const updateData: any = { ...rest };

    if (rest.appointmentDate) updateData.appointmentDate = new Date(rest.appointmentDate);

    // contraseña opcional
    if (password) {
      if (password !== passwordConfirm) {
        return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // asignar nuevos metadatos de imagen si llegaron
    if (typeof photoUrl !== "undefined") updateData.photoUrl = photoUrl;
    if (typeof photoPublicId !== "undefined") updateData.photoPublicId = photoPublicId;

    // borrar anterior en Cloudinary si cambió el publicId
    if (photoPublicId && oldPhotoPublicId && oldPhotoPublicId !== photoPublicId) {
      try { await cloudinary.uploader.destroy(oldPhotoPublicId); } catch (e) { console.warn("destroy warn:", e); }
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("Error en PUT /api/users:", err);
    return NextResponse.json({ error: "Error actualizando usuario" }, { status: 500 });
  }
}

// DELETE: eliminar usuario (borra imagen si existe)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Falta ID" }, { status: 400 });

    if (Number(id) === 1) {
      return NextResponse.json({ error: "El usuario admin principal no se puede eliminar." }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (user?.photoPublicId) {
      try { await cloudinary.uploader.destroy(user.photoPublicId); } catch (e) { console.warn("destroy warn:", e); }
    }

    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Usuario eliminado" });
  } catch (err) {
    console.error("Error en DELETE /api/users:", err);
    return NextResponse.json({ error: "Error eliminando usuario" }, { status: 500 });
  }
}
