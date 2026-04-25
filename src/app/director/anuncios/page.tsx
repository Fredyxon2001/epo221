// La dirección comparte el mismo CRUD de anuncios — ajustado con estética institucional.
// Reutilizamos las server actions del admin.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { crearAnuncio, eliminarAnuncio, togglePublicado } from '@/app/admin/anuncios/actions';

const prioridadTone: Record<string, any> = {
  baja: 'gray', normal: 'azul', alta: 'ambar', urgente: 'rosa',
};

export default async function DirAnuncios() {
  const supabase = createClient();
  const { data } = await supabase
    .from('anuncios')
    .select('id, titulo, cuerpo, prioridad, audiencia, icono, fijado, publicado, created_at, autor_id')
    .order('fijado', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const items = data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dirección"
        title="Comunicados institucionales"
        description="La voz oficial de la escuela. Aparece en los dashboards privados según la audiencia."
      />

      <Card eyebrow="Nuevo" title="Publicar comunicado">
        <form action={crearAnuncio} className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Título</label>
            <input name="titulo" required minLength={4} placeholder="Ej. Homenaje institucional — lunes 10:00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Mensaje</label>
            <textarea name="cuerpo" rows={4} placeholder="Detalles del comunicado" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Audiencia</label>
            <select name="audiencia" defaultValue="todos" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-verde outline-none">
              <option value="todos">Comunidad EPO 221</option>
              <option value="alumnos">Sólo alumnos</option>
              <option value="profesores">Sólo docentes</option>
              <option value="admin">Administración</option>
              <option value="director">Dirección</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Prioridad</label>
            <select name="prioridad" defaultValue="alta" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-verde outline-none">
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Icono</label>
            <input name="icono" placeholder="🏛️" maxLength={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-verde outline-none" />
          </div>
          <div className="flex items-center gap-4 pt-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="fijado" defaultChecked className="accent-verde w-4 h-4" />
              📌 Fijar arriba
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="publicado" defaultChecked className="accent-verde w-4 h-4" />
              Publicar ahora
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="bg-gradient-to-r from-dorado to-dorado-claro text-verde-oscuro font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition">
              📣 Publicar comunicado
            </button>
          </div>
        </form>
      </Card>

      <Card eyebrow="Histórico" title="Comunicados recientes">
        {items.length === 0 ? (
          <EmptyState icon="📭" title="Sin comunicados" />
        ) : (
          <ul className="space-y-3">
            {items.map((a: any) => (
              <li key={a.id} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:bg-crema/40 transition">
                <div className="text-2xl">{a.icono ?? '📣'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-serif text-base text-verde-oscuro">{a.titulo}</div>
                    <Badge tone={prioridadTone[a.prioridad]} size="sm">{a.prioridad}</Badge>
                    <Badge tone="gray" size="sm">{a.audiencia}</Badge>
                    {a.fijado && <Badge tone="dorado" size="sm">📌 Fijado</Badge>}
                    {!a.publicado && <Badge tone="rosa" size="sm">Oculto</Badge>}
                  </div>
                  {a.cuerpo && <div className="text-sm text-gray-600 mt-1">{a.cuerpo}</div>}
                  <div className="text-[11px] text-gray-400 mt-1">{new Date(a.created_at).toLocaleString('es-MX')}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <form action={togglePublicado}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="publicado" value={String(a.publicado)} />
                    <button className="text-xs font-semibold px-2 py-1 rounded border border-gray-200 hover:bg-white">
                      {a.publicado ? '👁 Ocultar' : '🚀 Publicar'}
                    </button>
                  </form>
                  <form action={eliminarAnuncio}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-xs font-semibold px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50">
                      Eliminar
                    </button>
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
