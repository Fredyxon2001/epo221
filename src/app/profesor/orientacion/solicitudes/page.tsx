// Bandeja de SOLICITUDES de revisión que el ORIENTADOR debe acompañar.
// Cada solicitud creada para una asignación de un grupo orientado por mí aparece aquí.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { ConversacionSolicitud } from '@/components/solicitudes/Conversacion';

const ESTADO_TONO: Record<string, any> = {
  abierta: 'ambar', respondida: 'azul', aceptada: 'verde', rechazada: 'rosa', cerrada: 'gray',
};

export default async function OrientadorSolicitudes({ searchParams }: { searchParams?: { estado?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  if (!prof) return <div className="p-5">No eres docente.</div>;

  const filtro = searchParams?.estado ?? 'abierta';

  let q = supabase
    .from('solicitudes_revision')
    .select(`
      id, parcial, motivo, estado, respuesta, respondida_en, created_at, updated_at,
      adjunto_url, adjunto_nombre, adjunto_tipo, adjunto_tamano,
      respuesta_adjunto_url, respuesta_adjunto_nombre, respuesta_adjunto_tipo,
      alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula),
      asignacion:asignaciones(id, materia:materias(nombre), profesor:profesores(nombre, apellido_paterno), grupo:grupos(grado, grupo, turno))
    `)
    .eq('orientador_id', prof.id)
    .order('updated_at', { ascending: false });
  if (filtro !== 'todas') q = q.eq('estado', filtro);

  const { data: items } = await q;
  const filas = items ?? [];

  // Cargar mensajes de la conversación
  const ids = filas.map((s: any) => s.id);
  const { data: msgs } = ids.length
    ? await supabase.from('solicitudes_mensajes').select('*').in('solicitud_id', ids).order('created_at', { ascending: true })
    : { data: [] as any[] };
  const msgsBySolicitud: Record<string, any[]> = {};
  for (const m of msgs ?? []) (msgsBySolicitud[(m as any).solicitud_id] ??= []).push(m);

  const allPaths = (msgs ?? []).map((m: any) => m.adjunto_url).filter(Boolean);
  const signedMap: Record<string, string> = {};
  if (allPaths.length) {
    const { data: signed } = await supabase.storage.from('solicitudes').createSignedUrls(allPaths, 3600);
    (signed ?? []).forEach((s: any) => { if (s.path && s.signedUrl) signedMap[s.path] = s.signedUrl; });
  }

  // Conteos
  const { data: todasSol } = await supabase
    .from('solicitudes_revision').select('estado').eq('orientador_id', prof.id);
  const counts: Record<string, number> = { abierta: 0, respondida: 0, cerrada: 0, aceptada: 0, rechazada: 0 };
  for (const s of (todasSol ?? [])) counts[(s as any).estado] = (counts[(s as any).estado] ?? 0) + 1;

  const tabs = [
    { k: 'abierta', label: 'Abiertas', icon: '⏳' },
    { k: 'respondida', label: 'Respondidas', icon: '💬' },
    { k: 'cerrada', label: 'Cerradas', icon: '🔒' },
    { k: 'todas', label: 'Todas', icon: '📂' },
  ] as const;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Orientación · Acompañamiento"
        title="🧭 Solicitudes de revisión de mis grupos"
        description="Como orientador acompañas las conversaciones entre alumnos y maestros sobre revisiones de calificaciones."
      />

      <Card>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <a key={t.k} href={`/profesor/orientacion/solicitudes?estado=${t.k}`}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${filtro === t.k ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
              {t.icon} {t.label} {counts[t.k] != null && counts[t.k] > 0 && <span className="opacity-70">({counts[t.k]})</span>}
            </a>
          ))}
        </div>
      </Card>

      {filas.length === 0 ? (
        <Card><EmptyState icon="🎉" title="Sin solicitudes" description="No hay solicitudes con este filtro para tus grupos orientados." /></Card>
      ) : (
        <div className="space-y-4">
          {filas.map((s: any) => {
            const al = s.alumno;
            const nombre = al ? `${al.nombre} ${al.apellido_paterno ?? ''}`.trim() : '—';
            const maestro = s.asignacion?.profesor ? `${s.asignacion.profesor.nombre} ${s.asignacion.profesor.apellido_paterno ?? ''}`.trim() : '—';
            const g = s.asignacion?.grupo;
            const grupo = g ? `${g.grado}°${String.fromCharCode(64 + (g.grupo ?? 1))} (${g.turno ?? ''})` : '—';
            return (
              <Card key={s.id} padding="none">
                <div className="p-4 border-b border-gray-100 flex justify-between items-start gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge tone="dorado" size="sm">Parcial {s.parcial ?? '—'}</Badge>
                      <Badge tone={ESTADO_TONO[s.estado]} size="sm">{s.estado}</Badge>
                    </div>
                    <div className="font-serif text-base text-verde-oscuro">{s.asignacion?.materia?.nombre} · {grupo}</div>
                    <div className="text-xs text-gray-500">
                      Alumno: <strong>{nombre}</strong> · Maestro: {maestro}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 bg-crema/30">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Motivo del alumno</div>
                    <div className="text-sm bg-white border border-gray-200 rounded p-2">{s.motivo}</div>
                  </div>
                  {s.respuesta && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-verde font-semibold mb-1">Respuesta del maestro</div>
                      <div className="text-sm bg-verde-claro/10 border border-verde/30 rounded p-2">{s.respuesta}</div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">💬 Conversación (puedes intervenir como orientador)</div>
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
