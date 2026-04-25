'use client';
import { useState, useTransition } from 'react';
import { calificarEntrega } from '../actions';

export function CalificarEntregaForm({ entrega, puntosMax }: { entrega: any; puntosMax: number }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-verde-oscuro font-semibold hover:underline">
        {entrega.calificacion != null ? 'Editar calificación →' : 'Calificar →'}
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('id', entrega.id);
        start(async () => {
          const r = await calificarEntrega(fd);
          if (r?.error) setErr(r.error);
          else setOpen(false);
        });
      }}
      className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2"
    >
      <div className="flex gap-2 items-end">
        <label className="block w-32">
          <span className="text-xs text-gray-600">Calificación (máx {puntosMax})</span>
          <input name="calificacion" type="number" step="0.1" min="0" max={puntosMax}
            defaultValue={entrega.calificacion ?? ''} required
            className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-gray-600">Retroalimentación</span>
        <textarea name="retroalimentacion" rows={2} defaultValue={entrega.retroalimentacion ?? ''}
          className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
      </label>
      {err && <div className="text-xs text-rose-700">{err}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-xs px-3 py-1.5 rounded border">Cancelar</button>
        <button type="submit" disabled={pending} className="text-xs px-3 py-1.5 rounded bg-verde text-white font-semibold disabled:opacity-50">
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
