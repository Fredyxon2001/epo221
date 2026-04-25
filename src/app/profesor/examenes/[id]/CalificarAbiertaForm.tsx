'use client';
import { useTransition, useState } from 'react';
import { calificarRespuestaAbierta } from '../actions';

export function CalificarAbiertaForm({ id, puntosMax }: { id: string; puntosMax: number }) {
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);
  return (
    <form
      action={(fd) => {
        fd.set('id', id);
        start(async () => { const r = await calificarRespuestaAbierta(fd); if (!r?.error) setOk(true); });
      }}
      className="flex gap-2 items-center mt-1"
    >
      <input name="puntos_obtenidos" type="number" step="0.1" min="0" max={puntosMax} required placeholder={`0 - ${puntosMax}`}
        className="w-20 border rounded px-2 py-1 text-xs" />
      <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" name="correcta" /> correcta</label>
      <button type="submit" disabled={pending} className="text-xs px-2 py-1 rounded bg-verde text-white font-semibold">
        {pending ? '…' : ok ? '✓' : 'Guardar'}
      </button>
    </form>
  );
}
