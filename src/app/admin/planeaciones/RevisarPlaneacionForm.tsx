'use client';
import { useState, useTransition } from 'react';
import { revisarPlaneacion } from '@/app/planeaciones/actions';

export function RevisarPlaneacionForm({ id }: { id: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('id', id);
        start(async () => {
          const r = await revisarPlaneacion(fd);
          if (r?.error) setErr(r.error);
        });
      }}
      className="flex flex-col md:flex-row gap-2 items-stretch md:items-center"
    >
      <input
        name="observaciones"
        placeholder="Observaciones (opcional para aprobar, recomendada para rechazar)"
        className="flex-1 border rounded-lg px-3 py-2 text-xs"
      />
      <button type="submit" name="accion" value="aprobar" disabled={pending}
        className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-2 rounded text-xs disabled:opacity-50">
        ✅ Aprobar
      </button>
      <button type="submit" name="accion" value="rechazar" disabled={pending}
        className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-2 rounded text-xs disabled:opacity-50">
        ❌ Rechazar
      </button>
      {err && <div className="text-xs text-rose-700">{err}</div>}
    </form>
  );
}
