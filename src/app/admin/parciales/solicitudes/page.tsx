import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { ResolverForm } from './ResolverForm';

export default async function SolicitudesParcialPage({ searchParams }: { searchParams?: { estado?: string } }) {
  const auth = createClient();
  const supabase = adminClient();
  const filtro = searchParams?.estado ?? 'pendiente';

  let q = supabase
    .from('solicitudes_parcial')
    .select(`
      *,
      solicitante:perfiles!solicitudes_parcial_solicitado_por_fkey(nombre, email),
      asignacion:asignaciones(materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno))
    `)
    .order('solicitado_at', { ascending: false });
  if (filtro !== 'todas') q = q.eq('estado', filtro);

  const { data: items } = await q;
  const filas = (items ?? []) as any[];

  const counts = { pendiente: 0, aprobada: 0, rechazada: 0 };
  const { data: todos } = await supabase.from('solicitudes_parcial').select('estado');
  for (const t of todos ?? []) (counts as any)[(t as any).estado] = ((counts as any)[(t as any).estado] ?? 0) + 1;

  const estados = ['pendiente', 'aprobada', 'rechazada', 'todas'] as const;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Académico"
        title="📋 Solicitudes de parcial"
        description="Los maestros pueden solicitar la apertura/creación de un parcial cuando lo necesiten. Aprueba o rechaza según corresponda."
      />

      <div className="grid grid-cols-3 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase">Pendientes</div><div className="text-3xl font-bold text-amber-700 tabular-nums">{counts.pendiente}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Aprobadas</div><div className="text-3xl font-bold text-verde-oscuro tabular-nums">{counts.aprobada}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Rechazadas</div><div className="text-3xl font-bold text-rose-700 tabular-nums">{counts.rechazada}</div></Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {estados.map((e) => (
            <a key={e} href={`/admin/parciales/solicitudes?estado=${e}`}
              className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${filtro === e ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
              {e}
            </a>
          ))}
        </div>

        {filas.length === 0 ? (
          <EmptyState icon="🎉" title="Sin solicitudes" description="No hay solicitudes que coincidan con este filtro." />
        ) : (
          <div className="space-y-3">
            {filas.map((s) => {
              const asig = s.asignacion;
              const g = asig?.grupo;
              const grupo = g ? `${g.grado}°${String.fromCharCode(64 + (g.grupo ?? 1))} ${g.turno ?? ''}` : 'Todo el ciclo';
              return (
                <div key={s.id} className={`border rounded-lg p-3 ${s.estado === 'aprobada' ? 'bg-verde-claro/10 border-verde' : s.estado === 'rechazada' ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300'}`}>
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge tone="dorado" size="sm">Parcial {s.numero}</Badge>
                        <Badge tone={s.estado === 'aprobada' ? 'verde' : s.estado === 'rechazada' ? 'rosa' : 'ambar'} size="sm">{s.estado}</Badge>
                        {asig && <span className="text-xs text-gray-700"><strong>{asig.materia?.nombre}</strong> · {grupo}</span>}
                        {!asig && <span className="text-xs text-gray-500">(Solicitud general — sin asignación específica)</span>}
                      </div>
                      <div className="text-xs text-gray-600">
                        Solicitado por: <strong>{s.solicitante?.nombre ?? s.solicitante?.email ?? '—'}</strong> ·
                        {new Date(s.solicitado_at).toLocaleString('es-MX')}
                      </div>
                      <div className="mt-2 text-sm bg-white border border-gray-200 rounded p-2">
                        <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Motivo</div>
                        {s.motivo}
                      </div>
                      {(s.fecha_abre_sugerida || s.fecha_cierra_sugerida) && (
                        <div className="mt-2 text-xs text-gray-600">
                          📅 Sugerencia de fechas:
                          {s.fecha_abre_sugerida && <> abre <strong>{s.fecha_abre_sugerida}</strong></>}
                          {s.fecha_cierra_sugerida && <>, cierra <strong>{s.fecha_cierra_sugerida}</strong></>}
                        </div>
                      )}
                      {s.nombre_sugerido && (
                        <div className="text-xs text-gray-600">📝 Nombre sugerido: <strong>{s.nombre_sugerido}</strong></div>
                      )}
                      {s.motivo_rechazo && (
                        <div className="mt-2 text-xs bg-rose-100 border border-rose-300 rounded p-2 text-rose-800">
                          <strong>Rechazado:</strong> {s.motivo_rechazo}
                        </div>
                      )}
                    </div>
                  </div>

                  {s.estado === 'pendiente' && <ResolverForm id={s.id} />}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
