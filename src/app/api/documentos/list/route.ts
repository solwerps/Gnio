// app/api/documentos/list/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/documentos/list?empresa=ID&period=YYYY-MM&op=compra|venta&download=1
 * - Filtra por empresa y por el mes (fecha_trabajo)
 * - Si op va vacío/omitido => trae compra y venta
 * - Devuelve todas las columnas solicitadas
 * - Si download=1 => CSV con mismas columnas y orden
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = Number(searchParams.get('empresa') || '0');
    const period = searchParams.get('period') || '';
    const op = (searchParams.get('op') || '').toLowerCase(); // '', 'compra', 'venta'
    const download = searchParams.get('download');

    if (!empresaId) return NextResponse.json({ ok:false, rows:[], message:'empresa requerida' }, { status:400 });
    if (!/^\d{4}-\d{2}$/.test(period)) return NextResponse.json({ ok:false, rows:[], message:'period (YYYY-MM) requerido' }, { status:400 });

    const [y, m] = period.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end   = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));
    const startStr = start.toISOString().slice(0,10);
    const endStr   = end.toISOString().slice(0,10);

    const sql = `
      SELECT
        d.uuid                                 AS uuid,
        d.fecha_trabajo                        AS fechaTrabajo,
        d.fecha_emision                        AS fechaEmision,
        d.numero_autorizacion                  AS numeroAutorizacion,
        d.tipo_dte                             AS tipoDte,
        d.serie                                AS serie,
        d.numero_dte                           AS numeroDte,
        d.nit_emisor                           AS nitEmisor,
        d.nombre_emisor                        AS nombreEmisor,
        d.codigo_establecimiento               AS codigoEstablecimiento,
        d.nombre_establecimiento               AS nombreEstablecimiento,
        d.id_receptor                          AS idReceptor,
        d.nombre_receptor                      AS nombreReceptor,
        d.nit_certificador                     AS nitCertificador,
        d.nombre_certificador                  AS nombreCertificador,
        d.moneda                               AS moneda,
        d.monto_total                          AS montoTotal,
        d.monto_bien                           AS montoBien,
        d.monto_servicio                       AS montoServicio,
        d.factura_estado                       AS estadoFactura,
        d.marca_anulado                        AS marcaAnulado,
        d.fecha_anulacion                      AS fechaAnulacion,
        d.iva                                  AS iva,
        d.petroleo                             AS petroleo,
        d.turismo_hospedaje                    AS turismoHospedaje,
        d.turismo_pasajes                      AS turismoPasajes,
        d.timbre_prensa                        AS timbrePrensa,
        d.bomberos                             AS bomberos,
        d.tasa_municipal                       AS tasaMunicipal,
        d.bebidas_alcoholicas                  AS bebidasAlcoholicas,
        d.tabaco                               AS tabaco,
        d.cemento                              AS cemento,
        d.bebidas_no_alcoholicas               AS bebidasNoAlcoholicas,
        d.tarifa_portuaria                     AS tarifaPortuaria,
        d.tipo_operacion                       AS tipoOperacion,
        CONCAT(cd.descripcion, ' (', cd.cuenta, ')') AS cuentaDebe,
        CONCAT(ch.descripcion, ' (', ch.cuenta, ')') AS cuentaHaber,
        d.tipo                                 AS tipo,
        d.empresa_id                           AS idEmpresa,
        d.estado                               AS estado
      FROM documentos d
      LEFT JOIN cuentas cd ON cd.uuid = d.cuenta_debe
      LEFT JOIN cuentas ch ON ch.uuid = d.cuenta_haber
      WHERE d.empresa_id = ?
        AND d.estado = 1
        ${op === 'compra' || op === 'venta' ? 'AND d.tipo_operacion = ?' : ''}
        AND d.fecha_trabajo >= ?
        AND d.fecha_trabajo < ?
      ORDER BY d.fecha_emision ASC, d.numero_dte ASC
    `;

    const params = (op === 'compra' || op === 'venta')
      ? [empresaId, op, startStr, endStr]
      : [empresaId, startStr, endStr];

    const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);

    if (download) {
      const order = [
        'fechaTrabajo','fechaEmision','numeroAutorizacion','tipoDte','serie','numeroDte','nitEmisor','nombreEmisor',
        'codigoEstablecimiento','nombreEstablecimiento','idReceptor','nombreReceptor','nitCertificador','nombreCertificador',
        'moneda','montoTotal','montoBien','montoServicio','estadoFactura','marcaAnulado','fechaAnulacion','iva','petroleo',
        'turismoHospedaje','turismoPasajes','timbrePrensa','bomberos','tasaMunicipal','bebidasAlcoholicas','tabaco','cemento',
        'bebidasNoAlcoholicas','tarifaPortuaria','tipoOperacion','cuentaDebe','cuentaHaber','tipo','idEmpresa','estado'
      ];
      const esc = (v:any) => v==null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : String(v);
      const csv = order.join(',') + '\n' + rows.map(r => order.map(k => esc(r[k])).join(',')).join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="documentos_${empresaId}_${period}${op?`_${op}`:''}.csv"`
        }
      });
    }

    return NextResponse.json({ ok:true, rows });
  } catch (e:any) {
    console.error(e);
    return NextResponse.json({ ok:false, rows:[], message:e?.message||'error' }, { status:500 });
  }
}
