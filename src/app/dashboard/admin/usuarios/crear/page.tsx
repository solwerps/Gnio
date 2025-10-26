//src/app/dashboard/admin/usuarios/crear/page.tsx
"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";

type Role = "ADMIN" | "CONTADOR" | "EMPRESA";
type StatusOpt = "Activo" | "Inactivo";

export default function CrearUsuarioPage() {
  const [form, setForm] = useState({
    role: "" as Role,
    username: "", name: "", email: "",
    phone: "", companyName: "",
    country: "", address: "",
    password: "", passwordConfirm: "",
    nit: "", dpi: "",
    appointmentDate: "", prestationType: "", status: "Activo" as StatusOpt,
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.role) return setError("Elige el rol del usuario");
    if (form.password !== form.passwordConfirm) return setError("Las contraseñas no coinciden");

    setSaving(true);
    try {
      let photoUrl: string | null = null;
      let photoPublicId: string | null = null;

      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        // opcional multi-tenant: fd.append("tenant", "cliente-001");
        const r = await fetch("/api/upload-avatar", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Error subiendo avatar");
        photoUrl = j.url;
        photoPublicId = j.publicId;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photoUrl, photoPublicId }),
      });
      const j2 = await res.json();
      if (!res.ok) throw new Error(j2?.error || "Error al crear usuario");

      window.location.href = "/dashboard/admin/usuarios";
    } catch (err: any) {
      setError(err.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar role="ADMIN" />
      <main className="flex-1 min-h-screen bg-gray-50 px-8 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Usuarios/<span className="font-semibold">Crear usuarios</span></h1>
        <hr className="border-gray-200 mb-6" />

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Foto */}
            <label className="col-span-1 flex flex-col items-center justify-center w-48 h-48 rounded-2xl border-2 border-gray-300 bg-gray-50 text-gray-400 select-none">
              {avatarPreview ? (
                <img src={avatarPreview} alt="preview" className="w-full h-full object-cover rounded-2xl" />
              ) : (<span className="text-lg">Foto de perfil</span>)}
            </label>

            <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Elegir el Rol del usuario</label>
                <select value={form.role} onChange={(e)=>setForm({...form, role: e.target.value as Role})}
                        className="w-full border rounded-xl px-3 py-2">
                  <option value="">Selecciona</option>
                  <option value="ADMIN">Admin</option>
                  <option value="CONTADOR">Contador</option>
                  <option value="EMPRESA">Empresa</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold mb-1">Nombre Completo</label>
                <input className="w-full border rounded-xl px-3 py-2"
                       value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})}/>
              </div>
            </div>

            <div className="md:col-span-3">
              <input type="file" accept="image/*"
                onChange={(e)=>{ const f=e.target.files?.[0]||null; setAvatarFile(f); setAvatarPreview(f?URL.createObjectURL(f):null); }}
                className="block w-full text-sm text-gray-600
                  file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                  file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            </div>
          </div>

          {/* Campos en dos columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ["Usuario","username"],
              ["Correo","email","email"],
              ["Celular","phone"],
              ["Empresa General","companyName"],
              ["País","country"],
              ["Dirección","address"],
            ].map(([label,key,type],i)=>(
              <div key={i}>
                <label className="block text-sm mb-1">{label}</label>
                <input type={type||"text"} className="w-full border rounded-xl px-3 py-2"
                  value={(form as any)[key]} onChange={(e)=>setForm({...form, [key]: e.target.value})}/>
              </div>
            ))}
            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <input type="password" className="w-full border rounded-xl px-3 py-2"
                     value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})}/>
            </div>
            <div>
              <label className="block text-sm mb-1">Validar Contraseña</label>
              <input type="password" className="w-full border rounded-xl px-3 py-2"
                     value={form.passwordConfirm} onChange={(e)=>setForm({...form, passwordConfirm:e.target.value})}/>
            </div>
          </div>

          {/* Específicos */}
          <div>
            <h2 className="text-2xl font-semibold mt-2">Específicos</h2>
            {form.role === "ADMIN" && <p className="text-sm text-gray-500 mt-2">Admin no tiene campos extra.</p>}
            {form.role === "CONTADOR" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <input className="border rounded-xl px-3 py-2" placeholder="NIT del Perito"
                       value={form.nit} onChange={(e)=>setForm({...form, nit:e.target.value})}/>
                <input className="border rounded-xl px-3 py-2" placeholder="DPI"
                       value={form.dpi} onChange={(e)=>setForm({...form, dpi:e.target.value})}/>
                <input type="date" className="border rounded-xl px-3 py-2"
                       value={form.appointmentDate}
                       onChange={(e)=>setForm({...form, appointmentDate:e.target.value})}/>
                <input className="border rounded-xl px-3 py-2 md:col-span-2" placeholder="Tipo de Prestación"
                       value={form.prestationType} onChange={(e)=>setForm({...form, prestationType:e.target.value})}/>
                <select className="border rounded-xl px-3 py-2"
                        value={form.status}
                        onChange={(e)=>setForm({...form, status:e.target.value as StatusOpt})}>
                  <option>Activo</option><option>Inactivo</option>
                </select>
              </div>
            )}
            {form.role === "EMPRESA" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <input className="border rounded-xl px-3 py-2" placeholder="Nombre de empresa"
                       value={form.companyName} onChange={(e)=>setForm({...form, companyName:e.target.value})}/>
                <input className="border rounded-xl px-3 py-2" placeholder="NIT"
                       value={form.nit} onChange={(e)=>setForm({...form, nit:e.target.value})}/>
                <input className="border rounded-xl px-3 py-2" placeholder="DPI"
                       value={form.dpi} onChange={(e)=>setForm({...form, dpi:e.target.value})}/>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700">
              {saving ? "Guardando..." : "Guardar Usuario"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
