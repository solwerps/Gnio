"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
  type DraggableProvided,
} from "@hello-pangea/dnd";

type DocRow = {
  uuid: string;
  fecha_emision: string | null;
  fecha_anulacion: string | null;
  numero_autorizacion: string | null;
  numero_dte: string;
  serie: string | null;
  nit_emisor: string | null;
  nombre_emisor: string | null;
  moneda: string;
  monto_total: number;
  monto_bien: number;
  monto_servicio: number;
  iva: number;
  petroleo: number;
  turismo_hospedaje: number;
  turismo_pasajes: number;
  timbre_prensa: number;
  bomberos: number;
  tasa_municipal: number;
  bebidas_alcoholicas: number;
  tabaco: number;
  cemento: number;
  bebidas_no_alcoholicas: number;
  tarifa_portuaria: number;
  tipo_operacion: "compra" | "venta";
  tipo_dte: string;
  cuenta_debe: string | null;
  cuenta_haber: string | null;
  tipo: string | null;
};

type CuentaOption = { value: string; label: string; nivel: number };

function monthPretty(ym: string) {
  try {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-GT", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return ym;
  }
}

export default function Page() {
  const p = useParams() as { usuarios?: string; id?: string };
  const usuario = String(p.usuarios ?? "usuario");
  const empresaId = String(p.id ?? "");
  const router = useRouter();

  // Filtros
  const [operacion, setOperacion] = useState<"compra" | "venta">("venta");
  const [mes, setMes] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Columnas
  const [leftItems, setLeftItems] = useState<DocRow[]>([]);
  const [rightItems, setRightItems] = useState<DocRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Nomenclatura / cuentas
  const [cuentas, setCuentas] = useState<CuentaOption[]>([]);
  const [cuentaDebe, setCuentaDebe] = useState("");
  const [cuentaDebe2, setCuentaDebe2] = useState(""); // ✅ ahora visible y funcional
  const [cuentaHaber, setCuentaHaber] = useState("");

  const [fechaRect, setFechaRect] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      try {
        const r1 = await fetch(`/api/empresas/${empresaId}`, { cache: "no-store" });
        await r1.json();
      } catch {}
    })();
  }, [empresaId]);

  // Cargar nomenclatura
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      try {
        const r1 = await fetch(`/api/empresas/${empresaId}/nomenclatura`, { cache: "no-store" });
        const j1 = await r1.json();
        if (!j1?.nomenclaturaLocalId) return setCuentas([]);
        const r2 = await fetch(`/api/nomenclaturas/${j1.nomenclaturaLocalId}`, { cache: "no-store" });
        const j2 = await r2.json();
        const list = Array.isArray(j2?.data?.cuentas) ? j2.data.cuentas : [];
        setCuentas(
          list.map((c: any) => ({
            value: String(c.id),
            label: `${c.descripcion || ""} (${c.cuenta || ""})`,
            nivel: Number(c.nivel ?? 1),
          }))
        );
      } catch {
        setCuentas([]);
      }
    })();
  }, [empresaId]);

  // Traer docs luego de confirmar
  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const q = new URLSearchParams({ empresaId, mes, operacion });
      const r = await fetch(`/api/documentos?${q.toString()}`, { cache: "no-store" });
      const j = await r.json();

      const list =
        (Array.isArray(j) && j) ||
        (Array.isArray(j?.data) && j.data) ||
        (Array.isArray(j?.data?.data) && j.data.data) ||
        (j?.ok && Array.isArray(j?.data?.data) && j.data.data) ||
        [];

      setLeftItems(list as DocRow[]);
      setRightItems([]);
    } catch {
      setLeftItems([]);
      setRightItems([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Totales con rightItems
  const totals = useMemo(
    () =>
      rightItems.reduce(
        (acc, it) => {
          if (it.fecha_anulacion) return acc;
          acc.montoTotal += it.monto_total || 0;
          acc.montoBienes += it.monto_bien || 0;
          acc.montoServicios += it.monto_servicio || 0;
          acc.iva += it.iva || 0;
          acc.descuentos +=
            (it.petroleo || 0) +
            (it.turismo_hospedaje || 0) +
            (it.turismo_pasajes || 0) +
            (it.timbre_prensa || 0) +
            (it.bomberos || 0) +
            (it.tasa_municipal || 0) +
            (it.bebidas_alcoholicas || 0) +
            (it.tabaco || 0) +
            (it.cemento || 0) +
            (it.bebidas_no_alcoholicas || 0) +
            (it.tarifa_portuaria || 0);
          if (it.tipo === "combustibles")
            acc.combustibles += (it.monto_bien || 0) + (it.monto_servicio || 0);
          if (it.tipo_dte === "FPEQ")
            acc.fpeq += (it.monto_bien || 0) + (it.monto_servicio || 0);
          return acc;
        },
        { montoTotal: 0, montoBienes: 0, montoServicios: 0, iva: 0, descuentos: 0, combustibles: 0, fpeq: 0 }
      ),
    [rightItems]
  );

  // DnD: solo izquierda -> derecha; al mover elimina del izquierdo
  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === "right" && destination.droppableId === "left") return;

    if (source.droppableId === destination.droppableId) {
      if (source.droppableId === "left") {
        const list = [...leftItems];
        const [moved] = list.splice(source.index, 1);
        list.splice(destination.index, 0, moved);
        setLeftItems(list);
      } else {
        const list = [...rightItems];
        const [moved] = list.splice(source.index, 1);
        list.splice(destination.index, 0, moved);
        setRightItems(list);
      }
      return;
    }

    if (source.droppableId === "left" && destination.droppableId === "right") {
      const src = [...leftItems];
      const dst = [...rightItems];
      const [moved] = src.splice(source.index, 1);
      if (!dst.find((x) => x.uuid === moved.uuid)) {
        dst.splice(destination.index, 0, moved);
      }
      setLeftItems(src);
      setRightItems(dst);
    }
  };

  // Enviar actualización (fecha_emision + cuentas)
  const handleSubmit = async () => {
    if (!rightItems.length) return alert("No hay documentos en 'Facturas a actualizar'.");
    if (!fechaRect) return alert("Elige una fecha válida.");

    setSaving(true);
    try {
      const payload = {
        empresa_id: Number(empresaId),
        operacion_tipo: operacion,
        fecha_emision: fechaRect,                 // <- cambia fecha de emisión en DB
        documentos: rightItems.map((d) => ({ uuid: d.uuid })),
        cuenta_debe:  cuentaDebe  || null,
        cuenta_debe2: cuentaDebe2 || null,        // ✅ ahora se envía siempre
        cuenta_haber: cuentaHaber || null,
      };

      const r = await fetch("/api/documentos/rectificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || j.status >= 400) {
        alert(j.message || "No se pudo actualizar los documentos");
        return;
      }
      alert("Documentos actualizados correctamente");

      setRightItems([]);
      await fetchDocs();
    } catch (e: any) {
      alert(e?.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      <div className="fixed left-0 top-0 hidden h-screen w-[260px] overflow-y-auto md:block">
        <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      </div>

      <main className="md:ml-[260px] px-4 sm:px-6 py-6">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Facturas / Rectificación
            </h1>
            <button
              onClick={() =>
                router.push(`/dashboard/contador/${usuario}/empresas/${empresaId}/documentos`)
              }
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              ← Regresar
            </button>
          </div>

          {/* Barra superior */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[260px]">
              <label className="text-sm font-semibold text-neutral-700">
                Selecciona el tipo de Operación de los documentos:
              </label>
              <select
                value={operacion}
                onChange={(e) => setOperacion(e.target.value as "compra" | "venta")}
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="venta">Venta</option>
                <option value="compra">Compra</option>
              </select>
            </div>

            <div className="min-w-[200px]">
              <label className="text-sm font-semibold text-neutral-700">Selecciona la fecha:</label>
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <button
              onClick={() => setConfirmOpen(true)}
              disabled={loadingDocs}
              className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingDocs ? "Cargando..." : "Confirmar información"}
            </button>
          </div>

          {/* Columnas */}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid gap-5 md:grid-cols-2">
              <Droppable droppableId="left">
                {(provided) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="rounded-2xl bg-white p-4 shadow-sm h-[56vh] min-h-[520px] overflow-y-auto"
                  >
                    <h2 className="text-center text-2xl font-semibold mb-3">Facturas:</h2>
                    {leftItems.map((item, index) => (
                      <Draggable key={item.uuid} draggableId={item.uuid} index={index}>
                        {(dragProvided: DraggableProvided) => (
                          <article
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="mb-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
                          >
                            <p className="text-xs text-neutral-500">
                              Fecha de emisión:{" "}
                              <span className="font-medium">
                                {item.fecha_emision
                                  ? new Date(item.fecha_emision).toLocaleDateString("es-GT")
                                  : "—"}
                              </span>
                            </p>
                            <p className="text-xs text-neutral-500">
                              Serie: <span className="font-medium">{item.serie || "—"}</span>
                            </p>
                            <p className="text-xs text-neutral-500">
                              Número de DTE: <span className="font-medium">{item.numero_dte}</span>
                            </p>
                            <p className="mt-1 text-sm font-semibold text-neutral-800">
                              {item.nombre_emisor}{" "}
                              <span className="text-xs text-neutral-500">({item.nit_emisor})</span>
                            </p>
                            <p className="text-xs">Cuenta Debe: <span className="font-medium">{item.cuenta_debe || "—"}</span></p>
                            <p className="text-xs">Cuenta Haber: <span className="font-medium">{item.cuenta_haber || "—"}</span></p>
                            <p className="mt-1 text-sm">
                              Monto Total:{" "}
                              <span className="font-bold text-emerald-600">
                                Q{(item.monto_total || 0).toFixed(2)}
                              </span>
                            </p>
                          </article>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {!leftItems.length && !loadingDocs && (
                      <p className="text-center text-sm text-neutral-400">
                        No hay documentos para ese filtro.
                      </p>
                    )}
                  </section>
                )}
              </Droppable>

              <Droppable droppableId="right">
                {(provided) => (
                  <section
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="rounded-2xl bg-white p-4 shadow-sm h-[56vh] min-h-[520px] overflow-y-auto"
                  >
                    <h2 className="text-center text-2xl font-semibold mb-3">Facturas a actualizar:</h2>
                    {rightItems.map((item, index) => (
                      <Draggable key={item.uuid} draggableId={item.uuid} index={index}>
                        {(dragProvided: DraggableProvided) => (
                          <article
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className="mb-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
                          >
                            <p className="text-xs text-neutral-500">
                              Fecha de emisión:{" "}
                              <span className="font-medium">
                                {item.fecha_emision
                                  ? new Date(item.fecha_emision).toLocaleDateString("es-GT")
                                  : "—"}
                              </span>
                            </p>
                            <p className="text-xs text-neutral-500">
                              Serie: <span className="font-medium">{item.serie || "—"}</span>
                            </p>
                            <p className="text-xs text-neutral-500">
                              Número de DTE: <span className="font-medium">{item.numero_dte}</span>
                            </p>
                            <p className="mt-1 text-sm font-semibold text-neutral-800">
                              {item.nombre_emisor}{" "}
                              <span className="text-xs text-neutral-500">({item.nit_emisor})</span>
                            </p>
                            <p className="text-xs">Cuenta Debe actual: <span className="font-medium">{item.cuenta_debe || "—"}</span></p>
                            <p className="text-xs">Cuenta Haber actual: <span className="font-medium">{item.cuenta_haber || "—"}</span></p>
                            <p className="mt-1 text-sm">
                              Monto Total:{" "}
                              <span className="font-bold text-emerald-600">
                                Q{(item.monto_total || 0).toFixed(2)}
                              </span>
                            </p>
                          </article>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {!rightItems.length && (
                      <p className="text-center text-sm text-neutral-400">
                        Arrastra facturas aquí para actualizarlas.
                      </p>
                    )}
                  </section>
                )}
              </Droppable>
            </div>
          </DragDropContext>

          {/* Fila inferior */}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="text-center font-semibold mb-2">Cantidades</h3>
              <div className="space-y-1 text-sm">
                <div><span className="text-neutral-700">Monto Total: </span><span className="font-semibold text-emerald-600">Q{totals.montoTotal.toFixed(2)}</span></div>
                <div><span className="text-neutral-700">Montos por Bienes: </span><span className="font-semibold text-emerald-600">Q{totals.montoBienes.toFixed(2)}</span></div>
                <div><span className="text-neutral-700">Montos por Servicios: </span><span className="font-semibold text-emerald-600">Q{totals.montoServicios.toFixed(2)}</span></div>
                <div><span className="text-neutral-700">IVA: </span><span className="font-semibold text-blue-600">Q{totals.iva.toFixed(2)}</span></div>
                <div><span className="text-neutral-700">Descuentos: </span><span className="font-semibold text-red-500">Q{totals.descuentos.toFixed(2)}</span></div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="text-center font-semibold mb-2">Información a actualizar</h3>

              <label className="text-xs font-semibold">Selecciona la fecha:</label>
              <input
                type="date"
                value={fechaRect}
                onChange={(e) => setFechaRect(e.target.value)}
                className="mb-3 h-10 w-full rounded-lg border px-3 text-sm"
              />

              <label className="text-xs font-semibold">Selecciona una Cuenta Debe:</label>
              <select
                value={cuentaDebe}
                onChange={(e) => setCuentaDebe(e.target.value)}
                className="mb-3 h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="">(no cambiar)</option>
                {cuentas.map((c) => (
                  <option key={c.value} value={c.value} disabled={c.nivel <= 3}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* ✅ NUEVO: siempre visible y toma/guarda cuenta_debe2 */}
              <label className="text-xs font-semibold">Selecciona una Cuenta Debe (2):</label>
              <select
                value={cuentaDebe2}
                onChange={(e) => setCuentaDebe2(e.target.value)}
                className="mb-3 h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="">(no cambiar)</option>
                {cuentas.map((c) => (
                  <option key={c.value} value={c.value} disabled={c.nivel <= 3}>
                    {c.label}
                  </option>
                ))}
              </select>

              <label className="text-xs font-semibold">Selecciona una Cuenta Haber:</label>
              <select
                value={cuentaHaber}
                onChange={(e) => setCuentaHaber(e.target.value)}
                className="mb-4 h-10 w-full rounded-lg border px-3 text-sm"
              >
                <option value="">(no cambiar)</option>
                {cuentas.map((c) => (
                  <option key={c.value} value={c.value} disabled={c.nivel <= 3}>
                    {c.label}
                  </option>
                ))}
              </select>

              <p className="text-xs text-red-600 mb-3">
                Esta acción es irreversible y afectará el cálculo de los reportes financieros y libros contables.
              </p>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Actualizando..." : "Actualizar información"}
              </button>
            </section>
          </div>
        </div>
      </main>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="w-[92%] max-w-[560px] rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-2">Confirmar información</h3>
            <p className="text-sm mb-4">
              Mes: <strong>{monthPretty(mes)}</strong> — Operación:{" "}
              <strong>{operacion.toUpperCase()}</strong>
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="rounded-lg border px-4 py-2 text-sm">
                Cancelar
              </button>
              <button
                onClick={() => { setConfirmOpen(false); fetchDocs(); }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
