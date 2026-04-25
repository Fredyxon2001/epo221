'use client';
import { useTransition } from 'react';
import { eliminarEvidencia } from './actions';

export function EliminarEvidenciaBtn({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm('¿Eliminar esta evidencia?')) return;
        start(async () => { await eliminarEvidencia(id); });
      }}
      className="text-xs text-rose-600 hover:text-rose-800 shrink-0"
    >
      🗑️
    </button>
  );
}
