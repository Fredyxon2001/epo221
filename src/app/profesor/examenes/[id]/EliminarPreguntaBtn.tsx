'use client';
import { useTransition } from 'react';
import { eliminarPregunta } from '../actions';

export function EliminarPreguntaBtn({ id, examenId }: { id: string; examenId: string }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending}
      onClick={() => { if (confirm('¿Eliminar pregunta?')) start(async () => { await eliminarPregunta(id, examenId); }); }}
      className="text-xs text-rose-600 hover:text-rose-800 shrink-0">🗑️</button>
  );
}
