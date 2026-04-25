'use client';
import { useTransition } from 'react';
import { eliminarHorarioTutoria } from '@/app/tutorias/actions';

export function EliminarHorarioBtn({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} onClick={() => { if (confirm('¿Eliminar?')) start(async () => { await eliminarHorarioTutoria(id); }); }}
      className="text-xs text-rose-600 hover:text-rose-800">🗑️</button>
  );
}
