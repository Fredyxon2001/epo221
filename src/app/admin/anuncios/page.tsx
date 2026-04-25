// Gestión de anuncios internos (visibles en dashboards privados).
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { crearAnuncio, eliminarAnuncio, togglePublicado } from './actions';

const prioridadTone: Record<string, any> = {
  baja: 'gray', normal: 'azul', alta: 'ambar', urgente: 'rosa',
};

export default async function AdminAnuncios() {
  const supabase = createClient();
  const { data } = await supabase
    .from('anuncios')
    .select('id, titulo, cuerpo, prioridad, audiencia, icono, fijado, publicado, grupo_id, rol_objetivo, created_at, grupo:grupos(grado, semestre, grupo)')
    .order('fijado', { ascending: false })
    .order('created_at', { ascending: false });

  const items = data ?? [];

  const { data: gruposList } = await supabase
    .from('grupos').select('id, grado, semestre, grupo, turno')
    .order('semestre').order('grupo');

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Comunicación interna"
        title="Anuncios"
        description="Publica mensajes que aparecerán en los dashboards de alumnos, profesores o dirección según la audiencia seleccionada."
      />

      <Card eyebrow="Nuevo" title="Publicar anuncio interno">
        <form action={crearAnuncio} className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Título</label>
            <input name="titulo" required minLength={4} placeholder="Ej. Junta general con docentes el viernes" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Mensaje</label>
            <textarea name="cuerpo" rows={3} placeholder="Detalles del anuncio" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Audiencia</label>
            <select name="audiencia" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none">
              <option value="todos">Todos</option>
              <option value="alumnos">Alumnos</option>
              <option value="profesores">Profesores</option>
              <option value="admin">Administración</option>
              <option value="director">Dirección</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Prioridad</label>
            <select name="prioridad" defaultValue="normal" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none">
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Icono (emoji)</label>
            <input name="icono" placeholder="📣" maxLength={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Anclar a grupo (opcional)</label>
            <select name="grupo_id" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none">
              <option value="">— Toda la escuela —</option>
              {(gruposList ?? []).map((g: any) => {
                const codigo = `${g.grado ?? Math.ceil(g.semestre / 2)}0${g.grupo}`;
                return <option key={g.id} value={g.id}>{codigo} · {g.semestre}° sem · {g.turno}</option>;
              })}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">Solo alumnos inscritos en ese grupo verán el aviso.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">Rol destino (opcional)</label>
            <select name="rol_objetivo" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none">
              <option value="">— Según audiencia —</option>
              <option value="profesor">Solo profesores</option>
              <option value="alumno">Solo alumnos</option>
              <option value="tutor">Solo tutores</option>
            </select>
          </div>
          <div className="flex items-center gap-4 pt-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="fijado" className="accent-verde w-4 h-4" />
              📌 Fijar arriba
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="publicado" defaultChecked className="accent-verde w-4 h-4" />
              Publicar ahora
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-verde/30">
              Publicar anuncio
            </button>
          </div>
        </form>
      </Card>

      <Card eyebrow="Histórico" title="Anuncios publicados">
        {items.length === 0 ? (
          <EmptyState icon="📭" title="Sin anuncios" description="Crea el primero con el formulario de arriba." />
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
                    {a.grupo_id && a.grupo && (
                      <Badge tone="azul" size="sm">
                        🎯 {(a.grupo.grado ?? Math.ceil(a.grupo.semestre / 2))}0{a.grupo.grupo}
                      </Badge>
                    )}
                    {a.rol_objetivo && <Badge tone="verde" size="sm">{a.rol_objetivo}</Badge>}
                    {a.fijado && <Badge tone="dorado" size="sm">📌 Fijado</Badge>}
                    {!a.publicado && <Badge tone="rosa" size="sm">Oculto</Badge>}
                  </div>
                  {a.cuerpo && <div className="text-sm text-gray-600 mt-1">{a.cuerpo}</div>}
                  <div className="text-[11px] text-gray-400 mt-1">
                    {new Date(a.created_at).toLocaleString('es-MX')}
                  </div>
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
