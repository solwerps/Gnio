//src/app/dashboard/contador/[usuario]/regimen/iva/editar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import RegimenIvaTable from "@/components/RegimenIvaTable";
import { RegimenIvaFila } from "@/types/regimen-iva";

const reindexGlobal = (arr: RegimenIvaFila[]) =>
  arr.map((r, i) => ({ ...r, orden: i + 1, idRegimen: i + 1 }));

const GROUP_ORDER = ["Primario", "PQ.C", "Pecuario", "IVA General"] as const;
type KnownGroup = (typeof GROUP_ORDER)[number];

const BTN_COLORS: Record<string, string> = {
  "Primario": "bg-amber-500 hover:bg-amber-600 focus:ring-amber-300",
  "PQ.C": "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300",
  "Pecuario": "bg-sky-600 hover:bg-sky-700 focus:ring-sky-300",
  "IVA General": "bg-fuchsia-600 hover:bg-fuchsia-700 focus:ring-fuchsia-300",
  "__default": "bg-violet-600 hover:bg-violet-700 focus:ring-violet-300",
};
const pill = (name: string) =>
  `inline-flex items-center gap-2 rounded-full px-4 py-2 text-white font-semibold shadow 
   transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${
     BTN_COLORS[name] ?? BTN_COLORS.__default
   }`;

export default function EditarRegimenIvaContadorPage() {
  const router = useRouter();
  const { usuario } = useParams<{ usuario: string }>();

  const [rows, setRows] = useState<RegimenIvaFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, RegimenIvaFila[]>();
    for (const r of rows) {
      const key = String(r.nombreComun || "").trim() || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const fixed = GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)!] as const);
    const rest = Array.from(map.entries())
      .filter(([k]) => !(GROUP_ORDER as readonly string[]).includes(k))
      .sort(([a], [b]) => a.localeCompare(b));
    return [...fixed, ...rest];
  }, [rows]);

  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/regimen/iva?tenant=${usuario}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await res.json();
      const arr: any[] = (payload?.data ?? payload?.rows ?? payload) || [];
      setRows(reindexGlobal(arr));
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [usuario]);

  const guardar = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/regimen/iva?tenant=${usuario}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filas: reindexGlobal(rows) }),
      });
      if (!res.ok) throw new Error("PUT_FAILED");
      alert("Régimen IVA guardado.");
      router.push(`/dashboard/contador/${usuario}/regimen/iva`);
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm("Esto restablecerá desde semilla. ¿Continuar?")) return;
    try {
      const res = await fetch(`/api/regimen/iva?tenant=${usuario}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("RESET_FAILED");
      await load();
      alert("Restablecido.");
    } catch (e) {
      console.error(e);
      alert("No se pudo restablecer.");
    }
  };

  const applyGroupSlice = (groupName: string, updatedSlice: RegimenIvaFila[]) => {
    setRows((prev) => {
      const others = prev.filter((r) => (String(r.nombreComun || "").trim() || "—") !== groupName);
      const merged = [...others, ...updatedSlice];
      const orderMap = new Map(prev.map((r, i) => [r, i] as const));
      merged.sort((a, b) => (orderMap.get(a)! - orderMap.get(b)!));
      return reindexGlobal(merged);
    });
  };

  const GroupTable = ({ name, slice }: { name: string; slice: RegimenIvaFila[] }) => (
    <div className="mt-3">
      <RegimenIvaTable
        rows={slice}
        editable
        setRows={(updated) => applyGroupSlice(name, updated)}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <Sidebar role="CONTADOR" usuario={String(usuario)} />
      <main className="flex-1 bg-slate-100">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Régimen IVA / Editar</h1>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded text-white bg-rose-600 hover:bg-rose-700"
                onClick={reset} disabled={loading}>
                Restablecer Régimen
              </button>
              <button className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700"
                onClick={guardar} disabled={loading || saving}>
                {saving ? "Guardando…" : "Guardar Régimen"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-slate-500">Cargando…</div>
          ) : (
            <div className="space-y-6">
              {groups.map(([name, slice]) => {
                const opened = !!open[name];
                return (
                  <section key={name} className="bg-white rounded-xl shadow p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-lg">{name}</div>
                      <button
                        className={pill(name)}
                        onClick={() => setOpen((p) => ({ ...p, [name]: !p[name] }))}
                      >
                        <span className={`inline-block transform transition-transform ${opened ? "rotate-90" : ""}`}>▶</span>
                        {opened ? "Ocultar" : "Desplegar"}
                      </button>
                    </div>
                    {opened && <GroupTable name={name} slice={slice} />}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
