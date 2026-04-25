'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearExamen } from '../actions';

export function NuevoExamenForm({ asignaciones }: { asignaciones: any[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null);
        start(async () => {
          const r = await crearExamen(fd);
          if (r?.error) setErr(r.error);
          else if (r?.id) router.push(`/profesor/examenes/${r.id}`);
        });
      }}
      className="space-y-3 text-sm"
    >
      <label className="block">
        <span className="text-xs text-gray-600">Asignación</span>
        <select name="asignacion_id" required className="mt-1 w-full border rounded-lg px-3 py-2">
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
        <input name="titulo" required minLength={3} className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>

      <label className="block">
        <span className="text-xs text-gray-600">Instrucciones</span>
        <textarea name="instrucciones" rows={3} className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <label><span className="text-xs text-gray-600">Parcial</span>
          <select name="parcial" defaultValue="1" className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="1">1</option><option value="2">2</option><option value="3">3</option>
          </select>
        </label>
        <label><span className="text-xs text-gray-600">Duración (min)</span>
          <input name="duracion_min" type="number" defaultValue="60" min="5" max="240" className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label><span className="text-xs text-gray-600">Intentos máx</span>
          <input name="intentos_max" type="number" defaultValue="1" min="1" max="5" className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label><span className="text-xs text-gray-600">Apertura</span>
          <input name="fecha_apertura" type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label><span className="text-xs text-gray-600">Cierre</span>
          <input name="fecha_cierre" type="datetime-local" required className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
      </div>

      <div className="flex gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="aleatorizar" defaultChecked /> Aleatorizar preguntas
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="mostrar_resultados" defaultChecked /> Mostrar resultados al alumno
        </label>
      </div>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Creando…' : 'Crear y añadir preguntas'}
        </button>
      </div>
    </form>
  );
}
