'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { guardarRespuesta, entregarIntento } from '../actions';

export function PresentarExamen({ intentoId, preguntas, respuestasIniciales, duracionMin }: {
  intentoId: string;
  preguntas: any[];
  respuestasIniciales: Record<string, string>;
  duracionMin: number;
}) {
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Record<string, string>>(respuestasIniciales);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(duracionMin * 60);
  const [pending, start] = useTransition();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (segundos <= 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundos]);

  async function saveOne(pregunta_id: string, valor: string) {
    setSavingId(pregunta_id);
    setRespuestas((r) => ({ ...r, [pregunta_id]: valor }));
    const fd = new FormData();
    fd.set('intento_id', intentoId);
    fd.set('pregunta_id', pregunta_id);
    fd.set('respuesta', valor);
    await guardarRespuesta(fd);
    setSavingId(null);
  }

  function submit() {
    start(async () => {
      const r = await entregarIntento(intentoId);
      if (!r?.error) {
        setOk(true);
        setTimeout(() => router.push('/alumno/examenes'), 1500);
      }
    });
  }

  const m = Math.floor(Math.max(0, segundos) / 60);
  const s = Math.max(0, segundos) % 60;

  if (ok) {
    return (
      <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded-xl p-5 text-center">
        ✅ Tu examen fue enviado correctamente.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={`sticky top-0 z-10 rounded-xl p-3 text-center font-mono text-sm font-bold ${segundos < 300 ? 'bg-rose-100 text-rose-700' : 'bg-white border border-gray-200 text-verde-oscuro'}`}>
        ⏱️ {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>

      {preguntas.map((p, idx) => (
        <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="font-semibold text-sm">
              {idx + 1}. {p.enunciado}
            </div>
            <span className="text-xs text-gray-500 shrink-0">{p.puntos} pts</span>
          </div>

          <div className="mt-3 space-y-2">
            {p.tipo === 'opcion_multiple' && (p.opciones as any[]).map((o) => (
              <label key={o.clave} className="flex items-center gap-2 text-sm cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                <input type="radio" name={`p-${p.id}`} value={o.clave} checked={respuestas[p.id] === o.clave}
                  onChange={(e) => saveOne(p.id, e.target.value)} />
                <span><strong>{o.clave})</strong> {o.texto}</span>
              </label>
            ))}
            {p.tipo === 'verdadero_falso' && ['verdadero', 'falso'].map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm cursor-pointer p-2 border rounded-lg hover:bg-gray-50">
                <input type="radio" name={`p-${p.id}`} value={v} checked={respuestas[p.id] === v}
                  onChange={(e) => saveOne(p.id, e.target.value)} />
                <span className="capitalize">{v}</span>
              </label>
            ))}
            {p.tipo === 'abierta' && (
              <textarea rows={4} value={respuestas[p.id] ?? ''}
                onChange={(e) => setRespuestas((r) => ({ ...r, [p.id]: e.target.value }))}
                onBlur={(e) => saveOne(p.id, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            )}
          </div>
          {savingId === p.id && <div className="text-[10px] text-gray-400 mt-1">Guardando…</div>}
        </div>
      ))}

      <button onClick={() => { if (confirm('¿Entregar examen? Ya no podrás modificar respuestas.')) submit(); }}
        disabled={pending}
        className="w-full bg-verde hover:bg-verde-oscuro text-white font-semibold py-3 rounded-xl shadow-md shadow-verde/30 disabled:opacity-50">
        {pending ? 'Enviando…' : 'Entregar examen'}
      </button>
    </div>
  );
}
