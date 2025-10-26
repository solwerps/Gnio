// src/app/dashboard/contador/[usuario]/empresas/crear/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";

import TabLoading from "@/components/empresas/TabLoading";
import { Field, Input, Select, Option } from "@/components/empresas/ui";
import { BANCOS_SUGERIDOS, LIBROS } from "@/components/empresas/constants";

import {
  CuentaBancariaForm,
  CuentaOpt,
  FolioLibro,
  NomenclaturaOption,
  ObligacionRow,
  RazonSocial,
  RegimenOption,
} from "@/types/empresas";

// ==== Carga diferida de secciones (code-splitting) ====
const InfoTab = dynamic(() => import("@/components/empresas/InfoTab"), { loading: () => <TabLoading /> });
const AfiliacionesTab = dynamic(() => import("@/components/empresas/AfiliacionesTab"), { loading: () => <TabLoading /> });
const GestionesTab = dynamic(() => import("@/components/empresas/GestionesTab"), { loading: () => <TabLoading /> });
const BancosTab = dynamic(() => import("@/components/empresas/BancosTab"), { loading: () => <TabLoading /> });
const UsuariosSucursalesTab = dynamic(() => import("@/components/empresas/UsuariosSucursalesTab"), { loading: () => <TabLoading /> });

export default function CrearEmpresaPage() {
  const router = useRouter();
  const params = useParams<{ usuario: string }>();
  const search = useSearchParams();
  const tenant = search.get("tenant") || params.usuario;

  // Cabecera (4 datos + foto)
  const [razonSocial, setRazonSocial] = useState<RazonSocial>("Individual");
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [sector, setSector] = useState("");

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [tab, setTab] = useState<"info"|"afiliaciones"|"gestiones"|"bancos"|"usuarios">("info");

  // Afiliaciones
  const [regimenIvaList, setRegimenIvaList] = useState<RegimenOption[]>([]);
  const [regimenIsrList, setRegimenIsrList] = useState<RegimenOption[]>([]);
  const [nomenList, setNomenList] = useState<NomenclaturaOption[]>([]);
  const [cuentasNomen, setCuentasNomen] = useState<CuentaOpt[]>([]);
  const [regimenIvaId, setRegimenIvaId] = useState<number | undefined>();
  const [regimenIsrId, setRegimenIsrId] = useState<number | undefined>();
  const [nomenclaturaId, setNomenclaturaId] = useState<number | undefined>();
  const [obligaciones, setObligaciones] = useState<ObligacionRow[]>([
    { id: crypto.randomUUID(), impuesto: "IVA" },
    { id: crypto.randomUUID(), impuesto: "ISR" },
    { id: crypto.randomUUID(), impuesto: "ISO" },
    { id: crypto.randomUUID(), impuesto: "Otro" },
  ]);

  // Gestiones (folios)
  const [folios, setFolios] = useState<FolioLibro[]>(
    LIBROS.map((libro) => ({ libro, disponibles: 0, usados: 0, ultimaFecha: null }))
  );
  const [folioModal, setFolioModal] = useState<{ open: boolean; index: number | null }>({ open:false, index:null });
  const [folioAdd, setFolioAdd] = useState<number>(10);

  // Cuentas bancarias
  const [cuentaTmp, setCuentaTmp] = useState<CuentaBancariaForm>({
    numero: "", banco: "", descripcion: "", moneda: "GTQ", saldoInicial: 0, cuentaContableId: undefined,
  });
  const [cuentas, setCuentas] = useState<CuentaBancariaForm[]>([]);

  // Info específica
  const [infoIndividual, setInfoIndividual] = useState<any>({
    dpi:"", versionDpi:"", fechaVencDpi:"", fechaNac:"", deptoNac:"", muniNac:"",
    genero:"", estadoCivil:"", nacionalidad:"Guatemalteca", comunidadLinguistica:"",
    actividadEconomica:"", camaraEmpresarial:"", gremial:"", profesion:"",
    colegioProfesionales:"", noColegiado:"", fechaColegiado:"",
    depto:"", muni:"", zona:"", grupoHabitacional:"", nombreGrupoHabitacional:"",
    vialidadNumero:"", numeroCasaDepto:"", apartadoPostal:"", direccionFiscalCompleta:"",
    telCel:"", companiaTel:"", correoPrincipal:"", correoAv:"", correoAdicional:"",
  });

  const [infoJuridico, setInfoJuridico] = useState<any>({
    numeroConstitucion:"", fechaInscripcionRM:"", tipoConstitucion:"", fechaConstitucion:"", docModificacionUrl:"",
    depto:"", muni:"", zona:"", grupoHabitacional:"", nombreGrupoHabitacional:"",
    vialidadNumero:"", numeroCasaDepto:"", apartadoPostal:"", direccionFiscalCompleta:"",
    telCel:"", companiaTel:"", correoPrincipal:"", correoAv:"", correoAdicional:"",
    representanteNombre:"", representanteNit:"", fechaNombramiento:"", cantidadTiempo:"",
    fechaInscripcionRegistro:"", fechaVencRegistro:"", tipoRepresentante:"", estadoRepresentante:"",
    notarioNombre:"", notarioNit:"",
  });

  // ========= Loader de listas (IVA/ISR/Nomenclaturas) =========
  const reloadLists = async () => {
    try {
      const [iva, isr, nom] = await Promise.all([
        fetch(`/api/regimen/iva?tenant=${tenant}`, { cache: "no-store", credentials: "include" }).then((r)=>r.json()),
        fetch(`/api/regimen/isr?tenant=${tenant}`, { cache: "no-store", credentials: "include" }).then((r)=>r.json()),
        fetch(`/api/nomenclaturas?tenant=${tenant}`, { cache: "no-store", credentials: "include" }).then((r)=>r.json()),
      ]);

      setRegimenIvaList((Array.isArray(iva?.data)?iva.data:[]).map((x:any)=>({ id:x.id, regimenSistema:x.regimenSistema })));
      setRegimenIsrList((Array.isArray(isr?.data)?isr.data:[]).map((x:any)=>({ id:x.id, regimenSistema:x.regimenSistema })));
      setNomenList((Array.isArray(nom?.data)?nom.data:[]).map((x:any)=>({ id:x.id, nombre:x.nombre })));
    } catch (e) {
      console.error(e);
      setRegimenIvaList([]); setRegimenIsrList([]); setNomenList([]);
    }
  };

  useEffect(() => { reloadLists(); }, [tenant]);

  // Cargar cuentas contables de una nomenclatura seleccionada
  useEffect(() => {
    (async () => {
      if (!nomenclaturaId) { setCuentasNomen([]); return; }
      try {
        // 👇 IMPORTANTE: aquí el :id es localId (por-tenant)
        const res = await fetch(`/api/nomenclaturas/${nomenclaturaId}/cuentas?tenant=${tenant}`, { cache: "no-store", credentials: "include" });
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setCuentasNomen(items.map((c:any)=>({
          id:c.id, codigo:c.cuenta || c.codigo || "", descripcion:c.descripcion || c.nombre || "",
        })));
      } catch (e) { console.error(e); setCuentasNomen([]); }
    })();
  }, [nomenclaturaId, tenant]);

  // Subir avatar
  const onFileInput = async (file?: File | null) => {
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append("avatar", file);
    fd.append("tenant", tenant as string);
    const res = await fetch("/api/upload-avatar-route", { method: "POST", body: fd });
    let data: any = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) { alert(data?.error || "No se pudo subir la imagen."); return; }
    setAvatarUrl(data.url);
  };

  const coreValid = !!(nombre.trim() && nit.trim() && sector.trim() && (razonSocial==="Individual" || razonSocial==="Juridico"));

  const onGuardar = async () => {
    if (!coreValid) { alert("Completa Nombre, NIT, Sector Económico y Razón Social."); return; }

    const payload = {
      tenant, nombre, nit,
      sectorEconomico: sector,
      razonSocial, avatarUrl,
      afiliaciones: { regimenIvaId, regimenIsrId, obligaciones, nomenclaturaId },
      gestiones: { folios, correlativos: [] },
      cuentasBancarias: cuentas,
      info: razonSocial==="Individual" ? { tipo:"Individual", ...infoIndividual } : { tipo:"Juridico", ...infoJuridico },
    };

    const res = await fetch(`/api/empresas?tenant=${tenant}`, {
      method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload),
    });

    if (!res.ok) { console.error(await res.text()); alert("No se pudo guardar la empresa."); return; }

    router.push(`/dashboard/contador/${params.usuario}/empresas${search.toString()?`?${search.toString()}`:""}`);
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* Sidebar SIEMPRE de Contador */}
      <Sidebar role="CONTADOR" usuario={String(params.usuario)} active="Empresas" />

      <main className="flex-1 p-6 lg:p-10 bg-white">
        <div className="max-w-[1100px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between">
            <h1 className="text-4xl font-bold">Crear perfil de empresa</h1>
            <button
              onClick={onGuardar as any}
              disabled={!coreValid}
              className={`rounded-xl px-5 py-2 text-white shadow ${coreValid ? "bg-blue-600 hover:bg-blue-700":"bg-blue-300 cursor-not-allowed"}`}
            >
              Guardar Empresa
            </button>
          </div>

          {/* Cabecera 4 campos + foto */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
            {/* Foto */}
            <div className="flex flex-col items-center">
              <div className="w-[160px] h-[160px] rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                {avatarPreview || avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(avatarPreview || avatarUrl)!} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-neutral-500">Foto de perfil</span>
                )}
              </div>
              <label className="mt-3 text-sm bg-neutral-100 border border-neutral-300 hover:bg-neutral-200 px-3 py-1.5 rounded-lg cursor-pointer">
                Subir foto
                <input type="file" accept="image/*" className="hidden" onChange={(e)=>onFileInput(e.target.files?.[0] || null)} />
              </label>
            </div>

            {/* 4 campos */}
            <div className="grid grid-cols-1 gap-4">
              <Field label="Nombre de empresa:"><Input value={nombre} onChange={(e)=>setNombre(e.target.value)} /></Field>
              <Field label="NIT:"><Input value={nit} onChange={(e)=>setNit(e.target.value)} /></Field>
              <Field label="Sector Económico:"><Input value={sector} onChange={(e)=>setSector(e.target.value)} /></Field>
              <Field label="Razón Social:">
                <Select value={razonSocial} onChange={(e)=>setRazonSocial(e.target.value as RazonSocial)}>
                  <Option value="Individual" label="Individual" />
                  <Option value="Juridico"   label="Jurídico" />
                </Select>
              </Field>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-t pt-6">
            <div className="flex flex-wrap gap-3">
              {[
                ["info","Información General y específica"],
                ["afiliaciones","Afiliaciones"],
                ["gestiones","Gestiones"],
                ["bancos","Cuentas bancarias"],
                ["usuarios","Usuarios y Sucursales"],
              ].map(([id,label])=>(
                <button
                  key={id}
                  onClick={()=>setTab(id as any)}
                  className={`px-4 py-1.5 rounded-lg border ${tab===id ? "bg-black text-white border-black":"bg-white text-black border-neutral-300"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {tab==="info" && (
                <InfoTab
                  razonSocial={razonSocial}
                  infoIndividual={infoIndividual} setInfoIndividual={setInfoIndividual}
                  infoJuridico={infoJuridico} setInfoJuridico={setInfoJuridico}
                />
              )}

              {tab==="afiliaciones" && (
                <AfiliacionesTab
                  Field={Field} Select={Select} Input={Input}
                  regimenIvaList={regimenIvaList} regimenIsrList={regimenIsrList} nomenList={nomenList}
                  regimenIvaId={regimenIvaId} setRegimenIvaId={setRegimenIvaId}
                  regimenIsrId={regimenIsrId} setRegimenIsrId={setRegimenIsrId}
                  nomenclaturaId={nomenclaturaId} setNomenclaturaId={setNomenclaturaId}
                  obligaciones={obligaciones} setObligaciones={setObligaciones}
                  onReloadLists={reloadLists}
                />
              )}

              {tab==="gestiones" && (
                <GestionesTab
                  folios={folios} setFolios={setFolios}
                  folioModal={folioModal} setFolioModal={setFolioModal}
                  folioAdd={folioAdd} setFolioAdd={setFolioAdd}
                />
              )}

              {tab==="bancos" && (
                <BancosTab
                  Field={Field} Input={Input} Select={Select}
                  cuentaTmp={cuentaTmp} setCuentaTmp={setCuentaTmp}
                  cuentas={cuentas} setCuentas={setCuentas}
                  bancosSugeridos={BANCOS_SUGERIDOS}
                  cuentasNomen={cuentasNomen}
                />
              )}

              {tab==="usuarios" && <UsuariosSucursalesTab />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
