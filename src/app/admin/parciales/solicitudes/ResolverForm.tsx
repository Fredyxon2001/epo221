'use client';
import { useState, useTransition } from 'react';
import { resolverSolicitudParcial } from './actions';

export function ResolverForm({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const ejecutar = (accion: 'aprobar' | 'rechazar') => {
    setErr(null);
    let motivo: string | null = null;
    if (accion === 'rechazar') {
      motivo = window.prompt('Motivo del rechazo (recomendado)') ?? null;
    }
    const fd = new FormData();
    fd.set('id', id);
    fd.set('accion', accion);
    if (motivo) fd.set('motivo_rechazo', motivo);
    start(async () => {
      const r = await resolverSolicitudParcial(fd);
      if (r?.error) setErr(r.error);
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-amber-200 flex gap-2 items-center justify-end">
      {err && <span className="text-xs text-rose-700 mr-2">⚠️ {err}</span>}
      <button type="button" disabled={pending} onClick={() => ejecutar('rechazar')}
        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-50">
        ❌ Rechazar
      </button>
      <button type="button" disabled={pending} onClick={() => ejecutar('aprobar')}
        className="bg-verde hover:bg-verde-oscuro text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-50">
        ✅ Aprobar y crear/abrir
      </button>
    </div>
  );
}
