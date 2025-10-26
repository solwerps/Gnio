//src/components/empresas/InfoTab.tsx

// src/components/empresas/InfoTab.tsx
"use client";

import { useState } from "react";
import { Field, Input, Select } from "./ui";
import {
  GT_DEPARTAMENTOS,
  GT_MUNICIPIOS,
  ACTIVIDADES_SAT,
} from "@/components/empresas/constants";
import { RazonSocial } from "@/types/empresas";

/* ==================== Helpers de fecha (dd/mm/aaaa) ==================== */
const onlyDigits = (s: string) => s.replace(/\D+/g, "");
const maskDMY = (raw: string) => {
  const d = onlyDigits(raw).slice(0, 8);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 4);
  const p3 = d.slice(4, 8);
  return [p1, p2, p3].filter(Boolean).join("/");
};

/** (Opcional) utilidades por si recibes ISO y quieres mostrar dmy */
export const isoToDmy = (iso?: string) => {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [_, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
};

function DateField({
  label,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(maskDMY(e.target.value))}
        maxLength={10}
      />
    </Field>
  );
}

/* ============================== Props ============================== */
type Props = {
  razonSocial: RazonSocial;
  infoIndividual: any;
  setInfoIndividual: (u: any) => void;
  infoJuridico: any;
  setInfoJuridico: (u: any) => void;
};

/* ========================== Subcomponentes ========================== */
const DeptoSelect = ({
  value,
  onChange,
  label = "Departamento:",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) => (
  <Field label={label}>
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Selecciona</option>
      {GT_DEPARTAMENTOS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </Select>
  </Field>
);

const MuniSelect = ({
  depto,
  value,
  onChange,
  label = "Municipio:",
}: {
  depto?: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) => {
  const list = depto ? GT_MUNICIPIOS[depto] || [] : [];
  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecciona</option>
        {list.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
    </Field>
  );
};

/* ============================== Componente ============================== */
export default function InfoTab({
  razonSocial,
  infoIndividual,
  setInfoIndividual,
  infoJuridico,
  setInfoJuridico,
}: Props) {
  /* ------- Estado local para upload de documento (Jurídico) ------- */
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const onDocFile = async (file?: File | null) => {
    if (!file) return;
    try {
      setDocError(null);
      setDocUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "doc-modificacion"); // opcional: para tu backend
      // AJUSTA este endpoint a tu ruta real de subida:
      const res = await fetch("/api/upload-empresa-doc", { method: "POST", body: fd });
      let data: any = {};
      try {
        data = await res.json();
      } catch {}
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "No se pudo subir el documento.");
      }
      setInfoJuridico((s: any) => ({ ...s, docModificacionUrl: data.url }));
    } catch (e: any) {
      setDocError(e?.message || "Error al subir el documento.");
    } finally {
      setDocUploading(false);
    }
  };

  /* ============================== Individual ============================== */
  if (razonSocial === "Individual") {
    return (
      <div className="space-y-8">
        <h2 className="text-xl font-semibold">Información General</h2>

        {/* 2 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="DPI o CUI:">
            <Input
              value={infoIndividual.dpi}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({ ...s, dpi: e.target.value }))
              }
            />
          </Field>

          <Field label="Versión del DPI:">
            <Input
              value={infoIndividual.versionDpi}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  versionDpi: e.target.value,
                }))
              }
            />
          </Field>

          <DateField
            label="Fecha de vencimiento del DPI:"
            value={infoIndividual.fechaVencDpi}
            onChange={(v) =>
              setInfoIndividual((s: any) => ({ ...s, fechaVencDpi: v }))
            }
          />

          <DateField
            label="Fecha de Nacimiento:"
            value={infoIndividual.fechaNac}
            onChange={(v) =>
              setInfoIndividual((s: any) => ({ ...s, fechaNac: v }))
            }
          />

          <DeptoSelect
            value={infoIndividual.deptoNac}
            onChange={(v) =>
              setInfoIndividual((s: any) => ({ ...s, deptoNac: v, muniNac: "" }))
            }
            label="Departamento de Nacimiento:"
          />
          <MuniSelect
            depto={infoIndividual.deptoNac}
            value={infoIndividual.muniNac}
            onChange={(v) =>
              setInfoIndividual((s: any) => ({ ...s, muniNac: v }))
            }
            label="Municipio de Nacimiento:"
          />

          <Field label="Género:">
            <Select
              value={infoIndividual.genero}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  genero: e.target.value,
                }))
              }
            >
              <option value="">Selecciona</option>
              <option>Masculino</option>
              <option>Femenino</option>
            </Select>
          </Field>

          <Field label="Estado Civil:">
            <Select
              value={infoIndividual.estadoCivil}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  estadoCivil: e.target.value,
                }))
              }
            >
              <option value="">Selecciona</option>
              <option>Soltero/a</option>
              <option>Casado/a</option>
              <option>Divorciado/a</option>
              <option>Viudo/a</option>
              <option>Unión de hecho</option>
            </Select>
          </Field>

          <Field label="Nacionalidad:">
            <Input
              value={infoIndividual.nacionalidad}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  nacionalidad: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Comunidad lingüística:">
            <Select
              value={infoIndividual.comunidadLinguistica}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  comunidadLinguistica: e.target.value,
                }))
              }
            >
              <option value="">Selecciona</option>
              <option>Maya</option>
              <option>Garífuna</option>
              <option>Xinca</option>
              <option>Ladino Mestizo</option>
            </Select>
          </Field>
        </div>

        <h3 className="text-lg font-semibold">Económico-profesional</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Select del catálogo SAT */}
          <Field label="Actividad económica principal (catálogo SAT):">
            <Select
              value={infoIndividual.actividadEconomica}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  actividadEconomica: e.target.value,
                }))
              }
            >
              <option value="">Selecciona</option>
              {(Array.isArray(ACTIVIDADES_SAT) ? ACTIVIDADES_SAT : []).map(
                (a) => (
                  <option key={a.codigo} value={a.codigo}>
                    {a.codigo} — {a.descripcion}
                  </option>
                )
              )}
            </Select>
          </Field>

          <Field label="Participación en cámara empresarial:">
            <Select
              value={infoIndividual.camaraEmpresarial}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  camaraEmpresarial: e.target.value,
                }))
              }
            >
              <option value="">Selecciona</option>
              <option>Sí</option>
              <option>No</option>
            </Select>
          </Field>

          <Field label="Participación en gremial:">
            <Select
              value={infoIndividual.gremial}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  gremial: e.target.value,
                }))
              }
            >
              <option value="">Selecciona</option>
              <option>Sí</option>
              <option>No</option>
            </Select>
          </Field>

          <Field label="Profesión:">
            <Input
              value={infoIndividual.profesion}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  profesion: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="Colegio de profesionales:">
            <Input
              value={infoIndividual.colegioProfesionales}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  colegioProfesionales: e.target.value,
                }))
              }
            />
          </Field>

          <Field label="No. de colegiado:">
            <Input
              value={infoIndividual.noColegiado}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  noColegiado: e.target.value,
                }))
              }
            />
          </Field>

          <DateField
            label="Fecha de colegiado:"
            value={infoIndividual.fechaColegiado}
            onChange={(v) =>
              setInfoIndividual((s: any) => ({ ...s, fechaColegiado: v }))
            }
          />
        </div>

        <h3 className="text-lg font-semibold">Dirección y ubicación Fiscal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DeptoSelect
            value={infoIndividual.depto}
            onChange={(v) =>
              setInfoIndividual((s: any) => ({ ...s, depto: v, muni: "" }))
            }
          />
          <MuniSelect
            depto={infoIndividual.depto}
            value={infoIndividual.muni}
            onChange={(v) => setInfoIndividual((s: any) => ({ ...s, muni: v }))}
          />
          <Field label="Zona:">
            <Input
              value={infoIndividual.zona}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({ ...s, zona: e.target.value }))
              }
            />
          </Field>

          <Field label="Grupo Habitacional:">
            <Select
              value={infoIndividual.grupoHabitacional}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  grupoHabitacional: e.target.value,
                }))
              }
            >
              <option value="">Selecciona</option>
              {[
                "Colonia",
                "Barrio",
                "Cantón",
                "Aldea",
                "Caserío",
                "Condominio",
                "Residencial",
                "Finca",
                "Asentamiento",
                "Lotificación",
                "Parcelamiento",
              ].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>

          <Field label="Nombre del Grupo Habitacional:">
            <Input
              value={infoIndividual.nombreGrupoHabitacional}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  nombreGrupoHabitacional: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="Vialidad y número:">
            <Input
              value={infoIndividual.vialidadNumero}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  vialidadNumero: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="Número y letra de casa o departamento:">
            <Input
              value={infoIndividual.numeroCasaDepto}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  numeroCasaDepto: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="Apartado Postal:">
            <Input
              value={infoIndividual.apartadoPostal}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  apartadoPostal: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="Dirección Fiscal Completa:">
            <Input
              value={infoIndividual.direccionFiscalCompleta}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  direccionFiscalCompleta: e.target.value,
                }))
              }
            />
          </Field>
        </div>

        <h3 className="text-lg font-semibold">Contacto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Teléfono celular:">
            <Input
              value={infoIndividual.telCel}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({ ...s, telCel: e.target.value }))
              }
            />
          </Field>
          <Field label="Compañía telefónica:">
            <Input
              value={infoIndividual.companiaTel}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  companiaTel: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="Correo electrónico principal:">
            <Input
              type="email"
              value={infoIndividual.correoPrincipal}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  correoPrincipal: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="Correo de Agencia Virtual y Notificaciones:">
            <Input
              type="email"
              value={infoIndividual.correoAv}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({ ...s, correoAv: e.target.value }))
              }
            />
          </Field>
          <Field label="Correo electrónico adicional:">
            <Input
              type="email"
              value={infoIndividual.correoAdicional}
              onChange={(e) =>
                setInfoIndividual((s: any) => ({
                  ...s,
                  correoAdicional: e.target.value,
                }))
              }
            />
          </Field>
        </div>
      </div>
    );
  }

  /* ============================== Jurídico ============================== */
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Información General</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Número de constitución:">
          <Input
            value={infoJuridico.numeroConstitucion}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                numeroConstitucion: e.target.value,
              }))
            }
          />
        </Field>

        <DateField
          label="Fecha de inscripción en el Registro Mercantil:"
          value={infoJuridico.fechaInscripcionRM}
          onChange={(v) =>
            setInfoJuridico((s: any) => ({ ...s, fechaInscripcionRM: v }))
          }
        />

        <Field label="Tipo de constitución:">
          <Select
            value={infoJuridico.tipoConstitucion}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                tipoConstitucion: e.target.value,
              }))
            }
          >
            <option value="">Selecciona</option>
            {[
              "Sociedad Anónima (S.A.)",
              "Sociedad de Responsabilidad Limitada (S.R.L.)",
              "Sociedad en Comandita Simple",
              "Sociedad en Comandita por Acciones",
              "Sociedad Colectiva",
              "Sociedad de Emprendimiento",
              "Sucursal de Empresa Extranjera",
              "Asociación",
              "Fundación",
              "Organización No Gubernamental (ONG)",
              "Cooperativa",
              "Entidad Estatal",
              "Municipalidad",
              "Copropiedad",
              "Fideicomiso",
              "Contrato de Participación",
              "Condominio",
              "Propiedad Horizontal",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>

        <DateField
          label="Fecha de constitución:"
          value={infoJuridico.fechaConstitucion}
          onChange={(v) =>
            setInfoJuridico((s: any) => ({ ...s, fechaConstitucion: v }))
          }
        />

        {/* ===== Documento de modificación: subir archivo + URL ===== */}
        <Field label="Documento de modificación (URL/archivo):">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <label className="text-sm bg-neutral-100 border border-neutral-300 hover:bg-neutral-200 px-3 py-1.5 rounded-lg cursor-pointer">
                {docUploading ? "Subiendo..." : "Subir archivo"}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => onDocFile(e.target.files?.[0] || null)}
                  disabled={docUploading}
                />
              </label>

              {infoJuridico.docModificacionUrl && (
                <a
                  href={infoJuridico.docModificacionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline text-sm"
                >
                  Ver archivo
                </a>
              )}
            </div>

            {/* Fallback/edición manual de URL */}
            <Input
              placeholder="(Opcional) URL del documento"
              value={infoJuridico.docModificacionUrl || ""}
              onChange={(e) =>
                setInfoJuridico((s: any) => ({
                  ...s,
                  docModificacionUrl: e.target.value,
                }))
              }
            />

            {docError && (
              <span className="text-sm text-red-600">{docError}</span>
            )}
          </div>
        </Field>
      </div>

      <h3 className="text-lg font-semibold">Dirección y ubicación Fiscal</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Departamento:">
          <Select
            value={infoJuridico.depto}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({ ...s, depto: e.target.value, muni: "" }))
            }
          >
            <option value="">Selecciona</option>
            {GT_DEPARTAMENTOS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Field>
        <Field label="Municipio:">
          <Select
            value={infoJuridico.muni}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({ ...s, muni: e.target.value }))
            }
          >
            <option value="">Selecciona</option>
            {(GT_MUNICIPIOS[infoJuridico.depto] || []).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="Zona:">
          <Input
            value={infoJuridico.zona}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({ ...s, zona: e.target.value }))
            }
          />
        </Field>

        <Field label="Grupo Habitacional:">
          <Select
            value={infoJuridico.grupoHabitacional}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                grupoHabitacional: e.target.value,
              }))
            }
          >
            <option value="">Selecciona</option>
            {[
              "Colonia",
              "Barrio",
              "Cantón",
              "Aldea",
              "Caserío",
              "Condominio",
              "Residencial",
              "Finca",
              "Asentamiento",
              "Lotificación",
              "Parcelamiento",
            ].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nombre del Grupo Habitacional:">
          <Input
            value={infoJuridico.nombreGrupoHabitacional}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                nombreGrupoHabitacional: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Vialidad y número:">
          <Input
            value={infoJuridico.vialidadNumero}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                vialidadNumero: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Número y letra de casa o departamento:">
          <Input
            value={infoJuridico.numeroCasaDepto}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                numeroCasaDepto: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Apartado Postal:">
          <Input
            value={infoJuridico.apartadoPostal}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                apartadoPostal: e.target.value,
              }))
            }
          />
        </Field>

        {/* Dirección Fiscal Completa a DOS columnas */}
        <div className="md:col-span-2">
          <Field label="Dirección Fiscal Completa:">
            <Input
              value={infoJuridico.direccionFiscalCompleta}
              onChange={(e) =>
                setInfoJuridico((s: any) => ({
                  ...s,
                  direccionFiscalCompleta: e.target.value,
                }))
              }
            />
          </Field>
        </div>
      </div>

      <h3 className="text-lg font-semibold">Contacto</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Teléfono celular:">
          <Input
            value={infoJuridico.telCel}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({ ...s, telCel: e.target.value }))
            }
          />
        </Field>
        <Field label="Compañía telefónica:">
          <Input
            value={infoJuridico.companiaTel}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                companiaTel: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Correo electrónico principal:">
          <Input
            type="email"
            value={infoJuridico.correoPrincipal}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                correoPrincipal: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Correo de Agencia Virtual y Notificaciones:">
          <Input
            type="email"
            value={infoJuridico.correoAv}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({ ...s, correoAv: e.target.value }))
            }
          />
        </Field>
        <Field label="Correo electrónico adicional:">
          <Input
            type="email"
            value={infoJuridico.correoAdicional}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                correoAdicional: e.target.value,
              }))
            }
          />
        </Field>
      </div>

      <h3 className="text-lg font-semibold">Datos del Representante Legal</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre del representante:">
          <Input
            value={infoJuridico.representanteNombre}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                representanteNombre: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="NIT Representante Legal:">
          <Input
            value={infoJuridico.representanteNit}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                representanteNit: e.target.value,
              }))
            }
          />
        </Field>

        <DateField
          label="Fecha de Nombramiento:"
          value={infoJuridico.fechaNombramiento}
          onChange={(v) =>
            setInfoJuridico((s: any) => ({ ...s, fechaNombramiento: v }))
          }
        />

        <Field label="Cantidad de años o meses:">
          <Input
            value={infoJuridico.cantidadTiempo}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                cantidadTiempo: e.target.value,
              }))
            }
          />
        </Field>

        <DateField
          label="Fecha de inscripción en el registro:"
          value={infoJuridico.fechaInscripcionRegistro}
          onChange={(v) =>
            setInfoJuridico((s: any) => ({ ...s, fechaInscripcionRegistro: v }))
          }
        />

        <DateField
          label="Fecha de vencimiento en el registro:"
          value={infoJuridico.fechaVencRegistro}
          onChange={(v) =>
            setInfoJuridico((s: any) => ({ ...s, fechaVencRegistro: v }))
          }
        />

        <Field label="Tipo de Representante:">
          <Select
            value={infoJuridico.tipoRepresentante}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                tipoRepresentante: e.target.value,
              }))
            }
          >
            <option value="">Selecciona</option>
            <option>Individual</option>
            <option>Jurídico</option>
          </Select>
        </Field>
        <Field label="Estado:">
          <Select
            value={infoJuridico.estadoRepresentante}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                estadoRepresentante: e.target.value,
              }))
            }
          >
            <option value="">Selecciona</option>
            <option>ACTIVO</option>
            <option>INACTIVO</option>
          </Select>
        </Field>
      </div>

      <h3 className="text-lg font-semibold">Datos del Notario Creador</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre del Notario:">
          <Input
            value={infoJuridico.notarioNombre}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                notarioNombre: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="NIT del notario:">
          <Input
            value={infoJuridico.notarioNit}
            onChange={(e) =>
              setInfoJuridico((s: any) => ({
                ...s,
                notarioNit: e.target.value,
              }))
            }
          />
        </Field>
      </div>
    </div>
  );
}
