'use client';
import { useState, useTransition } from 'react';
import { crearPeriodoEval } from '@/app/eval-docente/actions';

const DIMS_PRESET = `dominio|Dominio de la materia
claridad|Claridad en las explicaciones
puntualidad|Puntualidad y asistencia
respeto|Trato respetuoso con los alumnos
retroalimentacion|Retroalimentación oportuna
recursos|Uso de recursos didácticos
evaluacion|Justicia en la evaluación`;

export function NuevoPeriodoForm() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        start(async () => {
          const r = await crearPeriodoEval(fd);
          if (r?.error) setErr(r.error);
          else setOk(true);
        });
      }}
      className="space-y-3 text-sm"
    >
      <label className="block">
        <span className="text-xs text-gray-600">Nombre del periodo</span>
        <input name="nombre" required placeholder="Ej. Evaluación docente 2026-A — 1er parcial" className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600">Instrucciones para alumnos</span>
        <textarea name="instrucciones" rows={2} className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label><span className="text-xs text-gray-600">Apertura</span>
          <input name="abierta_desde" type="datetime-local" className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label><span className="text-xs text-gray-600">Cierre</span>
          <input name="abierta_hasta" type="datetime-local" required className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label><span className="text-xs text-gray-600">Escala máxima</span>
          <input name="escala_max" type="number" min="3" max="10" defaultValue="5" className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-gray-600">Dimensiones (una por línea, formato <code>clave|texto</code>)</span>
        <textarea name="dimensiones" rows={8} defaultValue={DIMS_PRESET} required
          className="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-xs" />
      </label>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}
      {ok && <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded p-2">✅ Periodo abierto.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Creando…' : 'Abrir periodo'}
        </button>
      </div>
    </form>
  );
}
