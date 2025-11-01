//src/app/dashboard/contador/[Usuarios]/empresas/[id]/documentos/carga/page.tsx
// src/app/dashboard/contador/[Usuarios]/empresas/[id]/documentos/carga/page.tsx
import React from "react";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import UploadDocumentos from "@/components/Upload/UploadDocumentos";

// Next 15: params es Promise; desestrucutra con await
type Params = { Usuarios: string; id: string };

export default async function CargaDocumentosPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { Usuarios, id } = await params;

  return (
    <div className="min-h-screen">
      {/* Sidebar fijo */}
      <div className="fixed left-0 top-0 hidden h-screen w-[260px] overflow-y-auto md:block">
        <EmpresaSidebar empresaId={id} forceUsuario={Usuarios} />
      </div>

      {/* Contenido desplazado en desktop */}
      <div className="md:ml-[260px] px-4 py-6">
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="mb-1 text-sm text-neutral-500">
            VISTA: ➜ Dashboard/contador/[usuario]/empresas/[id]/documentos/carga/page.tsx
          </div>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight">
            Documentos / Carga Masiva de Documentos
          </h1>

          <UploadDocumentos empresaId={id} usuario={Usuarios} />
        </div>
      </div>
    </div>
  );
}
