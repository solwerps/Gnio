// src/app/dashboard/contador/[usuarios]/empresas/[id]/documentos/retenciones/iva/cargar/page.tsx
"use client";

import React, { useState, useMemo, useEffect, DragEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import EmpresaSidebar from "@/components/empresas/EmpresaSidebar";

type Row = Record<string, any>;

/* ------------------------ Config encabezados ------------------------ */
const REQUIRED = [
  "NIT RETENEDOR",
  "NOMBRE RETENEDOR",
  "ESTADO CONSTANCIA",
  "CONSTANCIA",
  "FECHA EMISION",   // también aceptamos "EMISIÓN"
  "TOTAL FACTURA",
  "IMPORTE NETO",
  "AFECTO RETENCION",// también aceptamos "RETENCIÓN"
  "TOTAL RETENCION"  // también aceptamos "RETENCIÓN"
];

const CANON: Record<string, string> = {
  "FECHA EMISIÓN": "FECHA EMISION",
  "AFECTO RETENCIÓN": "AFECTO RETENCION",
  "TOTAL RETENCIÓN": "TOTAL RETENCION",
};
const canonKey = (k: string) => CANON[k] ?? k;

function toRowsFromSheet(ws: XLSX.WorkSheet): string[][] {
  const a = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: true, defval: "" }) as any[];
  return a.map((r: any[]) => r.map((c) => (c == null ? "" : String(c).trim())));
}
function findHeaderIndex(rows2D: string[][]): number {
  const req = new Set(REQUIRED);
  let best = { idx: -1, score: -1 };
  rows2D.forEach((row, i) => {
    const score = row.reduce((acc, cell) => acc + (req.has(canonKey(cell)) ? 1 : 0), 0);
    if (score > best.score) best = { idx: i, score };
  });
  return best.idx;
}
const monthPretty = (ym: string) => {
  try {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-GT", { month: "long", year: "numeric" });
  } catch { return ym; }
};

/* --------------------------- Modal estilo SECA --------------------------- */
function SecaModal({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  actions: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-[720px] rounded-2xl bg-white shadow-xl">
        {/* botón X */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
        >
          ✕
        </button>

        <div className="px-6 pt-6 pb-2">
          <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
          <div className="mt-2 h-px w-full bg-neutral-200" />
        </div>

        <div className="px-6 pb-4">{children}</div>

        <div className="px-6 pb-6">
          <div className="flex w-full items-center justify-end gap-3">{actions}</div>
        </div>
      </div>
    </div>
  );
}

/* ======================================================================= */

export default function CargarRetencionesIvaPage() {
  const params = useParams() as { usuarios?: string; usuario?: string; id: string };
  const router = useRouter();
  const usuario = params.usuarios ?? params.usuario ?? "";
  const empresaId = String(params.id);
  const base = `/dashboard/contador/${usuario}/empresas/${empresaId}/documentos/retenciones/iva`;

  const [empresaNombre, setEmpresaNombre] = useState<string>("");
  const [empresaNit, setEmpresaNit] = useState<string>(""); // ← NIT de la empresa activa (DB)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/empresas/${empresaId}`, { cache: "no-store" });
        const j = await r.json();
        const d = j?.data ?? j;
        setEmpresaNombre(d?.nombre || "");
        setEmpresaNit(d?.nit || "");
      } catch { /* ignore */ }
    })();
  }, [empresaId]);

  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // modales
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const [afterSave, setAfterSave] = useState(false);      // ← NUEVO: modal propio post-guardado
  const [inserted, setInserted] = useState<number>(0);    // ← NUEVO: cantidad guardada

  const headersOk = useMemo(() => {
    if (!rows.length) return false;
    const keys = Object.keys(rows[0] || {}).map(canonKey);
    return REQUIRED.every(req => keys.includes(req));
  }, [rows]);

  /* -------------------- Validación NIT RETENIDO vs Empresa.nit -------------------- */
  const onlyDigits = (s: any) => String(s ?? "").replace(/\D+/g, "");
  const looksLikeNitRetenido = (s: string) =>
    s.toUpperCase().replace(/[\s:]+/g, " ").trim().startsWith("NIT RETENIDO");

  function findNitRetenidoInSheet(rows2D: string[][]): string {
    for (let i = 0; i < rows2D.length; i++) {
      const row = rows2D[i];
      for (let j = 0; j < row.length; j++) {
        const cell = row[j] ?? "";
        const norm = cell.toUpperCase().replace(/[\s:]+/g, " ").trim();

        // Caso A: todo en una celda "NIT RETENIDO: 75424789"
        if (looksLikeNitRetenido(cell)) {
          const digitsInSameCell = onlyDigits(cell);
          if (digitsInSameCell) return digitsInSameCell;

          // Caso B: valor en celdas a la derecha (1–5 celdas)
          for (let k = j + 1; k <= Math.min(j + 5, row.length - 1); k++) {
            const v = row[k];
            const digits = onlyDigits(v);
            if (digits) return digits;
          }
        }

        // Variante: "NIT RETENIDO" sin dos puntos
        if (norm === "NIT RETENIDO") {
          for (let k = j + 1; k <= Math.min(j + 5, row.length - 1); k++) {
            const v = row[k];
            const digits = onlyDigits(v);
            if (digits) return digits;
          }
        }
      }
    }
    return "";
  }
  /* ------------------------------------------------------------------------------- */

  async function readExcel(file: File) {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      const a2d = toRowsFromSheet(ws);

      // VALIDACIÓN de NIT RETENIDO (Excel) vs NIT Empresa (DB)
      const nitArchivo = findNitRetenidoInSheet(a2d);
      const nitEmpresa = onlyDigits(empresaNit);
      if (!nitArchivo) {
        alert("El archivo no contiene el campo 'NIT RETENIDO' en la cabecera. No se puede cargar.");
        setRows([]);
        return;
      }
      if (!nitEmpresa) {
        alert("No se pudo validar el NIT de la empresa activa. Verifique la configuración de la empresa.");
        setRows([]);
        return;
      }
      if (nitArchivo !== nitEmpresa) {
        alert(`El NIT del archivo (${nitArchivo}) no coincide con el NIT de la empresa (${nitEmpresa}).`);
        setRows([]);
        return;
      }

      // Detección de encabezado de la tabla
      const headerIdx = findHeaderIndex(a2d);
      if (headerIdx < 0) {
        alert("No se encontró la fila de encabezados requerida en el Excel.");
        setRows([]);
        return;
      }

      const header = a2d[headerIdx].map(canonKey);
      const data = a2d.slice(headerIdx + 1);

      // Construcción de objetos por fila
      const out: Row[] = data
        .filter(r => r.some(cell => String(cell).trim() !== ""))
        .map((r) => {
          const obj: Row = {};
          header.forEach((k, i) => { if (k) obj[k] = r[i]; });
          return obj;
        });

      // Normaliza y filtra solo columnas relevantes
      const filtered = out.map((o) => ({
        "NIT RETENEDOR": o["NIT RETENEDOR"] ?? "",
        "NOMBRE RETENEDOR": o["NOMBRE RETENEDOR"] ?? "",
        "ESTADO CONSTANCIA": o["ESTADO CONSTANCIA"] ?? "",
        "CONSTANCIA": o["CONSTANCIA"] ?? "",
        "FECHA EMISION": o["FECHA EMISION"] ?? "",
        "TOTAL FACTURA": o["TOTAL FACTURA"] ?? "",
        "IMPORTE NETO": o["IMPORTE NETO"] ?? "",
        "AFECTO RETENCION": o["AFECTO RETENCION"] ?? (o["AFECTO RETENCIÓN"] ?? ""),
        "TOTAL RETENCION": o["TOTAL RETENCION"] ?? (o["TOTAL RETENCIÓN"] ?? ""),
      }));

      setRows(filtered);
    } catch (e) {
      console.error(e);
      alert("No se pudo leer el archivo. Verifica que sea .xlsx/.xls.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) readExcel(f);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0]; if (f) readExcel(f);
  };

  const handleBack = () => {
    if (rows.length > 0) setConfirmBack(true);
    else router.push(base);
  };

  const onSave = async () => {
    setConfirmSave(false);
    if (!headersOk || !rows.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/retenciones/iva/masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_id: Number(empresaId),
          date: mes,
          retenciones: rows,
          // Opcional: reforzar validación en backend enviando NIT
          nit_retenido: onlyDigits(empresaNit),
        }),
      });
      const j = await res.json();
      if (!res.ok || j?.status !== 200) throw new Error(j?.message || "Falló la carga");

      // ⇩⇩ MODAL PROPIO POST-GUARDADO
      setInserted(Number(j?.inserted ?? 0));
      setAfterSave(true);
      // (no usamos window.confirm)
    } catch (e: any) {
      alert(`Error guardando: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900">
      {/* Sidebar fijo */}
      <div className="fixed left-0 top-0 hidden h-screen w-[260px] overflow-y-auto md:block bg-white">
        <EmpresaSidebar empresaId={empresaId} forceUsuario={usuario} />
      </div>

      {/* Contenido */}
      <main className="md:ml-[260px] px-4 sm:px-6 py-6">
        <div className="mx-auto w-full max-w-[1120px]">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Retenciones IVA / Carga Masiva de Retenciones
            </h1>
            <button
              onClick={handleBack}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              ← Regresar
            </button>
          </div>

          {/* Filtro fecha */}
          <div className="mb-5 max-w-md">
            <label className="text-sm font-semibold text-neutral-700 block mb-1">Selecciona la fecha:</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="h-11 w-[240px] rounded-xl border border-neutral-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="text-xs text-neutral-500 mt-1">{monthPretty(mes)}</div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="mb-6 rounded-2xl border-2 border-dashed border-neutral-300 bg-white px-6 py-12 text-center text-neutral-500 hover:border-blue-400"
          >
            <p className="mb-1">
              Arrastra y suelta tus archivos o{" "}
              <label className="text-blue-600 underline cursor-pointer">
                Busca en tu ordenador
                <input type="file" accept=".xlsx,.xls" onChange={onFileInput} className="hidden" />
              </label>
            </p>
            <p className="text-xs">
              Encabezados requeridos: {REQUIRED.join(" · ")}
            </p>
          </div>

          {/* Pre-vista */}
          {rows.length > 0 && (
            <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-4 py-2 text-left">NIT Retenedor</th>
                      <th className="px-4 py-2 text-left">Nombre Retenedor</th>
                      <th className="px-4 py-2 text-left">Estado Constancia</th>
                      <th className="px-4 py-2 text-left">Constancia</th>
                      <th className="px-4 py-2 text-left">Fecha Emisión</th>
                      <th className="px-4 py-2 text-right">Total Factura</th>
                      <th className="px-4 py-2 text-right">Importe Neto</th>
                      <th className="px-4 py-2 text-right">Afecto Retención</th>
                      <th className="px-4 py-2 text-right">Total Retención</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="px-4 py-2">{r["NIT RETENEDOR"]}</td>
                        <td className="px-4 py-2">{r["NOMBRE RETENEDOR"]}</td>
                        <td className="px-4 py-2">{r["ESTADO CONSTANCIA"]}</td>
                        <td className="px-4 py-2">{r["CONSTANCIA"]}</td>
                        <td className="px-4 py-2">{String(r["FECHA EMISION"] ?? "")}</td>
                        <td className="px-4 py-2 text-right">{String(r["TOTAL FACTURA"] ?? "")}</td>
                        <td className="px-4 py-2 text-right">{String(r["IMPORTE NETO"] ?? "")}</td>
                        <td className="px-4 py-2 text-right">{String(r["AFECTO RETENCION"] ?? "")}</td>
                        <td className="px-4 py-2 text-right">{String(r["TOTAL RETENCION"] ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-5 flex justify-center">
                <button
                  disabled={!headersOk || !rows.length || loading}
                  onClick={() => setConfirmSave(true)}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Guardando…" : "Guardar Datos"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal: confirmar salir sin guardar */}
      {confirmBack && (
        <SecaModal
          title="Salir de Carga de Retenciones"
          onClose={() => setConfirmBack(false)}
          actions={
            <>
              <button
                onClick={() => setConfirmBack(false)}
                className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => router.push(base)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Salir sin guardar
              </button>
            </>
          }
        >
          <p className="text-neutral-700 mb-3">
            Hay datos sin guardar en la pre-vista. Si sales ahora, <b>se perderán</b>.
          </p>
          <ul className="text-sm text-neutral-800 leading-6">
            <li><b>Empresa:</b> {empresaNombre || empresaId}</li>
            <li><b>Fecha:</b> {monthPretty(mes)}</li>
            <li><b>Registros cargados:</b> {rows.length}</li>
          </ul>
        </SecaModal>
      )}

      {/* Modal: confirmar carga */}
      {confirmSave && (
        <SecaModal
          title="Cargar Retenciones IVA"
          onClose={() => setConfirmSave(false)}
          actions={
            <>
              <button
                onClick={() => setConfirmSave(false)}
                className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={onSave}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Cargar Retenciones
              </button>
            </>
          }
        >
          <p className="text-neutral-700 mb-4">¿Está seguro de realizar esta acción?</p>
          <ul className="text-sm leading-7">
            <li>
              <b>Tipo de operación:</b>{" "}
              <span className="text-blue-600 font-semibold">Retenciones De IVA</span>
            </li>
            <li>
              <b>Empresa:</b>{" "}
              <span className="text-blue-600 font-semibold">
                {empresaNombre || empresaId}
              </span>
            </li>
            <li><b>Fecha:</b> {monthPretty(mes)}</li>
            <li><b>Registros:</b> {rows.length}</li>
          </ul>
        </SecaModal>
      )}

      {/* Modal PROPIO post-guardado (reemplaza window.confirm) */}
      {afterSave && (
        <SecaModal
          title="Carga completada"
          onClose={() => setAfterSave(false)}
          actions={
            <>
              <button
                onClick={() => {
                  setAfterSave(false);
                  setRows([]); // cargar otro archivo
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Cargar otro archivo
              </button>
              <button
                onClick={() => router.push(base)}
                className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-semibold"
              >
                Volver al listado
              </button>
            </>
          }
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✅</span>
            <p className="text-neutral-800 text-base">
              <b>{inserted}</b> retenciones guardadas.
            </p>
          </div>
          <p className="text-neutral-700">¿Deseas cargar otro archivo?</p>
        </SecaModal>
      )}
    </div>
  );
}
