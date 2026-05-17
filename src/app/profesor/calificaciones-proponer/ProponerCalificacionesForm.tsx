'use client';
import { useState, useTransition, useRef } from 'react';
import { enviarPropuestasCalificaciones, importarCalificacionesXLSX } from './actions';

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
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Contar cuántas alumnos tienen calificación VALIDADA (para mostrar aviso de modificación)
  const totalValidadas = Object.values(propuestasPrevias).filter((p: any) =>
    p.parcial === parcial && p.estado === 'validada'
  ).length;

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
      {totalValidadas > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs">
          <div className="font-semibold text-amber-900 mb-1">🔄 Hay {totalValidadas} calificación(es) ya VALIDADA(s) en este parcial</div>
          <p className="text-amber-800">
            Si cambias alguna, se enviará al orientador como <strong>MODIFICACIÓN</strong> (requiere su aprobación explícita).
            Si la dejas igual, no se enviará nada para ese alumno.
          </p>
        </div>
      )}

      {/* SUBIR XLSX precargado */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
        <div className="text-xs font-semibold text-sky-900 mb-2">📤 Opción rápida: subir plantilla XLSX llenada</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileRef} type="file" accept=".xlsx,.xls"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="text-xs flex-1 min-w-[150px]"
          />
          {archivo && (
            <button
              type="button" disabled={pending}
              onClick={() => {
                setErr(null); setOk(null);
                const fd = new FormData();
                fd.set('asignacion_id', asignacionId);
                fd.set('parcial', String(parcial));
                fd.set('archivo', archivo);
                start(async () => {
                  const r = await importarCalificacionesXLSX(fd);
                  if (r?.error && !r?.ok) setErr(r.error);
                  else setOk(`✅ Importado: ${r?.total ?? 0} enviadas · ${r?.saltados ?? 0} saltadas`);
                  setArchivo(null);
                  if (fileRef.current) fileRef.current.value = '';
                });
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3 py-1.5 rounded text-xs disabled:opacity-50"
            >
              📥 Procesar XLSX
            </button>
          )}
        </div>
        <p className="text-[10px] text-sky-700 mt-1">
          O usa la tabla de abajo para capturar directo. Descarga primero la plantilla desde el botón amarillo de arriba.
        </p>
      </div>

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
              // Bloqueo SOLO si hay propuesta PENDIENTE (esperando validación). Si está validada o rechazada, sí se puede cambiar.
              const disabled = prev?.estado === 'pendiente';
              return (
                <tr key={a.id} className={`border-t border-gray-100 ${prev?.estado === 'validada' ? 'bg-verde-claro/5' : ''}`}>
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
                      title={disabled ? 'Esperando validación del orientador' : (prev?.estado === 'validada' ? 'Si modificas, se enviará como solicitud de modificación' : '')}
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
                      }`}>{prev.estado === 'validada' ? '🔒 validada' : prev.estado}</span>
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
