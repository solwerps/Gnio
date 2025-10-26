// src/app/dashboard/contador/[usuario]/empresas/[id]/page.tsx
"use client";

import { useParams, useSearchParams } from "next/navigation";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";

export default function EmpresaDashboardPage() {
  const params = useParams<{ usuario: string; id: string }>();
  const search = useSearchParams();

  const empresaId = Number(params.id);
  const usuario = params.usuario;

  return (
    <div className="min-h-screen w-full flex bg-white">
      <EmpresaSidebar empresaId={empresaId} forceUsuario={String(usuario)} />

      <main className="flex-1 p-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="mt-6 text-lg">
          HOLA “{params.id}” Soy <span className="font-bold">GNIO</span> Bienvenido a tu entorno contable
        </p>
      </main>
    </div>
  );
}
