'use client';
import { useState, useTransition } from 'react';
import { crearReporteConducta } from './actions';

const CATEGORIAS_NEG = ['Falta de respeto', 'Indisciplina en clase', 'Uso indebido de celular', 'Agresión', 'Inasistencia injustificada', 'Daño a mobiliario', 'Copia/fraude académico', 'Otro'];
const CATEGORIAS_POS = ['Excelente participación', 'Liderazgo', 'Ayuda a compañeros', 'Esfuerzo destacado', 'Representación escolar', 'Otro'];

export function NuevoReporteForm({ alumnos }: { alumnos: any[] }) {
  const [tipo, setTipo] = useState<'positivo' | 'negativo'>('negativo');
  const [categoria, setCategoria] = useState('');
  const [alumnoId, setAlumnoId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [acciones, setAcciones] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const categorias = tipo === 'positivo' ? CATEGORIAS_POS : CATEGORIAS_NEG;

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        fd.set('alumno_id', alumnoId);
        fd.set('tipo', tipo);
        fd.set('categoria', categoria);
        fd.set('descripcion', descripcion);
        fd.set('acciones_tomadas', acciones);
        start(async () => {
          const r = await crearReporteConducta(fd);
          if (r?.error) setErr(r.error);
          else {
            setOk(true);
            setDescripcion(''); setAcciones(''); setCategoria(''); setAlumnoId('');
          }
        });
      }}
      className="space-y-4"
    >
      <div className="flex gap-2">
        {(['negativo', 'positivo'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTipo(t); setCategoria(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 ${tipo === t
              ? (t === 'positivo' ? 'bg-verde-claro/30 border-verde text-verde-oscuro' : 'bg-rose-100 border-rose-400 text-rose-800')
              : 'bg-white border-gray-200 text-gray-500'}`}
          >
            {t === 'positivo' ? '⭐ Reconocimiento positivo' : '⚠️ Incidente / llamada de atención'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Alumno</span>
          <select value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Selecciona —</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.apellido_paterno} {a.apellido_materno ?? ''} {a.nombre} · {a.matricula ?? '—'}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Categoría</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">— Selecciona —</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Descripción de los hechos</span>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={4}
          required
          minLength={15}
          placeholder="Describe con claridad qué pasó, cuándo y dónde."
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-verde outline-none"
        />
      </label>

      {tipo === 'negativo' && (
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Acciones tomadas (opcional)</span>
          <textarea
            value={acciones}
            onChange={(e) => setAcciones(e.target.value)}
            rows={2}
            placeholder="Ej. Se le pidió salir del aula por 10 min, se habló con el alumno al terminar la clase…"
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>
      )}

      <label className="block md:w-56">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Fecha del incidente</span>
        <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </label>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">⚠️ {err}</div>}
      {ok && <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded-lg p-3 text-sm">✅ Reporte enviado al orientador del grupo.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Enviando…' : 'Enviar reporte'}
        </button>
      </div>
    </form>
  );
}
