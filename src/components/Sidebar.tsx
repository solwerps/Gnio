// src/components/Sidebar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Role = 'ADMIN' | 'CONTADOR' | 'EMPRESA';

interface SidebarProps {
  role: Role;
  /** Slug/username del tenant. Obligatorio para CONTADOR y EMPRESA. */
  usuario?: string;
}

type ModuleItem = { name: string; path?: string; disabled?: boolean };

export default function Sidebar({ role, usuario }: SidebarProps) {
  const router = useRouter();
  const [regimenOpen, setRegimenOpen] = useState(false);

  // Validación temprana: CONTADOR/EMPRESA requieren 'usuario'
  const requiresSlug = role === 'CONTADOR' || role === 'EMPRESA';
  const missingSlug = requiresSlug && !usuario;

  const rolePath = useMemo<Role>(() => role, [role]);

  // base según rol (ADMIN no lleva slug; CONTADOR/EMPRESA sí)
  const base = useMemo(() => {
    if (rolePath === 'ADMIN') return '/dashboard/admin';
    // Si falta slug, dejamos una base "neutral" para evitar rutas rotas
    const safeUser = usuario ?? 'missing-slug';
    return rolePath === 'CONTADOR'
      ? `/dashboard/contador/${safeUser}`
      : `/dashboard/empresa/${safeUser}`;
  }, [rolePath, usuario]);

  // Cerrar sesión (ajusta a tu endpoint real si cambia)
  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  const headerTitle =
    role === 'CONTADOR'
      ? `Oficina Contable ${usuario ? `— ${usuario}` : ''}`
      : role === 'EMPRESA'
      ? `SECA Empresa ${usuario ? `— ${usuario}` : ''}`
      : 'SECA (Admin)';

  // Menú por rol, siempre construyendo rutas con 'base'
  const modules: ModuleItem[] =
    role === 'ADMIN'
      ? [
          { name: 'Dashboard', path: `${base}` },
          { name: 'Usuarios', path: `${base}/usuarios` },
          { name: 'Configuración', path: `${base}/configuracion` },
          // ✅ NUEVO botón para ADMIN:
          { name: 'Prueba Régimen', path: `${base}/regimen/iva` }, // /dashboard/admin/regimen/iva
        ]
      : role === 'CONTADOR'
      ? [
          { name: 'Dashboard', path: `${base}`, disabled: missingSlug },
          { name: 'Perfil', path: `${base}/perfil`, disabled: missingSlug },
          { name: 'Nomenclatura', path: `${base}/nomenclatura`, disabled: missingSlug },
          { name: 'Empresas', path: `${base}/empresas`, disabled: missingSlug },
          { name: 'Configuración', path: `${base}/configuracion`, disabled: missingSlug },
        ]
      : [
          { name: 'Dashboard', path: `${base}`, disabled: missingSlug },
          { name: 'Perfil', path: `${base}/perfil`, disabled: missingSlug },
          { name: 'Nomenclatura', path: `${base}/nomenclatura`, disabled: missingSlug },
          // Si además tienes una vista general de "Regimen" además del dropdown, déjala:
/*           { name: 'Regimen', path: `${base}/regimen`, disabled: missingSlug }, */
          { name: 'Sucursales', path: `${base}/sucursales`, disabled: missingSlug },
          { name: 'Configuración', path: `${base}/configuracion`, disabled: missingSlug },
        ];

  // Rutas del submenú Régimen (aparecen después de "Nomenclatura")
  const regimenIvaPath = `${base}/regimen/iva`;
  const regimenIsrPath = `${base}/regimen/isr`;

  // Insertamos el dropdown después de "Nomenclatura" (si existe)
  const insertAfterIndex = modules.findIndex((m) => m.name === 'Nomenclatura');

  return (
    <div className="flex flex-col w-64 h-screen bg-slate-900 text-white">
      <div className="flex items-center justify-center h-16 border-b border-slate-700">
        <h1 className="text-xl font-bold">{headerTitle}</h1>
      </div>

      {missingSlug && (
        <div className="px-4 py-2 text-sm text-yellow-300 bg-slate-800 border-b border-slate-700">
          Falta el <b>usuario</b> (slug) para construir las rutas del entorno.
        </div>
      )}

      <nav className="flex-1 p-4 space-y-2">
        {modules.map((m, i) => (
          <div key={m.name}>
            <button
              onClick={() => {
                if (m.disabled) return;
                if (m.path) router.push(m.path);
              }}
              className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
                m.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-slate-700'
              }`}
              disabled={!!m.disabled}
              title={m.disabled ? 'Completa el slug de usuario para navegar' : undefined}
            >
              <span>{m.name}</span>
            </button>

            {/* Dropdown "Régimen" solo si hay "Nomenclatura" en el menú (no aplica para ADMIN) */}
            {i === insertAfterIndex && insertAfterIndex !== -1 && role !== 'ADMIN' && (
              <div
                className="relative mt-1"
                onMouseEnter={() => setRegimenOpen(true)}
                onMouseLeave={() => setRegimenOpen(false)}
              >
                <button
                  onClick={() => setRegimenOpen((v) => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded transition ${
                    regimenOpen ? 'bg-slate-700' : 'hover:bg-slate-700'
                  } ${missingSlug ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={missingSlug}
                  title={missingSlug ? 'Completa el slug de usuario para navegar' : undefined}
                >
                  <span>Régimen</span>
                  <span className={`transition-transform ${regimenOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {regimenOpen && !missingSlug && (
                  <div className="mt-2 ml-2 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shadow-lg">
                    <button
                      onClick={() => router.push(regimenIvaPath)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-700"
                    >
                      Régimen IVA
                    </button>
                    <button
                      onClick={() => router.push(regimenIsrPath)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-700"
                    >
                      Régimen ISR
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 bg-red-600 rounded hover:bg-red-700 transition"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
