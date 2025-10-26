//dashboard/admin/regimen/iva/page,tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RegimenIvaTable from "@/components/RegimenIvaTable";
import { RegimenIvaFila } from "@/types/regimen-iva";

export default function RegimenIvaPage() {
  const router = useRouter();
  const pathname = usePathname();

  const [rows, setRows] = useState<RegimenIvaFila[]>([]);
  const [loading, setLoading] = useState(true);

  // ruta de edición robusta según dónde esté montada la vista actual
  const editHref = useMemo(() => {
    // ej: /dashboard/admin/regimen/iva  -> /dashboard/admin/regimen/iva/editar
    //     /dashboard/contador/regimen/iva -> /dashboard/contador/regimen/iva/editar
    return `${pathname}/editar`;
  }, [pathname]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/regimen/iva", { cache: "no-store" });
      const payload = await res.json();

      // Acepta { ok, data }, { rows }, o array directo.
      const arr: any[] = (payload?.data ?? payload?.rows ?? payload) || [];
      const withOrden = arr.map((r, i) => ({ ...r, orden: r.orden ?? i + 1 }));
      setRows(withOrden);
    } catch (e) {
      console.error("GET /api/regimen/iva failed", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = async () => {
    const ok = confirm(
      "¿Restablecer a valores de fábrica (semilla)? Esto reemplazará tu configuración actual."
    );
    if (!ok) return;

    try {
      const res = await fetch("/api/regimen/iva", { method: "DELETE" });
      if (!res.ok) throw new Error("RESET_FAILED");
      await load();
      alert("Régimen restablecido.");
    } catch (e) {
      console.error(e);
      alert("No se pudo restablecer.");
    }
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar role="ADMIN" />

      <main className="flex-1 bg-slate-100">
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-4xl font-bold mb-6">Regimen IVA</h1>

          {loading ? (
            <div className="text-slate-500">Cargando…</div>
          ) : (
            <RegimenIvaTable rows={rows} editable={false} />
          )}

          <div className="mt-6 flex gap-3">
            <button
              className="px-4 py-2 rounded bg-emerald-700 text-white"
              onClick={() => router.push(editHref)}
            >
              Editar Régimen
            </button>

            <button
              className="px-4 py-2 rounded bg-rose-600 text-white"
              onClick={reset}
            >
              Restablecer Régimen
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
