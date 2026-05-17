import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';
import { agregarPregunta, eliminarPregunta } from './actions';

export default async function BancoPreguntasPage({ searchParams }: { searchParams?: { materia?: string; dificultad?: string; tema?: string } }) {
  const supabase = createClient();
  const { data: materias } = await supabase.from('materias').select('id, nombre').order('nombre');

  let q = supabase
    .from('examen_preguntas')
    .select('*, materia:materias(nombre)')
    .eq('es_banco', true)
    .order('created_at', { ascending: false });
  if (searchParams?.materia) q = q.eq('materia_id', searchParams.materia);
  if (searchParams?.dificultad) q = q.eq('dificultad', searchParams.dificultad);
  if (searchParams?.tema) q = q.ilike('tema', `%${searchParams.tema}%`);
  const { data: preguntas } = await q.limit(200);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Académico · Evaluación"
        title="🧠 Banco de preguntas reusables"
        description="Pool de preguntas etiquetadas por materia, tema y dificultad. Reutilízalas al crear exámenes."
      />

      <Card>
        <details>
          <summary className="cursor-pointer font-semibold text-sm">➕ Nueva pregunta</summary>
          <form action={agregarPregunta} className="mt-3 space-y-2 text-sm">
            <input type="hidden" name="es_banco" value="true" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select name="materia_id" required className="border rounded px-2 py-1.5">
                <option value="">Materia *</option>
                {(materias ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <input name="tema" placeholder="Tema (ej. Ecuaciones lineales)" className="border rounded px-2 py-1.5" />
              <select name="dificultad" className="border rounded px-2 py-1.5">
                <option value="">Dificultad…</option>
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Difícil</option>
              </select>
              <select name="tipo" required className="border rounded px-2 py-1.5">
                <option value="opcion_multiple">Opción múltiple</option>
                <option value="verdadero_falso">Verdadero / Falso</option>
                <option value="abierta">Abierta</option>
              </select>
            </div>
            <textarea name="enunciado" required rows={2} placeholder="Enunciado de la pregunta…" className="w-full border rounded px-2 py-1.5" />
            <input name="opciones_csv" placeholder='Opciones (sólo OM): "Opción A, Opción B, Opción C, Opción D"' className="w-full border rounded px-2 py-1.5" />
            <div className="grid grid-cols-2 gap-2">
              <input name="respuesta_correcta" placeholder="Respuesta correcta (texto de la opción o V/F)" className="border rounded px-2 py-1.5" />
              <input name="puntos" type="number" step="0.5" defaultValue={1} className="border rounded px-2 py-1.5" />
            </div>
            <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded text-sm">Agregar al banco</button>
          </form>
        </details>
      </Card>

      <Card>
        <form className="flex flex-wrap gap-2 mb-4 text-xs items-end">
          <label>
            <span className="text-[10px] text-gray-500 uppercase">Materia</span>
            <select name="materia" defaultValue={searchParams?.materia ?? ''} className="block border rounded px-2 py-1">
              <option value="">Todas</option>
              {(materias ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </label>
          <label>
            <span className="text-[10px] text-gray-500 uppercase">Dificultad</span>
            <select name="dificultad" defaultValue={searchParams?.dificultad ?? ''} className="block border rounded px-2 py-1">
              <option value="">Todas</option><option value="facil">Fácil</option><option value="media">Media</option><option value="dificil">Difícil</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] text-gray-500 uppercase">Tema</span>
            <input name="tema" defaultValue={searchParams?.tema ?? ''} className="block border rounded px-2 py-1" placeholder="Buscar…" />
          </label>
          <button className="bg-verde-oscuro text-white px-3 py-1 rounded font-semibold">Filtrar</button>
        </form>

        {!preguntas?.length ? (
          <EmptyState icon="🧠" title="Sin preguntas" description="Agrega usando el formulario." />
        ) : (
          <ul className="space-y-2">
            {preguntas.map((p: any) => (
              <li key={p.id} className="border rounded p-3 bg-white">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.enunciado}</div>
                    <div className="text-[11px] text-gray-500 mt-1 flex gap-2 flex-wrap">
                      <span>{p.materia?.nombre ?? '—'}</span>
                      {p.tema && <Badge tone="verde" size="sm">{p.tema}</Badge>}
                      {p.dificultad && <Badge tone={p.dificultad === 'dificil' ? 'rosa' : p.dificultad === 'media' ? 'ambar' : 'verde'} size="sm">{p.dificultad}</Badge>}
                      <span>· {p.tipo}</span>
                      <span>· {p.puntos} pts</span>
                    </div>
                    {p.respuesta_correcta && <div className="text-xs text-verde-oscuro mt-1">✓ {p.respuesta_correcta}</div>}
                  </div>
                  <form action={eliminarPregunta}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-xs text-rose-600 hover:underline">Eliminar</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
