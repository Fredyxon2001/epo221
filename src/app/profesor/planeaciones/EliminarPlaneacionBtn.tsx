'use client';
import { useTransition } from 'react';
import { eliminarPlaneacion } from '@/app/planeaciones/actions';

export function EliminarPlaneacionBtn({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => { if (confirm('¿Eliminar esta versión de la planeación?')) start(async () => { await eliminarPlaneacion(id); }); }}
      className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-2 py-1 rounded disabled:opacity-50"
    >
      Eliminar
    </button>
  );
}
