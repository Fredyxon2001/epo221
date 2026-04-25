// Banco de rúbricas del profesor. Muestra las propias + las públicas de otros.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';
import { crearRubrica, eliminarRubrica, duplicarRubrica } from './actions';

export default async function RubricasBanco() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: materias } = await supabase.from('materias').select('id, nombre').order('nombre');

  const { data: propias } = await supabase
    .from('rubricas')
    .select('id, nombre, descripcion, escala_max, publica, materia:materias(nombre), criterios:rubrica_criterios(id)')
    .eq('creado_por', user!.id)
    .order('created_at', { ascending: false });

  const { data: publicas } = await supabase
    .from('rubricas')
    .select('id, nombre, descripcion, escala_max, materia:materias(nombre), criterios:rubrica_criterios(id)')
    .eq('publica', true)
    .neq('creado_por', user!.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Evaluación"
        title="📋 Banco de rúbricas"
        description="Plantillas reutilizables con criterios ponderados para evaluar productos y desempeños."
      />

      <Card eyebrow="Nueva rúbrica" title="Crear plantilla">
        <form action={crearRubrica} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input name="nombre" required placeholder="Nombre (ej. Ensayo argumentativo)" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" />
          <select name="materia_id" className="border border-gray-300 rounded-xl px-3 py-2 text-sm">
            <option value="">— Materia (opcional) —</option>
            {(materias ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
          <textarea name="descripcion" rows={2} placeholder="Descripción breve…" className="md:col-span-2 border border-gray-300 rounded-xl px-3 py-2 text-sm" />
          <label className="text-sm flex items-center gap-2">
            Escala máxima:
            <input name="escala_max" type="number" defaultValue={10} min={1} max={100} className="w-20 border border-gray-300 rounded-xl px-2 py-1" />
          </label>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" name="publica" value="1" /> Compartir como pública
          </label>
          <button className="md:col-span-2 bg-gradient-to-r from-verde to-verde-medio text-white rounded-xl px-4 py-2 font-semibold shadow hover:shadow-lg">
            Crear rúbrica →
          </button>
        </form>
      </Card>

      <Card eyebrow="Mis rúbricas" title={`${(propias ?? []).length} plantillas propias`}>
        {(propias ?? []).length === 0 ? (
          <EmptyState icon="📋" title="Aún no creas rúbricas" description="Usa el formulario de arriba para crear tu primera plantilla." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(propias ?? []).map((r: any) => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white/70 p-4 hover:border-verde transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{r.nombre}</div>
                    <div className="text-xs text-gray-500">{r.materia?.nombre ?? 'Sin materia'} · Escala {r.escala_max}</div>
                  </div>
                  {r.publica && <Badge tone="verde">Pública</Badge>}
                </div>
                {r.descripcion && <div className="text-xs text-gray-600 mt-2 line-clamp-2">{r.descripcion}</div>}
                <div className="text-[11px] text-gray-500 mt-2">{r.criterios?.length ?? 0} criterios</div>
                <div className="flex gap-2 mt-3">
                  <Link href={`/profesor/rubricas/${r.id}`} className="text-xs bg-verde text-white px-3 py-1 rounded-lg font-semibold">Editar</Link>
                  <form action={duplicarRubrica}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs bg-dorado text-verde-oscuro px-3 py-1 rounded-lg font-semibold">Duplicar</button>
                  </form>
                  <form action={eliminarRubrica}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-xs bg-rosa/20 text-rosa px-3 py-1 rounded-lg font-semibold">Eliminar</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(publicas ?? []).length > 0 && (
        <Card eyebrow="Compartidas" title={`${publicas!.length} rúbricas públicas de otros docentes`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {publicas!.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white/70 p-4">
                <div className="font-semibold">{r.nombre}</div>
                <div className="text-xs text-gray-500">{r.materia?.nombre ?? 'Sin materia'} · Escala {r.escala_max} · {r.criterios?.length ?? 0} criterios</div>
                {r.descripcion && <div className="text-xs text-gray-600 mt-2 line-clamp-2">{r.descripcion}</div>}
                <form action={duplicarRubrica} className="mt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs bg-gradient-to-r from-verde to-verde-medio text-white px-3 py-1 rounded-lg font-semibold">
                    Duplicar a mi banco →
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
