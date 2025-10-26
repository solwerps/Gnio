// src/app/dashboard/contador/[usuario]/perfil/page.tsx
import Sidebar from "@/components/Sidebar";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

type PageParams = { params: { usuario: string } };

export default async function PerfilContadorPage({ params }: PageParams) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Solo CONTADOR
  if (session.user.role !== "CONTADOR") notFound();

  // Cargar el usuario autenticado desde DB (para obtener username real)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      role: true,
      photoUrl: true,
      name: true,
      email: true,
      phone: true,
      companyName: true,
      country: true,
      address: true,
      nit: true,
      dpi: true,
      appointmentDate: true,
      prestationType: true,
      status: true,
    },
  });

  if (!dbUser) notFound();

  // Si el slug no coincide con el username real → redirige al correcto
  if (params.usuario !== dbUser.username) {
    return redirect(`/dashboard/contador/${dbUser.username}/perfil`);
  }

  // Tenant por slug (entorno aislado)
  const tenant = await prisma.tenant.findUnique({
    where: { slug: dbUser.username },
    select: { id: true },
  });
  if (!tenant) notFound();

  // Tareas del usuario en este tenant
  const tareas = await prisma.tarea.findMany({
    where: { tenantId: tenant.id, userId: dbUser.id },
    orderBy: [{ estado: "asc" }, { fecha: "asc" }, { id: "asc" }],
    select: {
      id: true,
      titulo: true,
      estado: true,
      tipo: true,
      fecha: true,
      recordatorio: true,
      empresa: true, // <<-- CONTADOR usa EMPRESA
    },
  });

  // Serializar valores Date → string para el cliente
  const safeUser = {
    ...dbUser,
    appointmentDate: dbUser.appointmentDate
      ? dbUser.appointmentDate.toISOString()
      : null,
  };

  const safeTareas = tareas.map((t) => ({
    ...t,
    fecha: t.fecha ? t.fecha.toISOString() : null,
  }));

  return (
    <div className="flex">
      <Sidebar role="CONTADOR" usuario={dbUser.username} />
      <main className="flex-1 p-6 md:p-10 bg-gray-100 min-h-screen">
        <ProfileClient
          usuarioSlug={dbUser.username}
          user={safeUser as any}
          tareas={safeTareas as any}
        />
      </main>
    </div>
  );
}
