'use client';
import { useState, useTransition } from 'react';
import { solicitarCita } from '@/app/tutorias/actions';

export function AgendarCitaForm({ profesorId }: { profesorId: string }) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return <button onClick={() => setOpen(true)} className="mt-2 text-xs text-verde-oscuro font-semibold hover:underline">Solicitar cita →</button>;
  }
  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        fd.set('profesor_id', profesorId);
        start(async () => {
          const r = await solicitarCita(fd);
          if (r?.error) setErr(r.error);
          else { setOk(true); setTimeout(() => { setOpen(false); setOk(false); }, 1500); }
        });
      }}
      className="mt-2 bg-gray-50 border rounded p-2 space-y-2 text-xs"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <label><span className="text-gray-600">Fecha y hora</span>
          <input name="fecha" type="datetime-local" required className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label><span className="text-gray-600">Duración (min)</span>
          <input name="duracion_min" type="number" min="15" max="120" defaultValue="30" className="mt-1 w-full border rounded px-2 py-1" />
        </label>
        <label><span className="text-gray-600">Modalidad</span>
          <select name="modalidad" className="mt-1 w-full border rounded px-2 py-1">
            <option value="presencial">Presencial</option><option value="virtual">Virtual</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-gray-600">Motivo</span>
        <textarea name="motivo" required minLength={10} rows={2} className="mt-1 w-full border rounded px-2 py-1" />
      </label>
      {err && <div className="text-rose-700">{err}</div>}
      {ok && <div className="text-verde-oscuro">✅ Solicitud enviada</div>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded border">Cancelar</button>
        <button type="submit" disabled={pending} className="px-3 py-1 rounded bg-verde text-white font-semibold disabled:opacity-50">
          {pending ? 'Enviando…' : 'Solicitar'}
        </button>
      </div>
    </form>
  );
}
