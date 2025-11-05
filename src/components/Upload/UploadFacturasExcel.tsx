//src/components/upload/UploadFacturasExcel.tsx

"use client";

import React, { useState } from "react";
import * as XLSX from "xlsx";

type DocPreview = {
  fecha_emision: string;
  numero_autorizacion: string;
  tipo_dte: string;
  serie: string;
  numero_dte: string;
  nit_emisor: string;
  nombre_emisor: string;
  codigo_establecimiento?: string;
  nombre_establecimiento?: string;
  id_receptor?: string;
  nombre_receptor?: string;
  nit_certificador?: string;
  nombre_certificador?: string;
  moneda: string;
  monto_total: string;
  monto_bien: string;
  monto_servicio: string;
  factura_estado?: string;
  marca_anulado?: string;
  fecha_anulacion?: string;
  iva: string;
  petroleo: string;
  turismo_hospedaje: string;
  turismo_pasajes: string;
  timbre_prensa: string;
  bomberos: string;
  tasa_municipal: string;
  bebidas_alcoholicas: string;
  tabaco: string;
  cemento: string;
  bebidas_no_alcoholicas: string;
  tarifa_portuaria: string;
};

// --- Helpers ---

/**
 * Convierte un valor a un número con dos decimales, manejando comas/puntos como separadores
 * decimales y eliminando caracteres no numéricos.
 * @param v Valor a convertir.
 * @returns Cadena de número con dos decimales ("X.XX") o "0.00" si no es válido.
 */
const coerceNum = (v: any): string => {
  if (v == null || v === "") return "0.00";
  const s = String(v).replace(/[^0-9\-,.]/g, "").replace(/\s+/g, "");
  // soporta "1.234,56" y "1,234.56"
  const norm = s.includes(",") && s.includes(".")
    ? (s.indexOf(",") > s.indexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""))
    : s.replace(",", ".");
  const n = Number(norm);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

/**
 * Convierte un número de fecha de Excel o una cadena de fecha a formato ISO 8601.
 * @param v Valor de la fecha.
 * @returns Fecha en formato ISO 8601 (completo o parcial) o la cadena original si es corta.
 */
const excelDateToISO = (v: any): string => {
  // soporta texto ISO o serial excel
  if (typeof v === "number" && Number.isFinite(v) && v > 20000) {
    // @ts-ignore - XLSX.SSF.parse_date_code existe en la lib xlsx
    const d = XLSX.SSF.parse_date_code(v);
    const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
    return dt.toISOString(); // full ISO; si prefieres solo fecha: .slice(0,10)
  }
  const s = String(v ?? "");
  return s.length >= 10 ? s : s; // déjalo tal cual si ya viene ISO
};

/**
 * Busca el primer valor no nulo ni vacío en la fila para una lista de posibles claves (nombres de columna).
 * @param row Objeto de la fila.
 * @param keys Lista de posibles nombres de columna.
 * @returns El valor de la primera clave encontrada, o cadena vacía.
 */
const pick = (row: any, keys: string[]): any =>
  keys.find((k) => row[k] != null && row[k] !== "") ? row[keys.find((k) => row[k] != null && row[k] !== "") as string] : "";

// --- Componente principal ---

export default function UploadExcel({ onParsed }: { onParsed: (rows: DocPreview[]) => void }) {
  const [count, setCount] = useState(0);

  const parseSheetRow = (r: any): DocPreview => {
    // Función s: busca valor en una o más columnas y lo devuelve como cadena (trim)
    const s = (ks: string|string[]) => String(pick(r, Array.isArray(ks)? ks : [ks]) ?? "").trim();
    // Función n: busca valor en una o más columnas y lo devuelve como número con 2 decimales
    const n = (ks: string|string[]) => coerceNum(pick(r, Array.isArray(ks)? ks : [ks]));

    // Cálculos para determinar la base (monto_bien) asumiendo todo es bien por defecto
    const total = Number(n("Gran Total (Moneda Original)"));
    const iva   = Number(n("IVA (monto de este impuesto)"));
    const otros = [
      "Petróleo (monto de este impuesto)","Turismo Hospedaje (monto de este impuesto)",
      "Turismo Pasajes (monto de este impuesto)","Timbre de Prensa (monto de este impuesto)",
      "Bomberos (monto de este impuesto)","Tasa Municipal (monto de este impuesto)",
      "Bebidas alcohólicas (monto de este impuesto)","Bebidas no Alcohólicas (monto de este impuesto)",
      "Tabaco (monto de este impuesto)","Cemento (monto de este impuesto)","Tarifa Portuaria (monto de este impuesto)"
    ].reduce((a, k) => a + Number(n(k)), 0);

    return {
      // Uso de pick y excelDateToISO para campos de fecha
      fecha_emision: excelDateToISO(pick(r, ["Fecha de emisión","Fecha Emision","Fecha"])),
      // Uso de pick con arrays de posibles nombres de columna
      numero_autorizacion: s(["Número de Autorización","Numero de Autorizacion","Autorización"]),
      tipo_dte: s(["Tipo de DTE (nombre)","Tipo DTE","Tipo"]),
      serie: s("Serie"),
      numero_dte: s(["Número del DTE","Numero DTE"]),
      nit_emisor: s(["NIT del emisor","NIT Emisor"]),
      nombre_emisor: s(["Nombre completo del emisor","Nombre Emisor"]),
      codigo_establecimiento: s(["Código de establecimiento","Codigo Establecimiento"]),
      nombre_establecimiento: s(["Nombre del establecimiento","Nombre Comercial"]),
      id_receptor: s(["ID del receptor","NIT Receptor","ID Receptor"]),
      nombre_receptor: s(["Nombre completo del receptor","Nombre Receptor"]),
      nit_certificador: s(["NIT del Certificador","NIT Certificador"]),
      nombre_certificador: s(["Nombre completo del Certificador","Nombre Certificador"]),
      moneda: s(["Moneda"]) || "GTQ",
      monto_total: n("Gran Total (Moneda Original)"),
      factura_estado: s(["Estado"]),
      marca_anulado: s(["Marca de anulado","Anulado"]),
      fecha_anulacion: s(["Fecha de anulación","Fecha Anulación"]),
      
      // Montos de impuestos (uso de n)
      iva: n("IVA (monto de este impuesto)"),
      petroleo: n("Petróleo (monto de este impuesto)"),
      turismo_hospedaje: n("Turismo Hospedaje (monto de este impuesto)"),
      turismo_pasajes: n("Turismo Pasajes (monto de este impuesto)"),
      timbre_prensa: n("Timbre de Prensa (monto de este impuesto)"),
      bomberos: n("Bomberos (monto de este impuesto)"),
      tasa_municipal: n("Tasa Municipal (monto de este impuesto)"),
      bebidas_alcoholicas: n("Bebidas alcohólicas (monto de este impuesto)"),
      bebidas_no_alcoholicas: n("Bebidas no Alcohólicas (monto de este impuesto)"),
      tabaco: n("Tabaco (monto de este impuesto)"),
      cemento: n("Cemento (monto de este impuesto)"),
      tarifa_portuaria: n("Tarifa Portuaria (monto de este impuesto)"),
      
      // Cálculo de monto_bien: Total - IVA - Otros Impuestos
      monto_bien: Math.max(0, total - iva - otros).toFixed(2),
      monto_servicio: "0.00",
    };
  };

  const onFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    const parsed = rows.map(parseSheetRow);
    onParsed(parsed);
    setCount(parsed.length);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="font-semibold mb-2">1) Excel/CSV SAT</div>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 8 * 1024 * 1024) return alert("Máximo 8MB");
          onFile(f);
        }}
      />
      {count > 0 && <div className="mt-2 text-sm text-emerald-700">Documentos leídos: {count}</div>}
    </div>
  );
}