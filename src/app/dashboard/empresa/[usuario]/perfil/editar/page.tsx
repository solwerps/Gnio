// src/app/dashboard/empresa/[usuario]/perfil/editar/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Role = "ADMIN" | "CONTADOR" | "EMPRESA";

export default function EditarPerfilEmpresaPage() {
  const { usuario } = useParams<{ usuario: string }>();
  const router = useRouter();

  const [form, setForm] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Contraseñas
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "No se pudo cargar el perfil");
        setForm({ ...data, password: "", passwordConfirm: "" });
        setAvatarPreview(data.photoUrl ?? null);
      } catch (e: any) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [usuario]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let newUrl = form.photoUrl ?? null;
      let newPid = form.photoPublicId ?? null;

      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const up = await fetch("/api/upload-avatar", { method: "POST", body: fd });
        const j = await up.json();
        if (!up.ok) throw new Error(j?.error || "Error subiendo avatar");
        newUrl = j.url;
        newPid = j.publicId;
      }

      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          photoUrl: newUrl,
          photoPublicId: newPid,
          // backend: si password viene no-vacío, hashearla
        }),
      });
      const j2 = await res.json();
      if (!res.ok) throw new Error(j2?.error || "Error actualizando perfil");

      router.push(j2.redirect || `/dashboard/empresa/${usuario}/perfil`);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar role="EMPRESA" usuario={usuario as string} />
        <main className="flex-1 min-h-screen bg-gray-50 px-8 py-10">Cargando…</main>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex">
        <Sidebar role="EMPRESA" usuario={usuario as string} />
        <main className="flex-1 min-h-screen bg-gray-50 px-8 py-10 text-red-600">{error}</main>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar role="EMPRESA" usuario={usuario as string} />
      <main className="flex-1 min-h-screen bg-gray-50 px-8 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            Perfil Empresa/<span className="font-semibold">Editar</span>
          </h1>
          <a
            href={`/dashboard/empresa/${usuario}/perfil`}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300"
          >
            ← Volver a perfil
          </a>
        </div>
        <hr className="border-gray-200 mb-6" />

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-8 max-w-6xl">
          {/* Cabecera con avatar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <label className="col-span-1 flex flex-col items-center justify-center w-48 h-48 rounded-2xl border-2 border-gray-300 bg-gray-50 text-gray-400 select-none">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="preview" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-lg">Foto de perfil</span>
              )}
            </label>

            <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="w-full border rounded-xl px-3 py-2"
                >
                  <option value="EMPRESA">Empresa</option>
                  <option value="CONTADOR">Contador</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold mb-1">Nombre Completo</label>
                <input
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="md:col-span-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setAvatarFile(f);
                  setAvatarPreview(f ? URL.createObjectURL(f) : form.photoUrl ?? null);
                }}
                className="block w-full text-sm text-gray-600
                  file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                  file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {/* Datos generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ["Usuario", "username"],
              ["Correo", "email", "email"],
              ["Celular", "phone"],
              ["Empresa (razón social)", "companyName"],
              ["País", "country"],
              ["Dirección", "address"],
            ].map(([label, key, type], i) => (
              <div key={i}>
                <label className="block text-sm mb-1">{label}</label>
                <input
                  type={(type as string) || "text"}
                  className="w-full border rounded-xl px-3 py-2"
                  value={(form as any)[key] ?? ""}
                  onChange={(e) => setForm({ ...form, [key as string]: e.target.value })}
                />
              </div>
            ))}

            {/* Contraseña (opcional) */}
            <div>
              <label className="block text-sm mb-1">Nueva contraseña (opcional)</label>
              <div className="flex gap-2">
                <input
                  type={showPwd ? "text" : "password"}
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
                >
                  {showPwd ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <div className="flex gap-2">
                <input
                  type={showPwd2 ? "text" : "password"}
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd2((v) => !v)}
                  className="px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
                >
                  {showPwd2 ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
          </div>

          {/* Específicos EMPRESA */}
          <div>
            <h2 className="text-2xl font-semibold mt-2">Específicos</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <input
                className="border rounded-xl px-3 py-2 md:col-span-2"
                placeholder="Nombre de la empresa"
                value={form.companyName || ""}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
              <input
                className="border rounded-xl px-3 py-2"
                placeholder="NIT"
                value={form.nit || ""}
                onChange={(e) => setForm({ ...form, nit: e.target.value })}
              />
              <input
                className="border rounded-xl px-3 py-2"
                placeholder="DPI"
                value={form.dpi || ""}
                onChange={(e) => setForm({ ...form, dpi: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
