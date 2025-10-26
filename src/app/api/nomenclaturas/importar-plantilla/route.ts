//src/app/api/nomenclaturas/importar-plantilla/route.ts
import { NextResponse } from "next/server";
import path from "path";
import ExcelJS from "exceljs";

// Variantes de gris comunes en plantillas de Excel (ajústalas si usas otro tono)
const GREYS = new Set([
  "FFD9D9D9", // #D9D9D9
  "FFE7E6E6", // #E7E6E6
  "FFF2F2F2", // #F2F2F2
  "FFBFBFBF", // #BFBFBF
  "FFC0C0C0", // #C0C0C0
  "FF808080", // #808080
]);

function isGrey(cell?: ExcelJS.Cell) {
  const fill = cell?.fill as ExcelJS.FillPattern | undefined;
  const argb =
    (fill as any)?.fgColor?.argb ||
    (fill as any)?.bgColor?.argb ||
    undefined;
  return argb ? GREYS.has(String(argb).toUpperCase()) : false;
}

export async function POST() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "nomenclatura.xlsx");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];

    // --- localizar columnas por cabecera ---
    const headersRow = ws.getRow(1);
    const findCol = (name: string) => {
      const vals = headersRow.values as string[];
      const i = vals.findIndex(
        (v) => String(v || "").trim().toUpperCase() === name.toUpperCase()
      );
      return i > -1 ? i : null;
    };

    const iCuenta = findCol("CUENTA");
    const iDesc = findCol("DESCRIPCION") ?? findCol("DESCRIPCIÓN");
    const iDH = findCol("DEBE/HABER");
    const iPD = findCol("PRINCIPAL/DETALLE") ?? findCol("PRINCIPAL/DETALLE".replace("/", "_"));
    const iNivel = findCol("NIVEL");
    const iTipo = findCol("TIPO");
    const iNat = findCol("NATURALEZA");

    if (iCuenta == null || iDesc == null || iDH == null || iPD == null || iNivel == null || iTipo == null || iNat == null) {
      return NextResponse.json(
        { error: "Plantilla sin columnas requeridas (CUENTA, DESCRIPCION, DEBE/HABER, PRINCIPAL/DETALLE, NIVEL, TIPO, NATURALEZA)" },
        { status: 400 }
      );
    }

    const cuentas: any[] = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // cabecera

      const get = (c: number) => String(row.getCell(c).value ?? "").trim();
      const cuenta = get(iCuenta);
      const descripcion = get(iDesc);
      if (!cuenta && !descripcion) return; // fila vacía

      const dh = get(iDH).toUpperCase() === "HABER" ? "HABER" : "DEBE";
      const pd = get(iPD).toUpperCase() === "D" ? "D" : "P";
      const nivel = Number(get(iNivel) || 1);
      const tipoRaw = get(iTipo).toUpperCase();
      const tipo =
        tipoRaw.includes("ESTADO") ? "ESTADO_RESULTADOS" :
        tipoRaw.includes("CAPITAL") ? "CAPITAL" :
        "BALANCE_GENERAL";

      const natRaw = get(iNat).toUpperCase().replace(/\s+/g, "_");
      const naturaleza =
        natRaw === "REVISAR"
          ? "REVISAR"
          : ([
              "ACTIVO",
              "PASIVO",
              "CAPITAL",
              "INGRESOS",
              "COSTOS",
              "GASTOS",
              "OTROS_INGRESOS",
              "OTROS_GASTOS",
            ].includes(natRaw)
              ? natRaw
              : "REVISAR"); // si viene raro, que quede REVISAR para que el usuario decida

      // --- locks por color gris (celda a celda) ---
      const cCuenta = row.getCell(iCuenta);
      const cDesc = row.getCell(iDesc);
      const cDH = row.getCell(iDH);
      const cPD = row.getCell(iPD);
      const cNivel = row.getCell(iNivel);
      const cTipo = row.getCell(iTipo);
      const cNat = row.getCell(iNat);

      const lockCuenta = isGrey(cCuenta);
      const lockDescripcion = isGrey(cDesc);
      const lockDebeHaber = true; // NOTA 3: DEBE/HABER SIEMPRE bloqueado en plantilla
      const lockPrincipalDetalle = isGrey(cPD) || pd === "P"; // P siempre bloqueado
      const lockNivel = isGrey(cNivel);
      const lockTipo = isGrey(cTipo);
      // NATURALEZA bloqueada si NO es REVISAR (si viene fija, no se toca)
      const lockNaturaleza = naturaleza !== "REVISAR";

      // Si la fila “es gris” (celdas claves), también bloquea acciones (+/🗑)
      const lockRowActions = [cCuenta, cDesc, cDH, cPD, cNivel, cTipo, cNat].some(isGrey);

      cuentas.push({
        orden: cuentas.length + 1,
        cuenta,
        descripcion,
        debeHaber: dh,
        principalDetalle: pd,
        nivel,
        tipo,
        naturaleza,
        isPlantilla: true,
        // locks
        lockCuenta,
        lockDescripcion,
        lockDebeHaber,
        lockPrincipalDetalle,
        lockNivel,
        lockTipo,
        lockNaturaleza,
        lockRowActions,
      });
    });

    return NextResponse.json({ cuentas });
  } catch (e: any) {
    console.error("importar-plantilla", e);
    return NextResponse.json({ error: "No se pudo leer la plantilla" }, { status: 500 });
  }
}
