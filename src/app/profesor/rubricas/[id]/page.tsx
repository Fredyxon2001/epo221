// Editor de criterios de una rúbrica + calculadora de puntaje en vivo.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import { agregarCriterio, eliminarCriterio } from '../actions';
import { CalculadoraRubrica } from './CalculadoraRubrica';

export default async function EditorRubrica({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: rubrica } = await supabase
    .from('rubricas')
    .select('id, nombre, descripcion, escala_max, publica, materia:materias(nombre)')
    .eq('id', params.id)
    .single();

  if (!rubrica) return <EmptyState icon="🔍" title="Rúbrica no encontrada" />;

  const { data: criterios } = await supabase
    .from('rubrica_criterios')
    .select('*')
    .eq('rubrica_id', params.id)
    .order('orden');

  const pesoTotal = (criterios ?? []).reduce((a: number, c: any) => a + Number(c.peso ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rúbrica"
        title={rubrica.nombre}
        description={`${(rubrica as any).materia?.nombre ?? 'Sin materia'} · Escala ${rubrica.escala_max}${rubrica.publica ? ' · Pública' : ''}`}
        actions={<Link href="/profesor/rubricas" className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Banco</Link>}
      />

      {rubrica.descripcion && (
        <Card eyebrow="Descripción" title="">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{rubrica.descripcion}</p>
        </Card>
      )}

      <Card eyebrow="Criterios" title={`${(criterios ?? []).length} criterios · peso total ${pesoTotal}`}>
        {pesoTotal !== 0 && Math.abs(pesoTotal - 1) > 0.01 && Math.abs(pesoTotal - 100) > 0.5 && (
          <div className="mb-3 text-xs bg-dorado/20 text-verde-oscuro rounded-lg px-3 py-2">
            💡 Consejo: los pesos suelen sumar 1 (proporción) o 100 (%). Actual: {pesoTotal}.
          </div>
        )}
        {(criterios ?? []).length === 0 ? (
          <EmptyState icon="📝" title="Sin criterios" description="Agrega el primero con el formulario de abajo." />
        ) : (
          <div className="space-y-2">
            {criterios!.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white/70">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{c.nombre}</div>
                  {c.descripcion && <div className="text-xs text-gray-600 mt-0.5">{c.descripcion}</div>}
                  <div className="text-[11px] text-gray-500 mt-1">Peso {c.peso} · Máx {c.max_puntos} pts</div>
                </div>
                <form action={eliminarCriterio}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="rubrica_id" value={params.id} />
                  <button className="text-xs bg-rosa/20 text-rosa px-3 py-1 rounded-lg font-semibold">Eliminar</button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={agregarCriterio} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2 border-t border-gray-200 pt-4">
          <input type="hidden" name="rubrica_id" value={params.id} />
          <input name="nombre" required placeholder="Nombre del criterio" className="md:col-span-2 border border-gray-300 rounded-xl px-3 py-2 text-sm" />
          <input name="peso" type="number" step="0.01" defaultValue={1} placeholder="Peso" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" />
          <input name="max_puntos" type="number" step="0.5" defaultValue={10} placeholder="Máx. puntos" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" />
          <textarea name="descripcion" rows={2} placeholder="Descripción / indicador de logro (opcional)" className="md:col-span-4 border border-gray-300 rounded-xl px-3 py-2 text-sm" />
          <button className="md:col-span-4 bg-gradient-to-r from-verde to-verde-medio text-white rounded-xl px-4 py-2 text-sm font-semibold shadow hover:shadow-lg">
            Agregar criterio →
          </button>
        </form>
      </Card>

      {(criterios ?? []).length > 0 && (
        <Card eyebrow="Calculadora" title="Captura puntajes y obtén la calificación">
          <CalculadoraRubrica criterios={criterios as any[]} escalaMax={Number(rubrica.escala_max)} />
        </Card>
      )}
    </div>
  );
}
