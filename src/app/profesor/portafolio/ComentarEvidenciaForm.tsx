'use client';
import { useState, useTransition } from 'react';
import { comentarEvidencia } from '@/app/alumno/portafolio/actions';

export function ComentarEvidenciaForm({ id, current }: { id: string; current: string | null }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-verde-oscuro font-semibold hover:underline">
        {current ? 'Editar comentario →' : 'Comentar →'}
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('id', id);
        start(async () => {
          const r = await comentarEvidencia(fd);
          if (r?.error) setErr(r.error);
          else setOpen(false);
        });
      }}
      className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 space-y-2"
    >
      <textarea name="comentario" required defaultValue={current ?? ''} rows={2}
        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
      {err && <div className="text-xs text-rose-700">{err}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-xs px-3 py-1 rounded border">Cancelar</button>
        <button type="submit" disabled={pending} className="text-xs px-3 py-1 rounded bg-verde text-white font-semibold disabled:opacity-50">
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
