'use client';
import { useState, useTransition } from 'react';
import { entregarTarea } from '../actions';

export function EntregarTareaForm({ tareaId, permiteArchivos }: { tareaId: string; permiteArchivos: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        fd.set('tarea_id', tareaId);
        start(async () => {
          const r = await entregarTarea(fd);
          if (r?.error) setErr(r.error);
          else setOk(true);
        });
      }}
      className="space-y-3 text-sm"
    >
      <label className="block">
        <span className="text-xs text-gray-600">Comentario (opcional)</span>
        <textarea name="comentario" rows={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>

      {permiteArchivos && (
        <label className="block">
          <span className="text-xs text-gray-600">Archivo (máx 25 MB)</span>
          <input name="archivo" type="file" className="mt-1 w-full text-xs" />
        </label>
      )}

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}
      {ok && <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded p-2">✅ Entrega registrada.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Enviando…' : 'Enviar entrega'}
        </button>
      </div>
    </form>
  );
}
