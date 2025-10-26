// src/components/empresas/EmpresaSidebar.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Features = {
  documentos: { label: string; href: string }[];
  reportes: { href: string; caps?: any } | null;
  inventarios: { href: string } | null;
  libros: { href: string } | null;                  // lo ignoraremos (usaremos raw.flags)
  estados: { href: string } | null;                 // idem
  conciliacion: { href: string } | null;            // idem
  asientos: { href: string; crear: string } | null; // idem
};

// lo que realmente usamos: además de features necesitamos los flags crudos
type EntornoData = {
  empresaId: number;
  empresaNombre: string;
  features: Features;
  raw?: {
    flags?: Record<string, boolean>;
  };
};

type EntornoResponse = {
  ok: boolean;
  data: EntornoData;
};

export default function EmpresaSidebar({
  empresaId,
  forceUsuario,
}: {
  empresaId: number;
  forceUsuario: string;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const tenant = search.get("tenant") || forceUsuario;

  const [loading, setLoading] = useState(true);
  const [entorno, setEntorno] = useState<EntornoData | null>(null);

  // colapsables
  const [openDocs, setOpenDocs] = useState(true);
  const [openLibros, setOpenLibros] = useState(true);
  const [openAsientos, setOpenAsientos] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/empresas/${empresaId}/entorno?tenant=${tenant}`, { cache: "no-store" });
        const payload: EntornoResponse = await res.json();
        if (!alive) return;
        setEntorno(payload.data);
      } catch {
        if (!alive) return;
        setEntorno(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [empresaId, tenant]);

  const go = (sub: string) => {
    const qs = search.toString() ? `?${search.toString()}` : "";
    router.push(`/dashboard/contador/${tenant}/empresas/${empresaId}/${sub}${qs}`);
  };

  const goPlain = (path: string) => {
    const qs = search.toString() ? `?${search.toString()}` : "";
    router.push(`${path}${qs}`);
  };

  // ----- helpers de flags
  const F = entorno?.raw?.flags || {};

  const hasDocFacturas = !!F.presentaFacturas;
  const hasDocRetIVA = !!F.retencionIva;
  const hasDocRetISR = !!F.retencionIsr;

  const libroFlags = [
    F.libroCompras,
    F.libroVentas,
    F.libroDiario,
    F.libroDiarioDetalle,
    F.libroMayor,
    F.balanceGeneralEstadoResult,
  ].some(Boolean);

  const hasEstados = !!F.estadosFinancieros;
  const hasConciliacion = !!F.conciliacionBancaria;
  const hasAsientos = !!F.asientoContable;

  const hasReportes = !!F.retencionIva || !!F.retencionIsr;
  const hasInventarios = !!F.presentaInventarios;

  // si no hay nada aún
  const docsEmpty = !hasDocFacturas && !hasDocRetIVA && !hasDocRetISR;
  const librosEmpty = !libroFlags && !hasEstados && !hasConciliacion;

  return (
    <aside className="w-[260px] bg-[#081020] text-white min-h-screen p-4 flex flex-col gap-4">
      <h2 className="text-xl font-extrabold tracking-[0.2em]">SECA</h2>

      {/* Navegación fija */}
      <div className="space-y-2">
        <button
          onClick={() => goPlain(`/dashboard/contador/${tenant}/empresas`)}
          className="w-full text-left px-4 py-2 rounded-lg bg-[#1a2a4a] hover:bg-[#263a63] transition"
        >
          ← Regresar
        </button>

        <button
          onClick={() => go("")}
          className="w-full text-left px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition"
        >
          Dashboard
        </button>

        <button
          onClick={() => go("configurar")}
          className="w-full text-left px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition"
        >
          Configuraciones
        </button>
      </div>

      {/* DOCUMENTOS */}
      <div className="mt-2">
        <button
          onClick={() => setOpenDocs((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-[#0f1b34] text-white"
        >
          <span className="flex items-center gap-2">
            <span className="opacity-80">📁</span> Documentos
          </span>
          <span className="opacity-70">{openDocs ? "▾" : "▸"}</span>
        </button>

        <div
          className={`transition-[max-height,opacity] overflow-hidden ${
            openDocs ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mt-2 rounded-lg bg-[#131f3d] p-2 space-y-2">
            {loading && <div className="text-neutral-300 text-sm px-1 py-1 animate-pulse">Cargando…</div>}

            {!loading && docsEmpty && (
              <div className="text-neutral-400 text-sm px-2 py-1">No hay documentos habilitados</div>
            )}

            {!loading && hasDocFacturas && (
              <button
                onClick={() => go("documentos")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                Facturas
              </button>
            )}
            {!loading && hasDocRetIVA && (
              <button
                onClick={() => go("documentos/retenciones/iva")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                Retenciones IVA
              </button>
            )}
            {!loading && hasDocRetISR && (
              <button
                onClick={() => go("documentos/retenciones/isr")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                Retenciones ISR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LIBROS */}
      <div>
        <button
          onClick={() => setOpenLibros((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-[#0f1b34] text-white"
        >
          <span className="flex items-center gap-2">
            <span className="opacity-80">📄</span> Libros
          </span>
          <span className="opacity-70">{openLibros ? "▾" : "▸"}</span>
        </button>

        <div
          className={`transition-[max-height,opacity] overflow-hidden ${
            openLibros ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mt-2 rounded-lg bg-[#131f3d] p-2 space-y-2">
            {loading && <div className="text-neutral-300 text-sm px-1 py-1 animate-pulse">Cargando…</div>}

            {!loading && librosEmpty && (
              <div className="text-neutral-400 text-sm px-2 py-1">No hay libros habilitados</div>
            )}

            {!loading && libroFlags && (
              <button
                onClick={() => go("libros")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                Listado de Libros
              </button>
            )}

            {!loading && hasEstados && (
              <button
                onClick={() => go("libros/estados")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                EstadosFinancieros
              </button>
            )}

            {!loading && hasConciliacion && (
              <button
                onClick={() => go("libros/conciliacion")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                Conciliación Bancaria
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ASIENTOS CONTABLES */}
      {(!loading && hasAsientos) && (
        <div>
          <button
            onClick={() => setOpenAsientos((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-lg bg-[#0f1b34] text-white"
          >
            <span className="flex items-center gap-2">
              <span className="opacity-80">🗂️</span> Asientos contables
            </span>
            <span className="opacity-70">{openAsientos ? "▾" : "▸"}</span>
          </button>

          <div
            className={`transition-[max-height,opacity] overflow-hidden ${
              openAsientos ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="mt-2 rounded-lg bg-[#131f3d] p-2 space-y-2">
              <button
                onClick={() => go("asientos_contables")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                Buscador
              </button>
              <button
                onClick={() => go("asientos_contables/crear")}
                className="w-full text-left px-4 py-2 rounded-md bg-[#1d2b52] hover:bg-[#223364]"
              >
                Formulario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTONES SUELTOS */}
      {!loading && hasReportes && (
        <button
          onClick={() => go("reportes")}
          className="w-full text-left px-4 py-2 rounded-lg bg-[#0f1b34] hover:bg-[#17254b] transition"
        >
          📊 Reportes
        </button>
      )}

      {!loading && hasInventarios && (
        <button
          onClick={() => go("inventarios")}
          className="w-full text-left px-4 py-2 rounded-lg bg-[#0f1b34] hover:bg-[#17254b] transition"
        >
          📦 Inventarios
        </button>
      )}

      <div className="mt-auto">
        <button
          onClick={() => goPlain("/app/login")}
          className="w-full text-left px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
