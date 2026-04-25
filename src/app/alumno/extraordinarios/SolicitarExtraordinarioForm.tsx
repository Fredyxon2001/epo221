'use client';
import { useState, useTransition } from 'react';
import { solicitarExtraordinario } from './actions';

export function SolicitarExtraordinarioForm({ asignaciones }: { asignaciones: any[] }) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        start(async () => {
          const r = await solicitarExtraordinario(fd);
          if (r?.error) setErr(r.error);
          else setOk(true);
        });
      }}
      className="space-y-3 text-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-600">Materia</span>
          <select name="asignacion_id" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="">— Selecciona —</option>
            {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.materia?.nombre}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Tipo</span>
          <select name="tipo" required defaultValue="recuperacion" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="recuperacion">Recuperación</option>
            <option value="extraordinario">Extraordinario</option>
            <option value="especial">Especial</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-gray-600">Motivo de la solicitud</span>
        <textarea name="motivo" required minLength={15} rows={3}
          placeholder="Explica brevemente por qué solicitas este examen."
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}
      {ok && <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded p-2">✅ Solicitud enviada. Consulta el estado en la lista.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}
