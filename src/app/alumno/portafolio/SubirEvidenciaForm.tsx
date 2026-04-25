'use client';
import { useState, useTransition } from 'react';
import { subirEvidencia } from './actions';

export function SubirEvidenciaForm({ asignaciones }: { asignaciones: any[] }) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        start(async () => {
          const r = await subirEvidencia(fd);
          if (r?.error) setErr(r.error);
          else setOk(true);
        });
      }}
      className="space-y-3 text-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-600">Título</span>
          <input name="titulo" required minLength={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Materia (opcional)</span>
          <select name="asignacion_id" defaultValue="" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="">— General —</option>
            {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.materia?.nombre}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-gray-600">Descripción</span>
        <textarea name="descripcion" rows={2} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="block flex-1 min-w-[200px]">
          <span className="text-xs text-gray-600">Archivo (máx 25 MB)</span>
          <input name="archivo" type="file" required className="mt-1 w-full text-xs" />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="destacada" /> ⭐ Destacar
        </label>
      </div>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}
      {ok && <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded p-2">✅ Evidencia agregada.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Subiendo…' : 'Agregar evidencia'}
        </button>
      </div>
    </form>
  );
}
