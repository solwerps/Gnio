//src/components/upload/UploadFacturasXML.tsx

"use client";

import React, { useState } from "react";
import { XMLParser } from "fast-xml-parser";

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

export default function UploadXML({ onParsedList }: { onParsedList: (rows: DocPreview[]) => void }) {
  const [count, setCount] = useState(0);

  const parseXMLToDoc = (content: any): DocPreview | null => {
    const base = content?.["dte:GTDocumento"]?.["dte:SAT"]?.["dte:DTE"]?.["dte:DatosEmision"];
    const cert = content?.["dte:GTDocumento"]?.["dte:SAT"]?.["dte:DTE"]?.["dte:Certificacion"];
    if (!base || !cert) return null;

    const datos_generales = base["dte:DatosGenerales"];
    const datos_emisor = base["dte:Emisor"];
    const datos_receptor = base["dte:Receptor"];
    const itemsData = base?.["dte:Items"]?.["dte:Item"];
    const arr = Array.isArray(itemsData) ? itemsData : (itemsData ? [itemsData] : []);
    const normItems = arr.map((it: any) => ({
      total: Number(it?.["dte:Total"] ?? 0),
      bienOServicio: it?.["@_BienOServicio"] ?? "B",
      impuestos: (() => {
        const imp = it?.["dte:Impuestos"]?.["dte:Impuesto"];
        const list = Array.isArray(imp) ? imp : (imp ? [imp] : []);
        return list.map((x: any) => Number(x?.["dte:MontoImpuesto"] ?? 0));
      })(),
    }));

    // Impuestos totales
    const totImp = base?.["dte:Totales"]?.["dte:TotalImpuestos"]?.["dte:TotalImpuesto"];
    const listTot = Array.isArray(totImp) ? totImp : (totImp ? [totImp] : []);
    
    // CAMBIO APLICADO: Función sumByName mejorada
    const sumByName = (name: string) => {
      const want = name.trim().toUpperCase();
      return listTot
        .filter((x: any) => String(x?.["@_NombreCorto"] ?? "").trim().toUpperCase() === want)
        .reduce((a:number,x:any)=>a + Number(x?.["@_TotalMontoImpuesto"] ?? 0), 0);
    };

    // Bases
    let monto_bien = 0, monto_servicio = 0;
    
    // Lógica principal si hay ítems
    if (arr.length > 0) {
      normItems.forEach((i: any) => {
        const imps = (i.impuestos || []).reduce((a:number,b:number)=>a+b,0);
        const base = Math.max(0, i.total - imps);
        if (i.bienOServicio === "S") monto_servicio += base; else monto_bien += base;
      });
    } else {
      // CAMBIO APLICADO: Fallback si no hay Items (se asume todo es 'Bien' menos los impuestos)
      const total = Number(base?.["dte:Totales"]?.["dte:GranTotal"] ?? 0);
      const allTax = listTot.reduce((a:number,x:any)=> a + Number(x?.["@_TotalMontoImpuesto"] ?? 0), 0);
      monto_bien = Math.max(0, total - allTax);
      monto_servicio = 0;
    }

    const to2 = (n:number)=> n.toFixed(2);

    const numeroAut = cert?.["dte:NumeroAutorizacion"]?.["#text"];
    if (!numeroAut) return null;

    return {
      fecha_emision: String(datos_generales?.["@_FechaHoraEmision"] ?? ""),
      numero_autorizacion: String(numeroAut),
      tipo_dte: String(datos_generales?.["@_Tipo"] ?? ""),
      serie: String(cert?.["dte:NumeroAutorizacion"]?.["@_Serie"] ?? ""),
      numero_dte: String(cert?.["dte:NumeroAutorizacion"]?.["@_Numero"] ?? ""),
      nit_emisor: String(datos_emisor?.["@_NITEmisor"] ?? ""),
      nombre_emisor: String(datos_emisor?.["@_NombreEmisor"] ?? ""),
      codigo_establecimiento: String(datos_emisor?.["@_CodigoEstablecimiento"] ?? ""),
      nombre_establecimiento: String(datos_emisor?.["@_NombreComercial"] ?? ""),
      id_receptor: String(datos_receptor?.["@_IDReceptor"] ?? ""),
      nombre_receptor: String(datos_receptor?.["@_NombreReceptor"] ?? ""),
      nit_certificador: String(cert?.["dte:NITCertificador"] ?? ""),
      nombre_certificador: String(cert?.["dte:NombreCertificador"] ?? ""),
      moneda: String(datos_generales?.["@_CodigoMoneda"] ?? "GTQ"),
      monto_total: to2(Number(base?.["dte:Totales"]?.["dte:GranTotal"] ?? 0)),
      monto_bien: to2(monto_bien),
      monto_servicio: to2(monto_servicio),
      
      // Uso de la función sumByName mejorada
      iva: to2(sumByName("IVA")),
      petroleo: to2(sumByName("PETROLEO")),
      turismo_hospedaje: to2(sumByName("TURISMO HOSPEDAJE")),
      turismo_pasajes: to2(sumByName("TURISMO PASAJES")),
      timbre_prensa: to2(sumByName("TIMBRE DE PRENSA")),
      bomberos: to2(sumByName("BOMBEROS")),
      tasa_municipal: to2(sumByName("TASA MUNICIPAL")),
      bebidas_alcoholicas: to2(sumByName("BEBIDAS ALCOHOLICAS")),
      tabaco: to2(sumByName("TABACO")),
      cemento: to2(sumByName("CEMENTO")),
      bebidas_no_alcoholicas: to2(sumByName("BEBIDAS NO ALCOHOLICAS")),
      tarifa_portuaria: to2(sumByName("TARIFA PORTUARIA")),
    };
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Se utiliza ignoreAttributes: false para poder acceder a los atributos como @_Nombre
    const parser = new XMLParser({ ignoreAttributes: false });
    const out: DocPreview[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 8 * 1024 * 1024) { alert(`Archivo ${f.name} excede 8MB`); continue; }
      const text = await f.text();
      try {
        const content = parser.parse(text);
        const doc = parseXMLToDoc(content);
        if (doc) out.push(doc);
      } catch {}
    }
    onParsedList(out);
    setCount(out.length);
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="font-semibold mb-2">2) XML (uno o varios)</div>
      <input type="file" accept=".xml" multiple onChange={(e)=>onFiles(e.target.files)} />
      {count > 0 && <div className="mt-2 text-sm text-emerald-700">XML válidos: {count}</div>}
    </div>
  );
}