// src/app/dashboard/contador/[usuario]/perfil/ProfileClient.tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type TaskEstado = "PRIORIDAD" | "PENDIENTE" | "EN_TRABAJO" | "REALIZADO";

type Tarea = {
  id: number;
  titulo: string;
  estado: TaskEstado;
  tipo?: string | null;
  fecha?: string | null; // ISO (guardamos T12:00:00Z para evitar desajustes)
  recordatorio: boolean;
  empresa?: string | null; // CONTADOR: Empresa
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

// ---- estados que sí disparan alerta
const ALERT_STATES = new Set<TaskEstado>(["PRIORIDAD", "PENDIENTE", "EN_TRABAJO"]);

export default function ProfileClient({
  usuarioSlug,
  user,
  tareas,
}: {
  usuarioSlug: string;
  user: UserView;
  tareas: Tarea[];
}) {
  const [tab, setTab] = useState<"PERFIL" | "ESPECIFICOS">("PERFIL");
  const [rows, setRows] = useState<Tarea[]>(tareas);
  const [savingRow, setSavingRow] = useState<number | null>(null);

  // ---- Toasts (para notificaciones en-app) ----
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string }[]>([]);
  function pushToast(title: string, body: string) {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }
  function dismissToast(id: string) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  // ---- Fila de "Nueva tarea" (totalmente editable) ----
  const emptyDraft = {
    titulo: "",
    estado: "PENDIENTE" as TaskEstado,
    tipo: "",
    fecha: "", // yyyy-mm-dd (control del input date)
    recordatorio: false,
    empresa: "",
  };
  const [draft, setDraft] = useState({ ...emptyDraft });

  // refs para enfocar al crear
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ---------- Utils de fecha ----------
  function isoToLocalYMD(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function ymdToStableISO(ymd: string) {
    if (!ymd) return null;
    return `${ymd}T12:00:00.000Z`;
  }

  // ---------- API helpers ----------
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
      case "PRIORIDAD":
        return "bg-rose-50 border-rose-300 text-rose-800";
      case "PENDIENTE":
        return "bg-amber-50 border-amber-300 text-amber-800";
      case "EN_TRABAJO":
        return "bg-sky-50 border-sky-300 text-sky-800";
      case "REALIZADO":
        return "bg-emerald-50 border-emerald-300 text-emerald-800";
      default:
        return "";
    }
  }
  function recordatorioColorClass(flag: boolean) {
    return flag
      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
      : "bg-rose-50 border-rose-300 text-rose-800";
  }
  function recordatorioInlineStyle(flag: boolean): CSSProperties {
    // Forzar color en selects (algunos navegadores ignoran el bg del select)
    return flag
      ? { backgroundColor: "#ecfdf5", borderColor: "#6ee7b7", color: "#065f46" }
      : { backgroundColor: "#fff1f2", borderColor: "#fda4af", color: "#9f1239" };
  }

  // ---------- Notificaciones ----------
  async function ensureNotifPermission() {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try {
      const p = await Notification.requestPermission();
      return p === "granted";
    } catch {
      return false;
    }
  }
  function prettyEstado(e: TaskEstado) {
    switch (e) {
      case "PRIORIDAD":
        return "Prioridad";
      case "PENDIENTE":
        return "Pendiente";
      case "EN_TRABAJO":
        return "En trabajo";
      case "REALIZADO":
        return "Finalizado";
      default:
        return e;
    }
  }

  // Solo dispara si recordatorio=Sí, estado válido, y (hoy/vencida/sin fecha)
  function notifyImmediate(t: Tarea) {
    if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
    const now = new Date();
    const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    if (t.fecha) {
      const ymdTask = isoToLocalYMD(t.fecha);
      if (ymdTask > ymdNow) return; // futuras no
    }
    const body =
      `Tarea: ${t.titulo || "(sin título)"}\n` +
      `Tipo: ${t.tipo || "—"}\n` +
      `Empresa: ${t.empresa || "—"}\n` +
      `Estado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
    pushToast("Recordatorio GNIO", body);
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification("Recordatorio GNIO", { body });
      } catch {}
    }
  }

  // ---------- Ordenamiento por estado/fecha ----------
  const estadoRank: Record<TaskEstado, number> = {
    PRIORIDAD: 0,
    PENDIENTE: 1,
    EN_TRABAJO: 2,
    REALIZADO: 3,
  };
  function cmpByDate(a?: string | null, b?: string | null) {
    if (!a && !b) return 0;
    if (!a) return 1; // null al final
    if (!b) return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  }
  function applySort(arr: Tarea[]): Tarea[] {
    return [...arr].sort((x, y) => {
      const er = estadoRank[x.estado] - estadoRank[y.estado];
      if (er !== 0) return er;
      const dr = cmpByDate(x.fecha, y.fecha);
      if (dr !== 0) return dr;
      return (x.titulo || "").localeCompare(y.titulo || "");
    });
  }

  // ---------- Acciones UI ----------
  async function createFromDraft() {
    const titulo = draft.titulo.trim();
    if (!titulo) {
      pushToast("Tarea incompleta", "Escribe un título antes de agregarla a la lista.");
      return;
    }

    try {
      const payload: Partial<Tarea> = {
        titulo,
        estado: draft.estado,
        tipo: draft.tipo || "",
        fecha: draft.fecha ? ymdToStableISO(draft.fecha) : null,
        recordatorio: !!draft.recordatorio,
        empresa: draft.empresa || "",
      };
      const created = await apiCreate(payload);
      setRows((curr) => applySort([created, ...curr]));
      setDraft({ ...emptyDraft });
      pushToast("Tarea creada", `Se agregó:\n${created.titulo}`);

      // enfocar la nueva fila creada
      setTimeout(() => {
        const el = inputRefs.current[created.id];
        el?.focus();
      }, 0);
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudo crear la tarea");
    }
  }

  async function delRow(row: Tarea) {
    if (!row.titulo || !row.titulo.trim()) return;
    if (!confirm("¿Estas seguro que quieres borrar esta tarea?")) return;
    try {
      await apiDelete(row.id);
      setRows((r) => r.filter((x) => x.id !== row.id));
      pushToast("Tarea eliminada", row.titulo);
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudo eliminar");
    }
  }

  async function patchRow(id: number, patch: Partial<Tarea>) {
    setSavingRow(id);
    try {
      const updated = await apiUpdate(id, patch);
      setRows((r) => applySort(r.map((x) => (x.id === id ? { ...x, ...updated } : x))));
    } catch (err: any) {
      pushToast("Error", err?.message || "No se pudieron guardar los cambios");
    } finally {
      setSavingRow(null);
    }
  }

  // ---------- Permiso + alerta al abrir ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      try {
        Notification.requestPermission().catch(() => {});
      } catch {}
    }
    // Notifica al abrir SOLO si recordatorio=Si y estado válido
    rows.forEach((t) => {
      if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;
      const body =
        `Tarea: ${t.titulo || "(sin título)"}\n` +
        `Tipo: ${t.tipo || "—"}\n` +
        `Empresa: ${t.empresa || "—"}\n` +
        `Estado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Pendientes GNIO", { body });
        } catch {}
      }
      pushToast("Pendientes GNIO", body);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Recordatorios cada hora (dedupe por hora) ----------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const ymdNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;
      const hour = now.getHours();

      rows.forEach((t) => {
        // SOLO si recordatorio=Si + estado válido
        if (!t.recordatorio || !ALERT_STATES.has(t.estado)) return;

        // Solo hoy, vencidas o sin fecha (no futuras)
        if (t.fecha) {
          const ymdTask = isoToLocalYMD(t.fecha);
          if (ymdTask > ymdNow) return;
        }

        // de-dup por hora
        const key = `tremh:${t.id}:${ymdNow}:${hour}`;
        if (localStorage.getItem(key)) return;

        const body =
          `Tarea: ${t.titulo || "(sin título)"}\n` +
          `Tipo: ${t.tipo || "—"}\n` +
          `Empresa: ${t.empresa || "—"}\n` +
          `Estado: ${prettyEstado(t.estado)}  ·  Fecha: ${t.fecha ? isoToLocalYMD(t.fecha) : "—"}`;

        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Pendientes GNIO", { body });
          } catch {}
        }
        pushToast("Pendientes GNIO", body);

        localStorage.setItem(key, "1");
      });
    }, 60_000); // corre cada minuto, pero solo notifica 1 vez por HORA por tarea

    return () => clearInterval(interval);
  }, [rows]);

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8 relative">
      {/* Tabs + Editar */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setTab("PERFIL")}
            className={`px-4 py-2 rounded-full font-semibold ${
              tab === "PERFIL" ? "bg-slate-300 text-black" : "hover:bg-slate-100"
            }`}
          >
            DATOS DEL PERFIL
          </button>
          <span className="text-slate-400 font-semibold">|</span>
          <button
            onClick={() => setTab("ESPECIFICOS")}
            className={`px-4 py-2 rounded-full font-semibold ${
              tab === "ESPECIFICOS" ? "bg-slate-300 text-black" : "hover:bg-slate-100"
            }`}
          >
            ESPECIFICOS DEL PERFIL
          </button>
        </div>
        <a
          href={`/dashboard/contador/${usuarioSlug}/perfil/editar`}
          className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700"
        >
          EDITAR PERFIL
        </a>
      </div>

      {/* Panel superior (foto + datos/específicos) */}
      <ProfileHeader tab={tab} user={user} />

      <hr className="my-4" />

      {/* LISTA DE TAREAS (todo en el mismo cuadro) */}
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
              <th className="p-2 border">Empresa</th>
            </tr>
          </thead>
          <tbody>
            {/* Fila de NUEVA TAREA */}
            <tr>
              <td className="p-2 border text-center">
                <button
                  onClick={createFromDraft}
                  disabled={!draft.titulo.trim()}
                  className={`px-2 py-1 rounded font-semibold ${
                    draft.titulo.trim()
                      ? "bg-green-700 text-white hover:bg-green-800"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  title="Añadir tarea"
                >
                  +
                </button>
              </td>
              <td className="p-2 border text-center">
                <button
                  disabled
                  className="px-2 py-1 rounded bg-gray-200 text-gray-400 cursor-not-allowed"
                  title="Borrar"
                >
                  🗑
                </button>
              </td>
              {/* Tarea */}
              <td className="p-2 border">
                <input
                  className="w-full px-2 py-1 border rounded"
                  value={draft.titulo}
                  onChange={(e) => setDraft((d) => ({ ...d, titulo: e.target.value }))}
                  placeholder="Nueva tarea"
                />
              </td>
              {/* Estado */}
              <td className="p-2 border">
                <select
                  className={`w-full px-2 py-1 border rounded ${estadoColorClass(draft.estado)}`}
                  value={draft.estado}
                  onChange={(e) => setDraft((d) => ({ ...d, estado: e.target.value as TaskEstado }))}
                >
                  <option value="PRIORIDAD">Prioridad</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_TRABAJO">En trabajo</option>
                  <option value="REALIZADO">Finalizado</option>
                </select>
              </td>
              {/* Tipo */}
              <td className="p-2 border">
                <input
                  className="w-full px-2 py-1 border rounded"
                  value={draft.tipo}
                  onChange={(e) => setDraft((d) => ({ ...d, tipo: e.target.value }))}
                  placeholder="Subir facturas / IVA / …"
                />
              </td>
              {/* Fecha */}
              <td className="p-2 border">
                <input
                  type="date"
                  className="px-2 py-1 border rounded"
                  value={draft.fecha}
                  onChange={(e) => setDraft((d) => ({ ...d, fecha: e.target.value }))}
                />
              </td>
              {/* Recordatorio */}
              <td className="p-2 border">
                <select
                  className={`w-full px-2 py-1 border rounded ${recordatorioColorClass(draft.recordatorio)}`}
                  style={recordatorioInlineStyle(draft.recordatorio)}
                  value={draft.recordatorio ? "Si" : "No"}
                  onChange={(e) => setDraft((d) => ({ ...d, recordatorio: e.target.value === "Si" }))}
                >
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </td>
              {/* Empresa */}
              <td className="p-2 border">
                <select
                  className="w-full px-2 py-1 border rounded"
                  value={draft.empresa}
                  onChange={(e) => setDraft((d) => ({ ...d, empresa: e.target.value }))}
                >
                  <option value="">Seleccionar empresa</option>
                  <option value="Todos">Todos</option>
                </select>
              </td>
            </tr>

            {/* Filas existentes */}
            {rows.map((r) => {
              const canDelete = !!(r.titulo && r.titulo.trim());
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border text-center" />
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => canDelete && delRow(r)}
                      disabled={!canDelete}
                      className={`px-2 py-1 rounded ${
                        canDelete
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      title="Eliminar tarea"
                    >
                      🗑
                    </button>
                  </td>

                  {/* Tarea */}
                  <td className="p-2 border">
                    <input
                      ref={(el) => (inputRefs.current[r.id] = el)}
                      className="w-full px-2 py-1 border rounded"
                      value={r.titulo}
                      onChange={(e) =>
                        setRows((arr) =>
                          arr.map((x) => (x.id === r.id ? { ...x, titulo: e.target.value } : x))
                        )
                      }
                      onBlur={(e) => patchRow(r.id, { titulo: e.currentTarget.value })}
                      placeholder="Describe la tarea…"
                    />
                  </td>

                  {/* Estado */}
                  <td className="p-2 border">
                    <select
                      className={`w-full px-2 py-1 border rounded ${estadoColorClass(r.estado)}`}
                      value={r.estado}
                      onChange={(e) => patchRow(r.id, { estado: e.target.value as TaskEstado })}
                    >
                      <option value="PRIORIDAD">Prioridad</option>
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="EN_TRABAJO">En trabajo</option>
                      <option value="REALIZADO">Finalizado</option>
                    </select>
                  </td>

                  {/* Tipo */}
                  <td className="p-2 border">
                    <input
                      className="w-full px-2 py-1 border rounded"
                      value={r.tipo ?? ""}
                      onChange={(e) =>
                        setRows((arr) => arr.map((x) => (x.id === r.id ? { ...x, tipo: e.target.value } : x)))
                      }
                      onBlur={(e) => patchRow(r.id, { tipo: e.currentTarget.value })}
                      placeholder="Subir facturas / IVA / …"
                    />
                  </td>

                  {/* Fecha */}
                  <td className="p-2 border">
                    <input
                      type="date"
                      className="px-2 py-1 border rounded"
                      value={isoToLocalYMD(r.fecha)}
                      onChange={async (e) => {
                        const v = e.target.value ? ymdToStableISO(e.target.value) : null;
                        await patchRow(r.id, { fecha: v });
                        notifyImmediate({ ...r, fecha: v } as Tarea);
                      }}
                    />
                  </td>

                  {/* Recordatorio */}
                  <td className="p-2 border">
                    <select
                      className={`w-full px-2 py-1 border rounded ${recordatorioColorClass(!!r.recordatorio)}`}
                      style={recordatorioInlineStyle(!!r.recordatorio)}
                      value={r.recordatorio ? "Si" : "No"}
                      onChange={async (e) => {
                        const val = e.target.value === "Si";
                        await ensureNotifPermission();
                        try {
                          await patchRow(r.id, { recordatorio: val });
                          notifyImmediate({ ...r, recordatorio: val } as Tarea);
                        } catch {
                          pushToast("Error", "No se pudo actualizar el recordatorio");
                        }
                      }}
                    >
                      <option value="Si">Si</option>
                      <option value="No">No</option>
                    </select>
                  </td>

                  {/* Empresa */}
                  <td className="p-2 border">
                    <select
                      className="w-full px-2 py-1 border rounded"
                      value={r.empresa ?? ""}
                      onChange={(e) => patchRow(r.id, { empresa: e.target.value })}
                    >
                      <option value="">Seleccionar empresa</option>
                      <option value="Todos">Todos</option>
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
                    <button className="underline" onClick={() => dismissToast(t.id)}>
                      Cerrar
                    </button>
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

/* ======= Subcomponentes ======= */
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
          <Field label="Empresa" value={user.companyName} />
          <Field label="Dirección" value={user.address} />
          <Field label="Pais" value={user.country} />
        </div>
      ) : (
        // ESPECÍFICOS CONTADOR (sin cambios)
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="NIT del Perito" value={user.nit} />
          <Field label="DPI" value={user.dpi} />
          <Field
            label="Fecha de Nombramiento"
            value={user.appointmentDate ? new Date(user.appointmentDate).toLocaleDateString() : ""}
          />
          <Field label="Tipo de Prestación" value={user.prestationType} />
          <Field label="Estado" value={user.status ?? "Activo"} />
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
