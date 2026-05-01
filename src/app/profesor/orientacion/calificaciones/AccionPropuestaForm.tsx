'use client';
import { useState, useTransition } from 'react';
import { validarPropuesta } from '@/app/profesor/calificaciones-proponer/actions';

export function AccionPropuestaForm({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const ejecutar = (accion: 'validar' | 'rechazar') => {
    setErr(null);
    let motivo: string | null = null;
    if (accion === 'rechazar') {
      motivo = window.prompt('Motivo del rechazo (opcional)') ?? null;
    }
    const fd = new FormData();
    fd.set('id', id);
    fd.set('accion', accion);
    if (motivo) fd.set('motivo', motivo);
    start(async () => {
      const r = await validarPropuesta(fd);
      if (r?.error) setErr(r.error);
    });
  };

  return (
    <div className="flex gap-1">
      <button
        type="button" disabled={pending}
        onClick={() => ejecutar('validar')}
        className="bg-verde hover:bg-verde-oscuro text-white text-[10px] font-semibold px-2 py-1 rounded disabled:opacity-50"
      >
        ✅ Validar
      </button>
      <button
        type="button" disabled={pending}
        onClick={() => ejecutar('rechazar')}
        className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold px-2 py-1 rounded disabled:opacity-50"
      >
        ❌ Rechazar
      </button>
      {err && <div className="text-[10px] text-rose-700 ml-1">{err}</div>}
    </div>
  );
}
