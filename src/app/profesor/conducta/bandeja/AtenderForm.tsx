'use client';
import { useState, useTransition } from 'react';
import { atenderReporte } from '../actions';

export function AtenderForm({ id, estadoActual }: { id: string; estadoActual: string }) {
  const [open, setOpen] = useState(false);
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState(estadoActual === 'enviado' ? 'revisado' : 'atendido');
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-verde hover:underline">
        ✏️ Dar seguimiento
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        fd.set('id', id);
        fd.set('notas_orientador', notas);
        fd.set('estado', estado);
        start(async () => { await atenderReporte(fd); setOpen(false); });
      }}
      className="space-y-2 bg-white border rounded-lg p-3"
    >
      <div className="flex gap-2 text-xs">
        {(['revisado', 'atendido', 'archivado'] as const).map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEstado(e)}
            className={`px-3 py-1 rounded-full font-semibold border ${estado === e ? 'bg-verde text-white border-verde' : 'bg-white text-gray-600 border-gray-200'}`}
          >
            {e}
          </button>
        ))}
      </div>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={3}
        placeholder="Nota de seguimiento: qué se platicó con el alumno, con el tutor, acuerdos…"
        className="w-full border border-gray-200 rounded p-2 text-xs"
      />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-600">Cancelar</button>
        <button type="submit" disabled={pending} className="text-xs bg-verde text-white font-semibold px-3 py-1 rounded disabled:opacity-50">
          {pending ? 'Guardando…' : 'Guardar seguimiento'}
        </button>
      </div>
    </form>
  );
}
