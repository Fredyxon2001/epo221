'use client';
import { useState, useTransition } from 'react';
import { responderEval } from '@/app/eval-docente/actions';

export function ResponderEvalForm({ periodo, asignacionId }: { periodo: any; asignacionId: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        fd.set('periodo_id', periodo.id);
        fd.set('asignacion_id', asignacionId);
        start(async () => {
          const r = await responderEval(fd);
          if (r?.error) setErr(r.error);
          else setOk(true);
        });
      }}
      className="mt-3 space-y-2"
    >
      {(periodo.dimensiones as any[]).map((d: any) => (
        <div key={d.clave} className="flex items-center gap-2 py-1 border-b">
          <div className="text-xs flex-1">{d.texto}</div>
          <div className="flex gap-1">
            {Array.from({ length: periodo.escala_max }, (_, i) => i + 1).map((n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name={`r_${d.clave}`} value={n} required className="peer sr-only" />
                <span className="w-7 h-7 flex items-center justify-center rounded-full border text-xs peer-checked:bg-verde peer-checked:text-white peer-checked:border-verde">
                  {n}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <label className="block">
        <span className="text-xs text-gray-600">Comentario anónimo (opcional)</span>
        <textarea name="comentario" rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
      </label>

      {err && <div className="text-xs text-rose-700">⚠️ {err}</div>}
      {ok && <div className="text-xs text-verde-oscuro">✅ Gracias por tu retroalimentación.</div>}

      {!ok && (
        <div className="flex justify-end">
          <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-1.5 rounded text-xs disabled:opacity-50">
            {pending ? 'Enviando…' : 'Enviar evaluación'}
          </button>
        </div>
      )}
    </form>
  );
}
