'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearTarea } from '../actions';

export function NuevaTareaForm({ asignaciones, rubricas }: { asignaciones: any[]; rubricas: any[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          const r = await crearTarea(fd);
          if (r?.error) setErr(r.error);
          else if (r?.id) router.push(`/profesor/tareas/${r.id}`);
        });
      }}
      className="space-y-3 text-sm"
    >
      <label className="block">
        <span className="text-xs text-gray-600">Asignación (materia y grupo)</span>
        <select name="asignacion_id" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
          <option value="">— Selecciona —</option>
          {asignaciones.map((a) => (
            <option key={a.id} value={a.id}>
              {a.materia?.nombre} · {a.grupo?.semestre}° {a.grupo?.grupo} {a.grupo?.turno ?? ''}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs text-gray-600">Título</span>
        <input name="titulo" required minLength={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>

      <label className="block">
        <span className="text-xs text-gray-600">Instrucciones</span>
        <textarea name="instrucciones" required minLength={10} rows={5} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label className="block">
          <span className="text-xs text-gray-600">Parcial</span>
          <select name="parcial" defaultValue="1" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="">—</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Puntos</span>
          <input name="puntos" type="number" step="0.1" min="0" max="100" defaultValue="10" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="block col-span-2">
          <span className="text-xs text-gray-600">Fecha y hora de entrega</span>
          <input name="fecha_entrega" type="datetime-local" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
      </div>

      {rubricas.length > 0 && (
        <label className="block">
          <span className="text-xs text-gray-600">Rúbrica (opcional)</span>
          <select name="rubrica_id" defaultValue="" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="">— Sin rúbrica —</option>
            {rubricas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
      )}

      <div className="flex gap-4 flex-wrap pt-1">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="permite_archivos" defaultChecked /> Permitir archivo adjunto
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="cierra_estricto" /> Cierre estricto (no aceptar entregas tarde)
        </label>
      </div>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Publicando…' : 'Publicar tarea'}
        </button>
      </div>
    </form>
  );
}
