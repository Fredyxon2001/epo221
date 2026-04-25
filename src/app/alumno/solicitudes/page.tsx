// Lista de solicitudes de revisión del alumno.
import { getAlumnoActual } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { cerrarSolicitud } from './actions';
import { Adjunto } from '@/components/mensajes/Adjunto';
import Link from 'next/link';

const estadoLabel: Record<string, { label: string; tone: any; icon: string }> = {
  abierta:    { label: 'Abierta',    tone: 'ambar',   icon: '⏳' },
  respondida: { label: 'Respondida', tone: 'azul',    icon: '💬' },
  aceptada:   { label: 'Aceptada',   tone: 'verde',   icon: '✅' },
  rechazada:  { label: 'Rechazada',  tone: 'rosa',    icon: '❌' },
  cerrada:    { label: 'Cerrada',    tone: 'gray',    icon: '🔒' },
};

export default async function MisSolicitudes() {
  const alumno = (await getAlumnoActual())!;
  const supabase = createClient();

  const { data } = await supabase
    .from('solicitudes_revision')
    .select(`
      id, parcial, motivo, estado, respuesta, respondida_en, created_at, updated_at,
      adjunto_url, adjunto_nombre, adjunto_tipo, adjunto_tamano,
      respuesta_adjunto_url, respuesta_adjunto_nombre, respuesta_adjunto_tipo, respuesta_adjunto_tamano,
      asignacion:asignaciones(
        id,
        materia:materias(nombre),
        profesor:profesores(perfil:perfiles(nombre))
      )
    `)
    .eq('alumno_id', alumno.id)
    .order('created_at', { ascending: false });

  const items = data ?? [];
  const paths = items.flatMap((s: any) => [s.adjunto_url, s.respuesta_adjunto_url].filter(Boolean));
  const signedMap: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('solicitudes').createSignedUrls(paths, 3600);
    (signed ?? []).forEach((s: any) => { if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl; });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Mis solicitudes"
        title="Revisión de calificaciones"
        description="Aquí puedes dar seguimiento a tus solicitudes. El docente recibe una notificación cuando las creas."
        actions={
          <Link href="/alumno/calificaciones" className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2.5 rounded-xl shadow-md shadow-verde/30 transition inline-flex items-center gap-2">
            + Nueva solicitud
          </Link>
        }
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon="💬"
            title="No has creado solicitudes"
            description="Cuando dudes de alguna calificación, solicita la revisión desde el listado de calificaciones."
            action={
              <Link href="/alumno/calificaciones" className="inline-flex bg-verde text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-verde-oscuro">
                Ir a calificaciones
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((s: any) => {
            const e = estadoLabel[s.estado] ?? estadoLabel.abierta;
            return (
              <Card key={s.id} padding="none" className="overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-verde font-semibold">
                      Parcial {s.parcial ?? '—'}
                    </div>
                    <div className="font-serif text-lg text-verde-oscuro mt-1">{s.asignacion?.materia?.nombre ?? '—'}</div>
                    <div className="text-xs text-gray-500">Docente: {s.asignacion?.profesor?.perfil?.nombre ?? '—'}</div>
                  </div>
                  <Badge tone={e.tone} size="md">
                    <span className="mr-1">{e.icon}</span>{e.label}
                  </Badge>
                </div>

                <div className="p-5 space-y-3 bg-crema/30">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Mi motivo</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{s.motivo}</div>
                    {s.adjunto_url && signedMap[s.adjunto_url] && (
                      <div className="mt-2">
                        <Adjunto
                          signedUrl={signedMap[s.adjunto_url]}
                          nombre={s.adjunto_nombre ?? 'archivo'}
                          tipo={s.adjunto_tipo ?? ''}
                          tamano={s.adjunto_tamano}
                          esMio={false}
                        />
                      </div>
                    )}
                  </div>

                  {s.respuesta && (
                    <div className="bg-white border-l-4 border-verde rounded-r-lg p-3">
                      <div className="text-[10px] uppercase tracking-wider text-verde font-semibold mb-1">Respuesta del docente</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{s.respuesta}</div>
                      {s.respuesta_adjunto_url && signedMap[s.respuesta_adjunto_url] && (
                        <div className="mt-2">
                          <Adjunto
                            signedUrl={signedMap[s.respuesta_adjunto_url]}
                            nombre={s.respuesta_adjunto_nombre ?? 'archivo'}
                            tipo={s.respuesta_adjunto_tipo ?? ''}
                            tamano={s.respuesta_adjunto_tamano}
                            esMio={false}
                          />
                        </div>
                      )}
                      {s.respondida_en && (
                        <div className="text-[10px] text-gray-400 mt-1.5">
                          {new Date(s.respondida_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[11px] text-gray-400">
                      Enviada: {new Date(s.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </div>
                    {['respondida', 'aceptada', 'rechazada'].includes(s.estado) && (
                      <form action={cerrarSolicitud}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="text-[11px] font-semibold text-gray-500 hover:text-verde-oscuro hover:bg-white px-2.5 py-1 rounded-md transition"
                        >
                          ✓ Dar por cerrada
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
