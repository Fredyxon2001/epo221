'use client';
import { useState, useTransition } from 'react';
import { agregarPregunta } from '../actions';

export function AgregarPreguntaForm({ examenId, ordenInicial }: { examenId: string; ordenInicial: number }) {
  const [tipo, setTipo] = useState<'opcion_multiple' | 'verdadero_falso' | 'abierta'>('opcion_multiple');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('examen_id', examenId);
        fd.set('tipo', tipo);
        fd.set('orden', String(ordenInicial));
        start(async () => {
          const r = await agregarPregunta(fd);
          if (r?.error) setErr(r.error);
          else (document.getElementById('form-pregunta') as HTMLFormElement)?.reset();
        });
      }}
      id="form-pregunta"
      className="space-y-3 text-sm"
    >
      <div className="flex gap-2 flex-wrap">
        {(['opcion_multiple', 'verdadero_falso', 'abierta'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTipo(t)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold ${tipo === t ? 'bg-verde text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {t === 'opcion_multiple' ? 'Opción múltiple' : t === 'verdadero_falso' ? 'V/F' : 'Abierta'}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-xs text-gray-600">Enunciado</span>
        <textarea name="enunciado" required rows={2} className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>

      <label className="block w-32">
        <span className="text-xs text-gray-600">Puntos</span>
        <input name="puntos" type="number" step="0.1" defaultValue="1" className="mt-1 w-full border rounded-lg px-3 py-2" />
      </label>

      {tipo === 'opcion_multiple' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(['a', 'b', 'c', 'd'] as const).map((k) => (
            <label key={k} className="block">
              <span className="text-xs text-gray-600">Opción {k}</span>
              <input name={`opcion_${k}`} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
          ))}
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Respuesta correcta</span>
            <select name="respuesta_correcta" required className="mt-1 w-full border rounded-lg px-3 py-2">
              <option value="">—</option>
              <option value="a">a</option><option value="b">b</option><option value="c">c</option><option value="d">d</option>
            </select>
          </label>
        </div>
      )}

      {tipo === 'verdadero_falso' && (
        <label className="block">
          <span className="text-xs text-gray-600">Respuesta correcta</span>
          <select name="respuesta_correcta" required className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="">—</option>
            <option value="verdadero">Verdadero</option>
            <option value="falso">Falso</option>
          </select>
        </label>
      )}

      {tipo === 'abierta' && (
        <p className="text-xs text-gray-500 italic">Las preguntas abiertas se califican manualmente después.</p>
      )}

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2 text-xs">⚠️ {err}</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 text-xs">
          {pending ? 'Guardando…' : '+ Añadir pregunta'}
        </button>
      </div>
    </form>
  );
}
