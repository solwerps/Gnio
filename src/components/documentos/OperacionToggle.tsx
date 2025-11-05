//src/components/documentos/OperacionToggle.tsx

'use client';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OperacionToggle() {
  const router = useRouter();
  const sp = useSearchParams();
  const op = (sp.get('op') || 'compra').toLowerCase();

  const setOp = (next: 'compra' | 'venta') => {
    const params = new URLSearchParams(sp.toString());
    params.set('op', next);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="inline-flex rounded-xl border overflow-hidden">
      {(['compra', 'venta'] as const).map(v => (
        <button key={v}
          className={`px-3 py-1 text-sm ${op === v ? 'bg-black text-white' : 'bg-white'}`}
          onClick={() => setOp(v)}>
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
