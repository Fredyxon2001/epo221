'use client';
import { useState, useTransition } from 'react';
import { resolverSolicitudFicha, reiniciarContadorModificaciones } from '@/app/alumno/ficha/actions';

export function ResolverFichaForm({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const ejecutar = (accion: 'aprobar' | 'rechazar') => {
    setErr(null);
    let motivo: string | null = null;
    if (accion === 'rechazar') {
      motivo = window.prompt('Motivo del rechazo (opcional)') ?? null;
    } else if (!confirm('¿Aprobar los cambios solicitados? Se aplicarán inmediatamente a la ficha del alumno.')) {
      return;
    }
    const fd = new FormData();
    fd.set('id', id);
    fd.set('accion', accion);
    if (motivo) fd.set('motivo_rechazo', motivo);
    start(async () => {
      const r = await resolverSolicitudFicha(fd);
      if (r?.error) setErr(r.error);
    });
  };

  return (
    <div className="flex gap-2 items-center justify-end">
      {err && <span className="text-xs text-rose-700 mr-2">⚠️ {err}</span>}
      <button type="button" disabled={pending} onClick={() => ejecutar('rechazar')}
        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-50">
        ❌ Rechazar
      </button>
      <button type="button" disabled={pending} onClick={() => ejecutar('aprobar')}
        className="bg-verde hover:bg-verde-oscuro text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-50">
        ✅ Aprobar y aplicar
      </button>
    </div>
  );
}

export function ReiniciarContadorBtn({ alumnoId }: { alumnoId: string }) {
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <button
      type="button" disabled={pending || ok}
      onClick={() => {
        if (!confirm('¿Reiniciar el contador de modificaciones de este alumno? Volverá a tener 2 cambios libres.')) return;
        const fd = new FormData(); fd.set('alumno_id', alumnoId);
        start(async () => {
          const r = await reiniciarContadorModificaciones(fd);
          if (!r?.error) setOk(true);
        });
      }}
      className="text-gray-500 hover:text-verde-oscuro underline disabled:opacity-50"
    >
      {ok ? '✅ Contador reiniciado' : pending ? '…' : '🔄 Reiniciar contador de modificaciones'}
    </button>
  );
}
