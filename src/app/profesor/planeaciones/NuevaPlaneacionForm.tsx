'use client';
import { useState, useTransition } from 'react';
import { guardarPlaneacion } from '@/app/planeaciones/actions';

export function NuevaPlaneacionForm({ asignaciones }: { asignaciones: any[] }) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        start(async () => {
          const r = await guardarPlaneacion(fd);
          if (r?.error) setErr(r.error);
          else setOk(true);
        });
      }}
      className="space-y-3 text-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-600">Asignación</span>
          <select name="asignacion_id" required className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="">— Selecciona —</option>
            {asignaciones.map((a: any) => {
              const g = a.grupo;
              const grupo = g ? `${g.grado}°${String.fromCharCode(64 + (g.grupo ?? 1))} (${g.turno ?? ''})` : '—';
              return <option key={a.id} value={a.id}>{a.materia?.nombre} · {grupo}</option>;
            })}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Parcial</span>
          <select name="parcial" required defaultValue="1" className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="1">Parcial 1</option>
            <option value="2">Parcial 2</option>
            <option value="3">Parcial 3</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-gray-600">Título</span>
        <input name="titulo" required placeholder="Ej. Planeación Álgebra · P1 · 2026-A" className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600">Contenido / secuencia didáctica</span>
        <textarea name="contenido" rows={5} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Propósitos, aprendizajes esperados, actividades, evaluación…" />
      </label>
      <label className="block">
        <span className="text-xs text-gray-600">Archivo adjunto (opcional — PDF, DOCX, etc.)</span>
        <input name="archivo" type="file" accept=".pdf,.doc,.docx,.odt,.xls,.xlsx" className="mt-1 w-full text-xs" />
      </label>
      <label className="inline-flex items-center gap-2 text-xs">
        <input type="checkbox" name="enviar" value="1" />
        Enviar a revisión (si no, queda como borrador)
      </label>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2 text-xs">⚠️ {err}</div>}
      {ok && <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded p-2 text-xs">✅ Planeación guardada como nueva versión.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Guardando…' : 'Guardar versión'}
        </button>
      </div>
    </form>
  );
}
