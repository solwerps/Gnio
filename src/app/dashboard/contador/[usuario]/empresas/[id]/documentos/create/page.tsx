//📄 src/app/dashboard/contador/[usuario]/empresas/[id]/documentos/create/page.tsx
"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import { ManualDocumentoForm } from "@/components/documentos/ManualDocumentoForm";
export default function Page() {
  // compat: a veces usas /dashboard/usuario/... a veces /dashboard/contador/...
  const p = useParams() as { usuario?: string; Usuarios?: string; id?: string };
  const usuario = String(p.usuario ?? p.Usuarios ?? "usuario");
  const empresaId = String(p.id ?? "");
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      {/* sidebar */}
      <div className="fixed left-0 top-0 hidden h-screen w-[260px] overflow-y-auto md:block">
        <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      </div>

      {/* contenido */}
      <main className="md:ml-[260px] px-4 sm:px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
         <button
              onClick={() =>
                router.push(`/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`)
              }
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              ← Regresar
            </button>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Facturas / Agregar Factura
          </h1>

          <p className="mt-2 text-neutral-500">
            Captura manual para la empresa #{empresaId}. Se guardará en la tabla <b>documentos</b>.
          </p>

          <div className="mt-6">
            <ManualDocumentoForm empresaId={empresaId} usuario={usuario} />
          </div>
        </div>
      </main>
    </div>
  );
}
