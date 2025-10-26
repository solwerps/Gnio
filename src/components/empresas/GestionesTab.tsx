//src/components/empresas/GestionesTab.tsx

"use client";

import { FolioLibro } from "@/types/empresas";

type Props = {
  folios: FolioLibro[];
  setFolios: (f: any)=>void;
  folioModal: { open: boolean; index: number | null };
  setFolioModal: (v: { open: boolean; index: number | null })=>void;
  folioAdd: number;
  setFolioAdd: (n: number)=>void;
};

export default function GestionesTab({
  folios, setFolios, folioModal, setFolioModal, folioAdd, setFolioAdd,
}: Props) {
  const openModal = (index: number) => setFolioModal({ open: true, index });
  const closeModal = () => setFolioModal({ open: false, index: null });

  const applyAdd = () => {
    if (folioModal.index == null) return;
    setFolios((arr: any[]) =>
      arr.map((f: FolioLibro, i: number) =>
        i === folioModal.index
          ? { ...f, disponibles: f.disponibles + folioAdd, ultimaFecha: new Date().toISOString().slice(0, 10) }
          : f
      )
    );
    closeModal();
    setFolioAdd(10);
  };

  const resetUsados = () => {
    if (folioModal.index == null) return;
    setFolios((arr: any[]) => arr.map((f: FolioLibro, i: number) => (i === folioModal.index ? { ...f, usados: 0 } : f)));
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">Gestionar Folios:</h3>
        <div className="rounded-xl overflow-hidden border border-neutral-200">
          <table className="w-full text-left">
            <thead className="bg-neutral-900 text-white">
              <tr>
                <th className="px-4 py-2">Libro Contable</th>
                <th className="px-4 py-2 w-[160px]">Folios Disponibles</th>
                <th className="px-4 py-2 w-[160px]">Contador de Folios</th>
                <th className="px-4 py-2 w-[180px]">Última fecha de habilitación</th>
                <th className="px-4 py-2 w-[90px]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {folios.map((f, i) => (
                <tr key={f.libro}>
                  <td className="px-4 py-3">{f.libro}</td>
                  <td className="px-4 py-3">{f.disponibles}</td>
                  <td className="px-4 py-3">{f.usados}</td>
                  <td className="px-4 py-3">{f.ultimaFecha ? f.ultimaFecha.split("-").reverse().join("/") : "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openModal(i)} className="rounded-full w-8 h-8 inline-flex items-center justify-center bg-green-500 text-white">+</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {folioModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl w-[640px] max-w-[95vw] p-6 relative">
            <button onClick={closeModal} className="absolute top-3 right-3 text-2xl text-neutral-500">×</button>
            <h3 className="text-2xl font-bold mb-1">Habilitar Libros</h3>
            <p className="text-blue-600 font-semibold mb-4">{folios[folioModal.index!]?.libro}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-sm text-neutral-500">Folios Disponibles:</div>
                <div className="text-2xl font-mono">{folios[folioModal.index!]?.disponibles}</div>
              </div>
              <div>
                <div className="text-sm text-neutral-500">Conteo de Folios:</div>
                <div className="text-2xl font-mono">{folios[folioModal.index!]?.usados}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setFolioAdd(Math.max(0, folioAdd - 10))} className="rounded-lg w-10 h-10 bg-red-500 text-white text-xl">–</button>
              <input type="number" value={folioAdd} onChange={(e)=>setFolioAdd(Number(e.target.value||0))} className="w-full rounded-xl border border-neutral-300 px-4 py-2"/>
              <button onClick={() => setFolioAdd(folioAdd + 10)} className="rounded-lg w-10 h-10 bg-green-500 text-white text-xl">+</button>
            </div>

            <div className="flex justify-between gap-3">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl bg-neutral-200">Cancelar</button>
              <button onClick={resetUsados} className="px-4 py-2 rounded-xl bg-neutral-900 text-white">Reiniciar el conteo de folios a 0</button>
              <button onClick={applyAdd} className="px-4 py-2 rounded-xl bg-green-600 text-white">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
