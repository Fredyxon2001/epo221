// Bitácora docente: registra tema visto en clase, actividades, observaciones y tarea.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';
import Link from 'next/link';
import { registrarClase, eliminarRegistro } from './actions';

export default async function Bitacora({
  params, searchParams,
}: {
  params: { asignacionId: string };
  searchParams: { ok?: string; error?: string };
}) {
  const supabase = createClient();

  const { data: asig } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(semestre, grupo, turno)')
    .eq('id', params.asignacionId).single();

  const { data: registros } = await supabase
    .from('bitacora_clase')
    .select('*').eq('asignacion_id', params.asignacionId)
    .order('fecha', { ascending: false });

  const m = asig as any;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bitácora"
        title={m?.materia?.nombre ?? 'Bitácora docente'}
        description={m?.grupo ? `${m.grupo.semestre}° semestre · ${m.grupo.turno}` : ''}
        actions={<Link href={`/profesor/grupo/${params.asignacionId}`} className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />

      {searchParams.ok && <div className="rounded-lg bg-verde-claro/30 border border-verde/30 px-4 py-2 text-sm text-verde-oscuro">✓ {decodeURIComponent(searchParams.ok)}</div>}
      {searchParams.error && <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-700">⚠ {decodeURIComponent(searchParams.error)}</div>}

      <Card eyebrow="Nueva entrada" title="Registrar clase">
        <form action={registrarClase} className="grid md:grid-cols-2 gap-3 text-sm">
          <input type="hidden" name="asignacion_id" value={params.asignacionId} />
          <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className="border rounded px-2 py-1.5" />
          <input name="tema" required placeholder="Tema de la clase *" className="border rounded px-2 py-1.5" />
          <textarea name="actividades" placeholder="Actividades realizadas" rows={3} className="border rounded px-2 py-1.5 md:col-span-2" />
          <textarea name="observaciones" placeholder="Observaciones (comportamiento, participación, etc.)" rows={2} className="border rounded px-2 py-1.5 md:col-span-2" />
          <input name="tarea" placeholder="Tarea para la próxima sesión" className="border rounded px-2 py-1.5 md:col-span-2" />
          <button className="bg-verde text-white rounded px-4 py-2 hover:bg-verde-medio md:col-span-2 font-semibold">
            Guardar registro
          </button>
        </form>
      </Card>

      <Card eyebrow="Historial" title={`${(registros ?? []).length} registros`}>
        {(registros ?? []).length === 0 ? (
          <EmptyState icon="📖" title="Sin registros" description="Aún no hay clases registradas en la bitácora." />
        ) : (
          <ol className="relative border-l-2 border-verde/20 ml-3 space-y-4 pt-2">
            {(registros ?? []).map((r: any) => (
              <li key={r.id} className="ml-6">
                <span className="absolute -left-3.5 w-7 h-7 rounded-full bg-white border-2 border-verde flex items-center justify-center text-sm">📝</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone="verde">{new Date(r.fecha).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}</Badge>
                  <span className="font-semibold text-verde-oscuro">{r.tema}</span>
                  <form action={eliminarRegistro} className="ml-auto">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="asignacion_id" value={params.asignacionId} />
                    <button className="text-[10px] text-rose-500 hover:text-rose-700">eliminar</button>
                  </form>
                </div>
                {r.actividades && <div className="text-sm text-gray-700 mt-1"><strong>Actividades:</strong> {r.actividades}</div>}
                {r.observaciones && <div className="text-sm text-gray-600 mt-1 italic">{r.observaciones}</div>}
                {r.tarea && <div className="text-sm text-amber-700 mt-1"><strong>Tarea:</strong> {r.tarea}</div>}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
