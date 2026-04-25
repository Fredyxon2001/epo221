// Bandeja de solicitudes de revisión para el profesor.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { ResponderForm } from './ResponderForm';
import { Adjunto } from '@/components/mensajes/Adjunto';
import { ConversacionSolicitud } from '@/components/solicitudes/Conversacion';

export default async function ProfSolicitudes({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = (searchParams.tab ?? 'abierta') as 'abierta' | 'respondida' | 'cerrada' | 'todas';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  const { data: asigs } = await supabase.from('asignaciones').select('id').eq('profesor_id', profesor?.id ?? '');
  const asigIds = (asigs ?? []).map((a: any) => a.id);

  let q = supabase
    .from('solicitudes_revision')
    .select(`
      id, parcial, motivo, estado, respuesta, respondida_en, created_at,
      adjunto_url, adjunto_nombre, adjunto_tipo, adjunto_tamano,
      respuesta_adjunto_url, respuesta_adjunto_nombre, respuesta_adjunto_tipo, respuesta_adjunto_tamano,
      alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula, curp),
      asignacion:asignaciones(id, materia:materias(nombre, semestre), grupo:grupos(grupo, turno))
    `)
    .in('asignacion_id', asigIds.length ? asigIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false });

  if (tab !== 'todas') q = q.eq('estado', tab as any);
  const { data } = await q;
  const items = (data ?? []) as any[];

  const ids = items.map((s: any) => s.id);
  const { data: msgs } = ids.length
    ? await supabase.from('solicitudes_mensajes').select('*').in('solicitud_id', ids).order('created_at', { ascending: true })
    : { data: [] as any[] };
  const msgsBySolicitud: Record<string, any[]> = {};
  for (const m of msgs ?? []) (msgsBySolicitud[(m as any).solicitud_id] ??= []).push(m);

  const paths = [
    ...items.flatMap((s: any) => [s.adjunto_url, s.respuesta_adjunto_url].filter(Boolean)),
    ...(msgs ?? []).map((m: any) => m.adjunto_url).filter(Boolean),
  ];
  const signedMap: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage.from('solicitudes').createSignedUrls(paths, 3600);
    (signed ?? []).forEach((s: any) => { if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl; });
  }

  // Counts por pestaña
  const counts = {
    abierta: 0, respondida: 0, cerrada: 0,
  } as Record<string, number>;
  if (asigIds.length) {
    const { data: c } = await supabase
      .from('solicitudes_revision')
      .select('estado')
      .in('asignacion_id', asigIds);
    (c ?? []).forEach((r: any) => { counts[r.estado] = (counts[r.estado] ?? 0) + 1; });
  }

  const tabs: { key: typeof tab; label: string; icon: string; count?: number }[] = [
    { key: 'abierta',    label: 'Por responder', icon: '⏳', count: counts.abierta },
    { key: 'respondida', label: 'Respondidas',   icon: '💬', count: counts.respondida },
    { key: 'cerrada',    label: 'Cerradas',      icon: '🔒', count: counts.cerrada },
    { key: 'todas',      label: 'Todas',         icon: '📂' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bandeja"
        title="Solicitudes de revisión"
        description="Los alumnos pueden pedir aclaraciones sobre sus calificaciones. Responde con criterios claros para cerrar cada caso."
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <a
              key={t.key}
              href={`/profesor/solicitudes?tab=${t.key}`}
              className={`relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                active ? 'text-verde-oscuro' : 'text-gray-500 hover:text-verde-oscuro'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {t.icon} {t.label}
                {t.count != null && t.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-verde text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {t.count}
                  </span>
                )}
              </span>
              {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-verde rounded-full" />}
            </a>
          );
        })}
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === 'abierta' ? '🎉' : '📭'}
            title={tab === 'abierta' ? 'Sin solicitudes por responder' : 'Sin registros en esta pestaña'}
            description={tab === 'abierta' ? 'Cuando algún alumno solicite una revisión aparecerá aquí.' : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((s: any) => {
            const nombre = `${s.alumno?.apellido_paterno ?? ''} ${s.alumno?.apellido_materno ?? ''} ${s.alumno?.nombre ?? ''}`.trim();
            return (
              <Card key={s.id} padding="none">
                <div className="p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b border-gray-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="dorado" size="sm">Parcial {s.parcial ?? '—'}</Badge>
                      <Badge tone={s.estado === 'abierta' ? 'ambar' : s.estado === 'respondida' ? 'azul' : s.estado === 'aceptada' ? 'verde' : s.estado === 'rechazada' ? 'rosa' : 'gray'} size="sm">
                        {s.estado}
                      </Badge>
                      <span className="text-[11px] text-gray-500">
                        {new Date(s.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="font-serif text-lg text-verde-oscuro mt-1.5">{s.asignacion?.materia?.nombre}</div>
                    <div className="text-xs text-gray-500">
                      {nombre} · <span className="font-mono">{s.alumno?.matricula ?? s.alumno?.curp}</span>
                      {s.asignacion?.grupo && ` · Grupo ${s.asignacion.grupo.grupo} ${s.asignacion.grupo.turno}`}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3 bg-crema/30">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Motivo del alumno</div>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200">
                      {s.motivo}
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
                  </div>

                  {s.respuesta && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-verde font-semibold mb-1">Tu respuesta</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-verde-claro/10 border border-verde/30 rounded-lg p-3">
                        {s.respuesta}
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
                      </div>
                      {s.respondida_en && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          Enviado: {new Date(s.respondida_en).toLocaleString('es-MX')}
                        </div>
                      )}
                    </div>
                  )}

                  {s.estado === 'abierta' && !s.respuesta && <ResponderForm id={s.id} />}

                  <div className="border-t border-gray-200 pt-3 mt-2">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">💬 Conversación</div>
                    <ConversacionSolicitud
                      solicitudId={s.id}
                      estado={s.estado}
                      miRol="profesor"
                      mensajes={(msgsBySolicitud[s.id] ?? []).map((m: any) => ({
                        ...m,
                        signedUrl: m.adjunto_url ? signedMap[m.adjunto_url] : null,
                      }))}
                    />
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
