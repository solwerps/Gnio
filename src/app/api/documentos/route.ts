// src/app/api/documentos/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = Number(searchParams.get("empresaId") || "0");
    const mes = String(searchParams.get("mes") || "");
    const operacion = String(searchParams.get("operacion") || "");
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "10")));
    const format = String(searchParams.get("format") || "");

    // validaciones básicas
    if (!empresaId || !/^\d{4}-\d{2}$/.test(mes)) {
      return NextResponse.json({ ok: false, error: "BAD_PARAMS" }, { status: 400 });
    }

    // rango del mes
    const [y, m] = mes.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    // 👇 AQUÍ ESTABA TU PROBLEMA
    // antes: { empresaId, fechaEmision: { ... } }
    // ahora: empresaId + (fechaEmision EN el mes  OR  fechaTrabajo EN el mes)
    const where: any = {
      empresaId,
      AND: [
        {
          OR: [
            { fechaEmision: { gte: start, lt: end } },
            { fechaTrabajo: { gte: start, lt: end } },
          ],
        },
      ],
    };

    // si eligieron Compra/Venta en el filtro
    if (operacion === "compra" || operacion === "venta") {
      where.tipoOperacion = operacion;
    }

    // consulta
    const [total, data] = await Promise.all([
      prisma.documento.count({ where }),
      prisma.documento.findMany({
        where,
        orderBy: [
          // primero por fecha REAL si la hay, si no por fechaTrabajo
          { fechaEmision: "desc" },
          { fechaTrabajo: "desc" },
          { numeroDte: "desc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        // si quieres ver la empresa en el frontend, la mandamos también
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              nit: true,
            },
          },
        },
      }),
    ]);

    // mapeo al formato que tu tabla espera (el mismo del uploader)
    const rows = data.map((d) => ({
      uuid: d.uuid,
      identificador_unico: d.identificadorUnico ?? null,
      fecha_emision: d.fechaEmision ? d.fechaEmision.toISOString() : null,
      // por si quieres mostrarla después
      fecha_trabajo: d.fechaTrabajo ? d.fechaTrabajo.toISOString() : null,
      fecha_anulacion: d.fechaAnulacion ? d.fechaAnulacion.toISOString() : null,
      importacion: false, // tú no lo manejas aún
      numero_autorizacion: d.numeroAutorizacion ?? null,
      numero_dte: d.numeroDte,
      serie: d.serie ?? null,
      nit_emisor: d.nitEmisor ?? null,
      nombre_emisor: d.nombreEmisor ?? null,
      id_receptor: d.idReceptor ?? null,
      nombre_receptor: d.nombreReceptor ?? null,
      codigo_establecimiento: d.codigoEstablecimiento ?? null,
      nombre_establecimiento: d.nombreEstablecimiento ?? null,
      nit_certificador: d.nitCertificador ?? null,
      nombre_certificador: d.nombreCertificador ?? null,
      moneda: d.moneda,
      monto_bien: Number(d.montoBien ?? 0),
      monto_servicio: Number(d.montoServicio ?? 0),
      iva: Number(d.iva ?? 0),
      petroleo: Number(d.petroleo ?? 0),
      turismo_hospedaje: Number(d.turismoHospedaje ?? 0),
      turismo_pasajes: Number(d.turismoPasajes ?? 0),
      timbre_prensa: Number(d.timbrePrensa ?? 0),
      bomberos: Number(d.bomberos ?? 0),
      tasa_municipal: Number(d.tasaMunicipal ?? 0),
      bebidas_alcoholicas: Number(d.bebidasAlcoholicas ?? 0),
      tabaco: Number(d.tabaco ?? 0),
      cemento: Number(d.cemento ?? 0),
      bebidas_no_alcoholicas: Number(d.bebidasNoAlcoholicas ?? 0),
      tarifa_portuaria: Number(d.tarifaPortuaria ?? 0),
      monto_total: Number(d.montoTotal ?? 0),
      factura_estado: d.facturaEstado ?? "",
      tipo_operacion: d.tipoOperacion as "compra" | "venta",
      tipo_dte: d.tipoDte,
      cuenta_debe: d.cuentaDebe ?? null,
      cuenta_haber: d.cuentaHaber ?? null,
      tipo: d.tipo ?? null,
      marca_anulado: Boolean(d.marcaAnulado),
      // info de la empresa, por si la quieres mostrar
      empresa_id: d.empresaId,
      empresa_nombre: d.empresa?.nombre ?? null,
      empresa_nit: d.empresa?.nit ?? null,
    }));

    // export CSV igual que antes
    if (format === "csv") {
      const headers = Object.keys(rows[0] || {});
      const lines = [
        headers.join(","),
        ...rows.map((r) =>
          headers
            .map((h) => {
              const v = (r as any)[h];
              if (v === null || v === undefined) return "";
              const s = String(v).replace(/"/g, '""');
              return /[",\n]/.test(s) ? `"${s}"` : s;
            })
            .join(",")
        ),
      ];
      const csv = lines.join("\n");
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=facturas_${empresaId}_${mes}.csv`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        data: rows,
        total,
        page,
        pageSize,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
