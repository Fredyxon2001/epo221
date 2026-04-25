// Supervisión global de solicitudes de revisión (sin poder responderlas — eso es del profesor).
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';

const estadoTone: Record<string, any> = {
  abierta: 'ambar', respondida: 'azul', aceptada: 'verde', rechazada: 'rosa', cerrada: 'gray',
};

export default async function DirSolicitudes({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = (searchParams.tab ?? 'todas') as 'todas' | 'abierta' | 'respondida' | 'aceptada' | 'rechazada' | 'cerrada';
  const supabase = createClient();

  let q = supabase
    .from('solicitudes_revision')
    .select(`
      id, parcial, motivo, respuesta, estado, created_at, respondida_en,
      alumno:alumnos(nombre, apellido_paterno, apellido_materno, matricula),
      asignacion:asignaciones(
        materia:materias(nombre),
        grupo:grupos(semestre, grupo, turno),
        profesor:profesores(perfil:perfiles(nombre))
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (tab !== 'todas') q = q.eq('estado', tab as any);

  const { data } = await q;
  const items = data ?? [];

  const { data: counts } = await supabase.from('solicitudes_revision').select('estado');
  const acc: Record<string, number> = {};
  (counts ?? []).forEach((r: any) => { acc[r.estado] = (acc[r.estado] ?? 0) + 1; });

  const tabs: { key: typeof tab; label: string; icon: string; count?: number }[] = [
    { key: 'todas', label: 'Todas', icon: '📂', count: counts?.length ?? 0 },
    { key: 'abierta', label: 'Abiertas', icon: '⏳', count: acc.abierta },
    { key: 'respondida', label: 'Respondidas', icon: '💬', count: acc.respondida },
    { key: 'aceptada', label: 'Aceptadas', icon: '✅', count: acc.aceptada },
    { key: 'rechazada', label: 'Rechazadas', icon: '❌', count: acc.rechazada },
    { key: 'cerrada', label: 'Cerradas', icon: '🔒', count: acc.cerrada },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Supervisión"
        title="Solicitudes de revisión — institucional"
        description="Vista ejecutiva de la calidad del proceso de evaluación. Aquí puedes identificar docentes con solicitudes pendientes o materias con alta recurrencia."
      />

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <a
              key={t.key}
              href={`/director/solicitudes?tab=${t.key}`}
              className={`relative px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${active ? 'text-verde-oscuro' : 'text-gray-500 hover:text-verde-oscuro'}`}
            >
              <span className="inline-flex items-center gap-2">
                {t.icon} {t.label}
                {t.count != null && (
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
        <Card><EmptyState icon="📭" title="Sin registros" /></Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-gray-100">
            {items.map((s: any) => (
              <li key={s.id} className="p-4 hover:bg-crema/40 transition">
                <div className="flex items-start gap-3">
                  <Badge tone={estadoTone[s.estado]} size="sm">{s.estado}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-verde-oscuro">
                        {s.alumno?.apellido_paterno} {s.alumno?.apellido_materno} {s.alumno?.nombre}
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">{s.alumno?.matricula}</span>
                      <Badge tone="dorado" size="sm">Parcial {s.parcial ?? '—'}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {s.asignacion?.materia?.nombre} · Grupo {s.asignacion?.grupo?.grupo}° {s.asignacion?.grupo?.turno} · Docente: {(s.asignacion?.profesor as any)?.perfil?.nombre ?? '—'}
                    </div>
                    <div className="text-sm text-gray-700 mt-2 line-clamp-2"><strong className="text-gray-500">Motivo:</strong> {s.motivo}</div>
                    {s.respuesta && (
                      <div className="text-sm text-gray-700 mt-1 line-clamp-2"><strong className="text-verde">Respuesta:</strong> {s.respuesta}</div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                      {new Date(s.created_at).toLocaleString('es-MX')}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
