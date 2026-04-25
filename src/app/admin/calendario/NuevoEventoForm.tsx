'use client';
import { useState, useTransition } from 'react';
import { crearEvento } from '@/app/calendario/actions';

export function NuevoEventoForm({ grupos }: { grupos: any[] }) {
  const [alcance, setAlcance] = useState('todos');
  const [gruposSel, setGruposSel] = useState<string[]>([]);
  const [todoDia, setTodoDia] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setErr(null); setOk(false);
        fd.set('alcance', alcance);
        if (alcance === 'grupos') fd.set('grupo_ids', gruposSel.join(','));
        start(async () => {
          const r = await crearEvento(fd);
          if (r?.error) setErr(r.error);
          else setOk(true);
        });
      }}
      className="space-y-3 text-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="md:col-span-2">
          <span className="text-xs text-gray-600">Título</span>
          <input name="titulo" required minLength={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label>
          <span className="text-xs text-gray-600">Tipo</span>
          <select name="tipo" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
            <option value="evento">🎉 Evento</option>
            <option value="examen">📝 Examen</option>
            <option value="junta">🤝 Junta</option>
            <option value="suspension">🚫 Suspensión</option>
            <option value="entrega">📦 Entrega</option>
            <option value="ceremonia">🎓 Ceremonia</option>
            <option value="capacitacion">🧠 Capacitación</option>
            <option value="otro">📌 Otro</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label>
          <span className="text-xs text-gray-600">Inicio</span>
          <input name="fecha_inicio" type="datetime-local" required className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label>
          <span className="text-xs text-gray-600">Fin</span>
          <input name="fecha_fin" type="datetime-local" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input name="todo_el_dia" type="checkbox" checked={todoDia} onChange={(e) => setTodoDia(e.target.checked)} />
          <span className="text-xs">Todo el día</span>
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-gray-600">Lugar</span>
        <input name="lugar" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>

      <label className="block">
        <span className="text-xs text-gray-600">Descripción</span>
        <textarea name="descripcion" rows={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
      </label>

      <label className="block">
        <span className="text-xs text-gray-600">Alcance</span>
        <select value={alcance} onChange={(e) => setAlcance(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
          <option value="todos">Toda la escuela</option>
          <option value="grupos">Grupos específicos</option>
          <option value="profesores">Solo docentes</option>
          <option value="alumnos">Solo alumnos</option>
        </select>
      </label>

      {alcance === 'grupos' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {grupos.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-xs border rounded p-2 cursor-pointer">
              <input type="checkbox" checked={gruposSel.includes(g.id)} onChange={(e) => setGruposSel((s) => e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id))} />
              <span>{g.semestre}° {g.grupo} {g.turno}</span>
            </label>
          ))}
        </div>
      )}

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}
      {ok && <div className="bg-verde-claro/30 border border-verde text-verde-oscuro rounded p-2">✅ Evento publicado.</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Publicando…' : 'Publicar evento'}
        </button>
      </div>
    </form>
  );
}
