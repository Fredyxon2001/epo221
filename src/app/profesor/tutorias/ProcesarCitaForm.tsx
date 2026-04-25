'use client';
import { useState, useTransition } from 'react';
import { actualizarCita } from '@/app/tutorias/actions';

const ESTADOS = ['solicitada', 'confirmada', 'cancelada', 'realizada', 'no_se_presento'];

export function ProcesarCitaForm({ cita }: { cita: any }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return <button onClick={() => setOpen(true)} className="mt-2 text-xs text-verde-oscuro font-semibold hover:underline">Actualizar →</button>;
  }
  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('id', cita.id);
        start(async () => {
          const r = await actualizarCita(fd);
          if (r?.error) setErr(r.error);
          else setOpen(false);
        });
      }}
      className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 space-y-2 text-xs"
    >
      <label className="block">
        <span className="text-gray-600">Estado</span>
        <select name="estado" defaultValue={cita.estado} required className="mt-1 w-full border rounded px-2 py-1">
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-gray-600">Notas</span>
        <textarea name="notas_profesor" rows={2} defaultValue={cita.notas_profesor ?? ''} className="mt-1 w-full border rounded px-2 py-1" />
      </label>
      {err && <div className="text-rose-700">{err}</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded border">Cancelar</button>
        <button type="submit" disabled={pending} className="px-3 py-1 rounded bg-verde text-white font-semibold disabled:opacity-50">
          {pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
