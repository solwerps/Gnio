// src/app/dashboard/admin/usuarios/[id]/editar/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type Role = "ADMIN" | "CONTADOR" | "EMPRESA";
type StatusOpt = "Activo" | "Inactivo";

export default function EditarUsuarioPage() {
  const { id } = useParams();
  const router = useRouter();

  const [form, setForm] = useState<any>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // UI: mostrar/ocultar & copiado
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [copied, setCopied] = useState<"pwd" | "pwd2" | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json();
      const user = data.find((u: any) => u.id === Number(id));
      if (!user) setError("Usuario no encontrado");
      else {
        setForm({ ...user, password: "", passwordConfirm: "" });
        setAvatarPreview(user.photoUrl ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  // Generador de contraseñas fuertes
  function generatePassword(len = 12) {
    const lowers = "abcdefghijklmnopqrstuvwxyz";
    const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const digits = "0123456789";
    const symbols = "!@#$%^&*()-_=+[]{};:,.?";
    const all = lowers + uppers + digits + symbols;

    // Garantizar al menos 1 de cada
    let pwd = [
      lowers[Math.floor(Math.random() * lowers.length)],
      uppers[Math.floor(Math.random() * uppers.length)],
      digits[Math.floor(Math.random() * digits.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    while (pwd.length < len) {
      pwd.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Mezclar
    for (let i = pwd.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
    }
    return pwd.join("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let newUrl = form.photoUrl ?? null;
      let newPid = form.photoPublicId ?? null;

      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        const r = await fetch("/api/upload-avatar", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Error subiendo avatar");
        newUrl = j.url;
        newPid = j.publicId;
      }

      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: form.id,
          oldPhotoPublicId: form.photoPublicId,
          photoUrl: newUrl,
          photoPublicId: newPid,
          // En el backend debes hashear si viene "password"
          // (si form.password es "", ignora el cambio)
        }),
      });
      const j2 = await res.json();
      if (!res.ok) throw new Error(j2?.error || "Error actualizando usuario");

      router.push("/dashboard/admin/usuarios");
    } catch (err: any) {
      setError(err.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  async function copyToClipboard(value: string, which: "pwd" | "pwd2") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // noop
    }
  }

  const pwdType = showPwd ? "text" : "password";
  const pwdType2 = showPwd2 ? "text" : "password";

  if (loading) return <p className="p-10">Cargando…</p>;
  if (error) return <p className="p-10 text-red-600">{error}</p>;

  return (
    <div className="flex">
      <Sidebar role="ADMIN" />
      <main className="flex-1 min-h-screen bg-gray-50 px-8 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Usuarios/<span className="font-semibold">Editar usuario</span>
        </h1>
        <hr className="border-gray-200 mb-6" />

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <label className="col-span-1 flex flex-col items-center justify-center w-48 h-48 rounded-2xl border-2 border-gray-300 bg-gray-50 text-gray-400 select-none">
              {avatarPreview ? (
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
                  <option value="ADMIN">Admin</option>
                  <option value="CONTADOR">Contador</option>
                  <option value="EMPRESA">Empresa</option>
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

          {/* Dos columnas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ["Usuario", "username"],
              ["Correo", "email", "email"],
              ["Celular", "phone"],
              ["Empresa General", "companyName"],
              ["País", "country"],
              ["Dirección", "address"],
            ].map(([label, key, type], i) => (
              <div key={i}>
                <label className="block text-sm mb-1">{label}</label>
                <input
                  type={type || "text"}
                  className="w-full border rounded-xl px-3 py-2"
                  value={(form as any)[key] ?? ""}
                  onChange={(e) => setForm({ ...form, [key as string]: e.target.value })}
                />
              </div>
            ))}

            {/* NUEVA CONTRASEÑA (opcional) */}
            <div>
              <label className="block text-sm mb-1">Nueva contraseña (opcional)</label>
              <div className="flex gap-2">
                <input
                  type={pwdType}
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
                  title={showPwd ? "Ocultar" : "Mostrar"}
                >
                  {showPwd ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(form.password || "", "pwd")}
                  className="px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
                  disabled={!form.password}
                  title="Copiar"
                >
                  {copied === "pwd" ? "Copiado" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = generatePassword(12);
                    setForm((f: any) => ({ ...f, password: p, passwordConfirm: p }));
                    setShowPwd(true);
                    setShowPwd2(true);
                  }}
                  className="px-3 py-2 rounded-lg border bg-blue-50 text-blue-700 hover:bg-blue-100"
                  title="Generar contraseña fuerte"
                >
                  Generar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Por seguridad no se muestra la contraseña actual del usuario (se guarda como hash). Aquí puedes establecer una nueva.
              </p>
            </div>

            {/* CONFIRMAR CONTRASEÑA */}
            <div>
              <label className="block text-sm mb-1">Confirmar contraseña</label>
              <div className="flex gap-2">
                <input
                  type={pwdType2}
                  className="w-full border rounded-xl px-3 py-2"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd2((v) => !v)}
                  className="px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
                  title={showPwd2 ? "Ocultar" : "Mostrar"}
                >
                  {showPwd2 ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(form.passwordConfirm || "", "pwd2")}
                  className="px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100"
                  disabled={!form.passwordConfirm}
                  title="Copiar"
                >
                  {copied === "pwd2" ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          </div>

          {/* Específicos */}
          <div>
            <h2 className="text-2xl font-semibold mt-2">Específicos</h2>
            {form.role === "ADMIN" && <p className="text-sm text-gray-500 mt-2">Admin no tiene campos extra.</p>}
            {form.role === "CONTADOR" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="NIT del Perito"
                  value={form.nit || ""}
                  onChange={(e) => setForm({ ...form, nit: e.target.value })}
                />
                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="DPI"
                  value={form.dpi || ""}
                  onChange={(e) => setForm({ ...form, dpi: e.target.value })}
                />
                <input
                  type="date"
                  className="border rounded-xl px-3 py-2"
                  value={form.appointmentDate ? String(form.appointmentDate).slice(0, 10) : ""}
                  onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                />
                <input
                  className="border rounded-xl px-3 py-2 md:col-span-2"
                  placeholder="Tipo de Prestación"
                  value={form.prestationType || ""}
                  onChange={(e) => setForm({ ...form, prestationType: e.target.value })}
                />
                <select
                  className="border rounded-xl px-3 py-2"
                  value={form.status || "Activo"}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StatusOpt })}
                >
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </div>
            )}
            {form.role === "EMPRESA" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <input
                  className="border rounded-xl px-3 py-2"
                  placeholder="Nombre de empresa"
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
            )}
          </div>

          {error && <p className="text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
            >
              {saving ? "Guardando..." : "Guardar Usuario"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
