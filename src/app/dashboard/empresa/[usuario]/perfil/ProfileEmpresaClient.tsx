// src/app/dashboard/empresa/[usuario]/perfil/ProfileEmpresaClient.tsx
// ==============================

// ==============================
// File: src/app/dashboard/empresa/[usuario]/perfil/ProfileEmpresaClient.tsx
// ==============================
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TaskEstado = "PRIORIDAD" | "PENDIENTE" | "EN_TRABAJO" | "REALIZADO";

type Tarea = {
  id: number;
  titulo: string;
  estado: TaskEstado;
  tipo?: string | null;
  fecha?: string | null; // ISO (guardamos T12:00:00Z para evitar desajustes)
  recordatorio: boolean;
  empresa?: string | null; // usado como Sucursal en UI
};

type UserView = {
  id: number;
  photoUrl?: string | null;
  role: "ADMIN" | "CONTADOR" | "EMPRESA";
  username: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  country?: string | null;
  address?: string | null;
  nit?: string | null;
  dpi?: string | null;
  appointmentDate?: string | null;
  prestationType?: string | null;
  status?: string | null;
};

// Estados que disparan alertas
const ALERT_STATES = new Set<TaskEstado>(["PRIORIDAD", "PENDIENTE", "EN_TRABAJO"]);

export default function ProfileEmpresaClient({
  usuarioSlug,
  user,
  tareas,
}: {
  usuarioSlug: string;
  user: UserView;
  tareas: Tarea[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"PERFIL" | "ESPECIFICOS">("PERFIL");
  const [rows, setRows] = useState<Tarea[]>(tareas);
  const [savingRow, setSavingRow] = useState<number | null>(null);

  // ---- Toasts ----
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string }[]>([]);
  function pushToast(title: string, body: string) {
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    setToasts((t) => [...t, { id, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }
  function dismissToast(id: string) { setToasts((t) => t.filter((x) => x.id !== id)); }

  // ---- Draft "nueva tarea" ----
  const emptyDraft = {
    titulo: "",
    estado: "PENDIENTE" as TaskEstado,
    tipo: "",
    fecha: "",
    recordatorio: false,
    empresa: "", // UI: Sucursal
  };
  const [draft, setDraft] = useState({ ...emptyDraft });
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ---------- Utils fecha ----------
  function isoToLocalYMD(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function ymdToStableISO(ymd: string) { return ymd ? `${ymd}T12:00:00.000Z` : null; }

  // ---------- API helpers (con credenciales) ----------
  async function apiCreate(t: Partial<Tarea>) {
    const res = await fetch(`/api/tareas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant: usuarioSlug, tarea: t }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "No se pudo crear tarea");
    return j.data as Tarea;
  }
  async function apiUpdate(id: number, patch: Partial<Tarea>) {
    const res = await fetch(`/api/tareas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant: usuarioSlug, id, patch }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "No se pudo actualizar");
    return j.data as Tarea;
  }
  async function apiDelete(id: number) {
    const res = await fetch(`/api/tareas`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant: usuarioSlug, id }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "No se pudo eliminar");
  }

  // ---------- Estilos ----------
  function estadoColorClass(e: TaskEstado) {
    switch (e) {
      case "PRIORIDAD": return "bg-rose-50 border-rose-300 text-rose-800";
      case "PENDIENTE": return "bg-amber-50 border-amber-300 text-amber-800";
      case "EN_TRABAJO": return "bg-sky-50 border-sky-300 text-sky-800";
      case "REALIZADO": return "bg-emerald-50 border-emerald-300 text-emerald-800";
      default: return "";
    }
  }
  function recordatorioColorClass(flag: boolean) {
    return flag ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-rose-50 border-rose-300 text-rose-800";
  }
  function recordatorioInlineStyle(flag: boolean): React.CSSProperties {
    return flag
      ? { backgroundColor: "#ecfdf5", borderColor: "#6ee7b7", color: "#065f46" }
      : { backgroundColor: "#fff1f2", borderColor: "#fda4af", color: "#9f1239" };
  }

  // ---------- Notificaciones ----------
  async function ensureNotifPermission() {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try { return (await Notification.requestPermission()) === "granted"; } catch { return false; }
  }
  function prettyEstado(e: TaskEstado) {
    switch (e) {
      case "PRIORIDAD": return "Prioridad";
      case "PENDIENTE": return "Pendiente";
      case "EN_TRABAJO": return "En trabajo";
      case "REALIZADO": return "Finalizado";
      default: return e;
    }
  }
  function notifyImmediate(t: Tarea) {
    // Solo estados activos y hoy/vencidas/sin fecha y CON recordatorio=Si
    if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
    const now = new Date();
    const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (t.fecha) { const ymdTask = isoToLocalYMD(t.fecha); if (ymdTask > ymdNow) return; }
    const body = `Tarea: ${t.titulo || "(sin título)"}\nTipo: ${t.tipo || "—"}\nSucursal: ${t.empresa || "—"}\nEstado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
    pushToast("Recordatorio GNIO", body);
    if ("Notification" in window && Notification.permission === "granted") { try { new Notification("Recordatorio GNIO", { body }); } catch {} }
  }

  // ---------- Ordenamiento ----------
  const estadoRank: Record<TaskEstado, number> = { PRIORIDAD: 0, PENDIENTE: 1, EN_TRABAJO: 2, REALIZADO: 3 };
  function cmpByDate(a?: string | null, b?: string | null) {
    if (!a && !b) return 0; if (!a) return 1; if (!b) return -1; return new Date(a).getTime() - new Date(b).getTime();
  }
  function applySort(arr: Tarea[]): Tarea[] {
    return [...arr].sort((x, y) => {
      const er = estadoRank[x.estado] - estadoRank[y.estado]; if (er !== 0) return er;
      const dr = cmpByDate(x.fecha, y.fecha); if (dr !== 0) return dr;
      return (x.titulo || '').localeCompare(y.titulo || '');
    });
  }

  // ---------- Acciones UI ----------
  async function createFromDraft() {
    const titulo = draft.titulo.trim();
    if (!titulo) { pushToast("Tarea incompleta", "Escribe un título antes de agregarla a la lista."); return; }
    try {
      const payload: Partial<Tarea> = {
        titulo,
        estado: draft.estado,
        tipo: draft.tipo || "",
        fecha: draft.fecha ? ymdToStableISO(draft.fecha) : null,
        recordatorio: !!draft.recordatorio,
        empresa: draft.empresa || "", // UI: Sucursal
      };
      const created = await apiCreate(payload);
      setRows((curr) => applySort([created, ...curr]));
      setDraft({ ...emptyDraft });
      await ensureNotifPermission();
      pushToast("Creaste la tarea", `Tarea: ${created.titulo}\nEstado: ${prettyEstado(created.estado)}\nFecha: ${created.fecha ? isoToLocalYMD(created.fecha) : "—"}\nRecordatorio: ${created.recordatorio ? "Si" : "No"}`);
      setTimeout(() => { const el = inputRefs.current[created.id]; el?.focus(); }, 0);
      // refrescar server components (por si esta vista se rehidrata desde DB)
      router.refresh();
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudo crear la tarea");
    }
  }

  async function delRow(row: Tarea) {
    if (!row.titulo || !row.titulo.trim()) return;
    if (!confirm("¿Estas seguro que quieres borrar esta tarea?")) return;
    try { await apiDelete(row.id); setRows((r) => r.filter((x) => x.id !== row.id)); router.refresh(); pushToast("Tarea eliminada", row.titulo); }
    catch (err: any) { pushToast("Error", err?.message || "No se pudo eliminar"); }
  }

  async function patchRow(id: number, patch: Partial<Tarea>) {
    setSavingRow(id);
    try {
      const updated = await apiUpdate(id, patch);
      setRows((r) => applySort(r.map((x) => (x.id === id ? { ...x, ...updated } : x))));
      router.refresh();
    } catch (err: any) { pushToast("Error", err?.message || "No se pudieron guardar los cambios"); }
    finally { setSavingRow(null); }
  }

  // ---------- Permiso de notificaciones y alertas al abrir ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") { try { Notification.requestPermission().catch(() => {}); } catch {} }
    // Aviso al abrir (estados activos)
    const now = new Date();
    const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    rows.forEach((t) => {
      if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
      const body = `Tarea: ${t.titulo || "(sin título)"}\nTipo: ${t.tipo || "—"}\nSucursal: ${t.empresa || "—"}\nEstado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
      if ("Notification" in window && Notification.permission === "granted") { try { new Notification("Pendientes GNIO", { body }); } catch {} }
      pushToast("Pendientes GNIO", body);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Recordatorios cada hora (dedupe por hora) ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const hour = now.getHours();
      rows.forEach((t) => {
        if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
        if (t.fecha) { const ymdTask = isoToLocalYMD(t.fecha); if (ymdTask > ymdNow) return; }
        const key = `tremh:${t.id}:${ymdNow}:${hour}`;
        if (localStorage.getItem(key)) return;
        const body = `Tarea: ${t.titulo || "(sin título)"}\nTipo: ${t.tipo || "—"}\nSucursal: ${t.empresa || "—"}\nEstado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
        if ("Notification" in window && Notification.permission === "granted") { try { new Notification("Pendientes GNIO", { body }); } catch {} }
        pushToast("Pendientes GNIO", body);
        localStorage.setItem(key, "1");
      });
    }, 60_000); // corre cada minuto, notifica máx 1 vez por hora por tarea
    return () => clearInterval(interval);
  }, [rows]);

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 relative">
      {/* Tabs + Editar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setTab("PERFIL")} className={`px-4 py-2 rounded-full font-semibold ${tab === "PERFIL" ? "bg-slate-300 text-black" : "hover:bg-slate-100"}`}>DATOS DEL PERFIL</button>
          <span className="text-slate-400 font-semibold">|</span>
          <button onClick={() => setTab("ESPECIFICOS")} className={`px-4 py-2 rounded-full font-semibold ${tab === "ESPECIFICOS" ? "bg-slate-300 text-black" : "hover:bg-slate-100"}`}>ESPECIFICOS DEL PERFIL</button>
        </div>
        <a href={`/dashboard/empresa/${usuarioSlug}/perfil/editar`} className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700">EDITAR PERFIL</a>
      </div>

      {/* Panel superior (foto + datos/específicos) */}
      <ProfileHeader tab={tab} user={user} />

      <hr className="my-4" />

      {/* LISTA DE TAREAS */}
      <h2 className="text-2xl font-extrabold mb-1">LISTA DE TAREAS DEL MES</h2>
      <p className="text-slate-600 mb-4">Agrega tus pendientes y recordatorios aquí</p>

      <div className="overflow-x-auto border rounded bg-white shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="p-2 border text-center w-16">Añadir</th>
              <th className="p-2 border text-center w-20">Borrar</th>
              <th className="p-2 border">Tarea</th>
              <th className="p-2 border">Estado</th>
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Fecha</th>
              <th className="p-2 border">Recordatorio</th>
              <th className="p-2 border">Sucursal</th>
            </tr>
          </thead>
          <tbody>
            {/* Fila NUEVA */}
            <tr>
              <td className="p-2 border text-center">
                <button onClick={createFromDraft} disabled={!draft.titulo.trim()} className={`px-2 py-1 rounded font-semibold ${draft.titulo.trim() ? "bg-green-700 text-white hover:bg-green-800" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`} title="Añadir tarea">+</button>
              </td>
              <td className="p-2 border text-center">
                <button disabled className="px-2 py-1 rounded bg-gray-200 text-gray-400 cursor-not-allowed" title="Borrar">🗑</button>
              </td>
              <td className="p-2 border"><input className="w-full px-2 py-1 border rounded" value={draft.titulo} onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))} placeholder="Nueva tarea" /></td>
              <td className="p-2 border">
                <select className={`w-full px-2 py-1 border rounded ${estadoColorClass(draft.estado)}`} value={draft.estado} onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value as TaskEstado }))}>
                  <option value="PRIORIDAD">Prioridad</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_TRABAJO">En trabajo</option>
                  <option value="REALIZADO">Finalizado</option>
                </select>
              </td>
              <td className="p-2 border"><input className="w-full px-2 py-1 border rounded" value={draft.tipo} onChange={(e) => setDraft((d) => ({ ...d, tipo: e.target.value }))} placeholder="Subir facturas / IVA / …" /></td>
              <td className="p-2 border"><input type="date" className="px-2 py-1 border rounded" value={draft.fecha} onChange={(e) => setDraft((d) => ({ ...d, fecha: e.target.value }))} /></td>
              <td className="p-2 border">
                <select className={`w-full px-2 py-1 border rounded ${recordatorioColorClass(draft.recordatorio)}`} style={recordatorioInlineStyle(draft.recordatorio)} value={draft.recordatorio ? "Si" : "No"} onChange={(e) => setDraft((d) => ({ ...d, recordatorio: e.target.value === "Si" }))}>
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </td>
              <td className="p-2 border">
                <select className="w-full px-2 py-1 border rounded" value={draft.empresa} onChange={(e) => setDraft((d) => ({ ...d, empresa: e.target.value }))}>
                  <option value="">Seleccionar sucursal</option>
                  <option value="Central">Central</option>
                  <option value="Norte">Norte</option>
                  <option value="Sur">Sur</option>
                </select>
              </td>
            </tr>

            {/* Filas existentes */}
            {rows.map((r) => {
              const canDelete = !!(r.titulo && r.titulo.trim());
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center"></td>
                  <td className="p-2 border text-center">
                    <button onClick={() => canDelete && delRow(r)} disabled={!canDelete} className={`px-2 py-1 rounded ${canDelete ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`} title="Eliminar tarea">🗑</button>
                  </td>
                  <td className="p-2 border">
                    <input ref={(el) => (inputRefs.current[r.id] = el)} className="w-full px-2 py-1 border rounded" value={r.titulo} onChange={(e) => setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, titulo: e.target.value } : x)))} onBlur={(e) => patchRow(r.id, { titulo: e.currentTarget.value })} placeholder="Describe la tarea…" />
                  </td>
                  <td className="p-2 border">
                    <select className={`w-full px-2 py-1 border rounded ${estadoColorClass(r.estado)}`} value={r.estado} onChange={(e) => patchRow(r.id, { estado: e.target.value as TaskEstado })}>
                      <option value="PRIORIDAD">Prioridad</option>
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_TRABAJO">En trabajo</option>
                      <option value="REALIZADO">Finalizado</option>
                    </select>
                  </td>
                  <td className="p-2 border">
                    <input className="w-full px-2 py-1 border rounded" value={r.tipo ?? ""} onChange={(e) => setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, tipo: e.target.value } : x)))} onBlur={(e) => patchRow(r.id, { tipo: e.currentTarget.value })} placeholder="Subir facturas / IVA / …" />
                  </td>
                  <td className="p-2 border">
                    <input type="date" className="px-2 py-1 border rounded" value={isoToLocalYMD(r.fecha)} onChange={async (e) => { const v = e.target.value ? ymdToStableISO(e.target.value) : null; await patchRow(r.id, { fecha: v }); notifyImmediate({ ...r, fecha: v } as Tarea); }} />
                  </td>
                  <td className="p-2 border">
                    <select className={`w-full px-2 py-1 border rounded ${recordatorioColorClass(!!r.recordatorio)}`} style={recordatorioInlineStyle(!!r.recordatorio)} value={r.recordatorio ? "Si" : "No"}
                      onChange={async (e) => {
                        const val = e.target.value === "Si";
                        await ensureNotifPermission();
                        // Optimistic UI
                        const prev = r.recordatorio;
                        setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, recordatorio: val } : x)));
                        try { await patchRow(r.id, { recordatorio: val }); notifyImmediate({ ...r, recordatorio: val } as Tarea); }
                        catch { setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, recordatorio: prev } : x))); pushToast("Error", "No se pudo actualizar el recordatorio"); }
                      }}
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td className="p-2 border">
                    <select className="w-full px-2 py-1 border rounded" value={r.empresa ?? ""} onChange={(e) => patchRow(r.id, { empresa: e.target.value })}>
                      <option value="">Seleccionar sucursal</option>
                      <option value="Central">Central</option>
                      <option value="Norte">Norte</option>
                      <option value="Sur">Sur</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {savingRow && <div className="mt-3 text-xs text-slate-500">Guardando cambios…</div>}

      {/* Toasts visuales */}
      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-4 z-50 space-y-2 w-[92vw] max-w-sm">
          {toasts.map((t) => (
            <div key={t.id} className="rounded-xl shadow-lg bg-slate-900 text-white p-3 border border-slate-700">
              <div className="flex items-start gap-3">
                <div className="text-lg">🔔</div>
                <div className="flex-1">
                  <div className="font-semibold leading-tight">{t.title}</div>
                  <div className="text-sm whitespace-pre-line opacity-90">{t.body}</div>
                  <div className="mt-2 text-xs opacity-70">
                    <button className="underline" onClick={() => dismissToast(t.id)}>Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileHeader({ tab, user }: { tab: "PERFIL" | "ESPECIFICOS"; user: UserView }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="rounded-2xl bg-slate-100 h-48 grid place-items-center text-slate-500 overflow-hidden">
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoUrl} alt="Foto de perfil" className="w-full h-48 object-cover rounded-2xl" />
        ) : (
          "Foto de perfil"
        )}
      </div>

      {tab === "PERFIL" ? (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre" value={user.name} />
          <Field label="Usuario" value={user.username} />
          <Field label="Correo" value={user.email} />
          <Field label="Celular" value={user.phone} />
          <Field label="País" value={user.country} />
          <Field label="Dirección" value={user.address} />
        </div>
      ) : (
        // ESPECÍFICOS PARA EMPRESA (como pediste):
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre de la empresa" value={user.companyName} />
          <Field label="NIT" value={user.nit} />
          <Field label="DPI" value={user.dpi} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}:</div>
      <div className="font-medium">{value || "-"}</div>
    </div>
  );
}