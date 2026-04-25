'use client';
import { useTransition } from 'react';
import { cerrarPeriodoEval } from '@/app/eval-docente/actions';

export function CerrarPeriodoBtn({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => { if (confirm('¿Cerrar periodo?')) start(async () => { await cerrarPeriodoEval(id); }); }}
      className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-2 py-1 rounded">
      Cerrar
    </button>
  );
}
