//src/app/dashboard/admin/usuarios/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

type Role = 'ADMIN' | 'CONTADOR' | 'EMPRESA';

interface UserListItem {
  id: number;
  username: string;
  name?: string | null;
  email: string;
  role: Role;
  phone?: string | null;
  companyName?: string | null;
  country?: string | null;
  address?: string | null;
  nit?: string | null;
  dpi?: string | null;
  appointmentDate?: string | null;
  prestationType?: string | null;
  status?: string | null;
  photo?: string | null;
  createdAt: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (!res.ok) {
        console.error("Error al cargar usuarios:", res.status);
        setUsuarios([]);
        return;
      }
      const data = await res.json();
      setUsuarios(data);
    } catch (err) {
      console.error("Error inesperado al cargar usuarios:", err);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Dividir por rol
  const admins = useMemo(() => usuarios.filter(u => u.role === 'ADMIN'), [usuarios]);
  const empresas = useMemo(() => usuarios.filter(u => u.role === 'EMPRESA'), [usuarios]);
  const contadores = useMemo(() => usuarios.filter(u => u.role === 'CONTADOR'), [usuarios]);

  // Botón eliminar (reusa tu endpoint)
  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadUsers();
  };

  // Componente tabla reutilizable
  const Table = ({
    title,
    data,
    showRole = false,
    roleLabel,
  }: {
    title: string;
    data: UserListItem[];
    showRole?: boolean;
    roleLabel?: string;
  }) => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">
          {title} <span className="text-gray-500">({data.length})</span>
        </h2>
        {roleLabel && (
          <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700">
            {roleLabel}
          </span>
        )}
      </div>

      <div className="overflow-x-auto border rounded bg-white shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Usuario</th>
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Correo</th>
              {showRole && <th className="p-2 border">Rol</th>}
              <th className="p-2 border">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td className="p-4 border text-center text-gray-500" colSpan={showRole ? 6 : 5}>
                  No hay usuarios en esta categoría.
                </td>
              </tr>
            )}

            {data.map((u) => {
              const isRootAdmin = u.id === 1 && u.role === "ADMIN";
              return (
                <tr key={u.id} className="border hover:bg-gray-50">
                  <td className="p-2 border">{u.id}</td>
                  <td className="p-2 border">{u.username}</td>
                  <td className="p-2 border">{u.name ?? '-'}</td>
                  <td className="p-2 border">{u.email}</td>
                  {showRole && <td className="p-2 border">{u.role}</td>}
                  <td className="p-2 border">
                    {isRootAdmin ? (
                      <div className="flex gap-2">
                        <button
                          disabled
                          className="px-2 py-1 bg-gray-400 text-white rounded text-xs cursor-not-allowed flex items-center gap-1"
                          title="Usuario administrador raíz"
                        >
                          🔒 Editar
                        </button>
                        <button
                          disabled
                          className="px-2 py-1 bg-gray-400 text-white rounded text-xs cursor-not-allowed flex items-center gap-1"
                          title="Usuario administrador raíz"
                        >
                          🔒 Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/admin/usuarios/${u.id}/editar`)}
                          className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar role="ADMIN" />

      {/* Contenido principal */}
      <main className="flex-1 p-10 bg-gray-100 min-h-screen">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <button
            onClick={() => router.push('/dashboard/admin/usuarios/crear')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Agregar Usuario
          </button>
        </div>

        {/* Estado de carga */}
        {loading ? (
          <div className="space-y-4">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-40 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-40 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-40 w-full bg-gray-200 animate-pulse rounded" />
          </div>
        ) : (
          <>
            {/* Tabla 1: Administradores */}
            <Table
              title="Administradores"
              data={admins}
              // En esta tabla el rol es redundante, pero puedes mostrarlo si quieres:
              showRole={false}
              roleLabel="ADMIN"
            />

            {/* Tabla 2: Empresas */}
            <Table
              title="Empresas"
              data={empresas}
              showRole={false}
              roleLabel="EMPRESA"
            />

            {/* Tabla 3: Oficina Contable / Contadores */}
            <Table
              title="Oficina Contable"
              data={contadores}
              showRole={false}
              roleLabel="CONTADOR"
            />
          </>
        )}
      </main>
    </div>
  );
}
