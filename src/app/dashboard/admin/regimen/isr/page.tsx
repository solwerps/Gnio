// /src/app/dashboard/admin/regimen/isr/page.tsx
import Sidebar from '@/components/Sidebar';

export default function RegimenIsrPage() {
  return (
    <div className="min-h-screen flex">
      <Sidebar role="ADMIN" />
      <main className="flex-1 bg-slate-100">
        <div className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-bold">Régimen ISR</h1>

          {/* Placeholder: aquí luego pones la tabla ISR */}
          <div className="mt-6 rounded-xl bg-white shadow p-6">
            <p className="text-slate-600">
              Vista inicial de Régimen ISR (solo lectura).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
