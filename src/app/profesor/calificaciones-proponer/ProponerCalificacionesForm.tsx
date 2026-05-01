'use client';
import { useState, useTransition } from 'react';
import { enviarPropuestasCalificaciones } from './actions';

export function ProponerCalificacionesForm({
  asignacionId, parcial, alumnos, propuestasPrevias,
}: {
  asignacionId: string;
  parcial: number;
  alumnos: any[];
  propuestasPrevias: any[];
}) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Map de propuestas previas por alumno (último estado)
  const previas: Record<string, any> = {};
  for (const p of propuestasPrevias) {
    if (p.parcial !== parcial) continue;
    if (!previas[p.alumno_id]) previas[p.alumno_id] = p;
  }

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(null);
        fd.set('asignacion_id', asignacionId);
        fd.set('parcial', String(parcial));
        start(async () => {
          const r = await enviarPropuestasCalificaciones(fd);
          if (r?.error) setErr(r.error);
          else setOk(`✅ ${r?.total ?? 0} propuestas enviadas al orientador.`);
        });
      }}
      className="space-y-3 text-sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left">Alumno</th>
              <th className="px-2 py-1">Calificación (0-10)</th>
              <th className="px-2 py-1">Faltas</th>
              <th className="px-2 py-1">Estado previo</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a: any) => {
              const prev = previas[a.id];
              const disabled = prev?.estado === 'pendiente';
              return (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-2 py-1">
                    <div className="font-semibold">{a.nombre} {a.apellido_paterno}</div>
                    <div className="text-[10px] text-gray-500">{a.matricula ?? '—'}</div>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number" step="0.1" min="0" max="10"
                      name={`calificacion_${a.id}`}
                      defaultValue={prev?.calificacion ?? ''}
                      disabled={disabled}
                      className="w-20 border rounded px-2 py-1 text-center disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number" min="0" max="60"
                      name={`faltas_${a.id}`}
                      defaultValue={prev?.faltas ?? 0}
                      disabled={disabled}
                      className="w-16 border rounded px-2 py-1 text-center disabled:bg-gray-100"
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    {prev ? (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        prev.estado === 'validada' ? 'bg-verde-claro/30 text-verde-oscuro'
                        : prev.estado === 'rechazada' ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                      }`}>{prev.estado}</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <label className="block">
        <span className="text-xs text-gray-600">Observaciones para el orientador (opcional)</span>
        <textarea name="observaciones" rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ej. Alumno X faltó al examen, calificación condicionada a entrega de trabajo." />
      </label>

      {err && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">⚠️ {err}</div>}
      {ok && <div className="text-xs text-verde-oscuro bg-verde-claro/30 border border-verde rounded p-2">{ok}</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Enviando…' : '📤 Enviar al orientador'}
        </button>
      </div>
    </form>
  );
}
