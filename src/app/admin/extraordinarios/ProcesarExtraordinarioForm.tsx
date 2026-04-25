'use client';
import { useState, useTransition } from 'react';
import { procesarExtraordinario } from '@/app/alumno/extraordinarios/actions';

const ESTADOS = ['solicitado', 'pago_pendiente', 'pagado', 'agendado', 'aplicado', 'calificado', 'rechazado'];

export function ProcesarExtraordinarioForm({ solicitud }: { solicitud: any }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs text-verde-oscuro font-semibold hover:underline">
        Procesar →
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('id', solicitud.id);
        start(async () => {
          const r = await procesarExtraordinario(fd);
          if (r?.error) setErr(r.error);
          else setOpen(false);
        });
      }}
      className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 text-xs"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className="block">
          <span className="text-gray-600">Estado</span>
          <select name="estado" defaultValue={solicitud.estado} required className="mt-1 w-full border rounded px-2 py-1">
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-gray-600">Monto ($)</span>
          <input name="monto" type="number" step="0.01" defaultValue={solicitud.monto ?? ''} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          <span className="text-gray-600">Ref. pago</span>
          <input name="referencia_pago" defaultValue={solicitud.referencia_pago ?? ''} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label className="block">
          <span className="text-gray-600">Calificación</span>
          <input name="calificacion" type="number" step="0.1" min="0" max="10" defaultValue={solicitud.calificacion ?? ''} className="mt-1 w-full border rounded px-2 py-1" />
        </label>
      </div>
      <label className="block">
        <span className="text-gray-600">Fecha del examen</span>
        <input name="fecha_examen" type="datetime-local"
          defaultValue={solicitud.fecha_examen ? new Date(solicitud.fecha_examen).toISOString().slice(0, 16) : ''}
          className="mt-1 w-full border rounded px-2 py-1" />
      </label>
      <label className="block">
        <span className="text-gray-600">Observaciones</span>
        <textarea name="observaciones" rows={2} defaultValue={solicitud.observaciones ?? ''} className="mt-1 w-full border rounded px-2 py-1" />
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
