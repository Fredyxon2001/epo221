import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { ResolverFichaForm, ReiniciarContadorBtn } from './ResolverFichaForm';

const LABELS: Record<string, string> = {
  email: 'Correo electrónico',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  codigo_postal: 'Código postal',
  municipio: 'Municipio',
  tutor_nombre: 'Nombre del tutor',
  tutor_parentesco: 'Parentesco',
  tutor_telefono: 'Teléfono del tutor',
  tutor_email: 'Correo del tutor',
};

export default async function SolicitudesFichaPage({ searchParams }: { searchParams?: { estado?: string } }) {
  const auth = createClient();
  const supabase = adminClient();
  const filtro = searchParams?.estado ?? 'pendiente';

  let q = supabase
    .from('solicitudes_modificacion_ficha')
    .select(`
      *,
      alumno:alumnos(id, matricula, nombre, apellido_paterno, apellido_materno, modificaciones_libres_usadas)
    `)
    .order('solicitado_at', { ascending: false });
  if (filtro !== 'todas') q = q.eq('estado', filtro);

  const { data: items } = await q;
  const filas = (items ?? []) as any[];

  const { data: todos } = await supabase.from('solicitudes_modificacion_ficha').select('estado');
  const counts = { pendiente: 0, aprobada: 0, rechazada: 0 };
  for (const t of todos ?? []) (counts as any)[(t as any).estado] = ((counts as any)[(t as any).estado] ?? 0) + 1;

  const estados = ['pendiente', 'aprobada', 'rechazada', 'todas'] as const;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Personas · Ficha de alumnos"
        title="📝 Solicitudes de modificación de ficha"
        description="Los alumnos pueden modificar su ficha 2 veces libremente. Para más cambios necesitan tu aprobación y deben justificar en Control Escolar."
      />

      <div className="grid grid-cols-3 gap-3">
        <Card><div className="text-xs text-gray-500 uppercase">Pendientes</div><div className="text-3xl font-bold text-amber-700 tabular-nums">{counts.pendiente}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Aprobadas</div><div className="text-3xl font-bold text-verde-oscuro tabular-nums">{counts.aprobada}</div></Card>
        <Card><div className="text-xs text-gray-500 uppercase">Rechazadas</div><div className="text-3xl font-bold text-rose-700 tabular-nums">{counts.rechazada}</div></Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {estados.map((e) => (
            <a key={e} href={`/admin/alumnos/solicitudes-ficha?estado=${e}`}
              className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${filtro === e ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
              {e}
            </a>
          ))}
        </div>

        {filas.length === 0 ? (
          <EmptyState icon="🎉" title="Sin solicitudes" description="No hay solicitudes con este filtro." />
        ) : (
          <div className="space-y-4">
            {filas.map((s) => {
              const al = s.alumno;
              const nombre = al ? `${al.nombre} ${al.apellido_paterno ?? ''} ${al.apellido_materno ?? ''}`.trim() : '—';
              const cambios = (s.cambios ?? {}) as Record<string, any>;
              const anteriores = (s.valores_anteriores ?? {}) as Record<string, any>;
              return (
                <div key={s.id} className={`border rounded-lg p-4 ${s.estado === 'aprobada' ? 'bg-verde-claro/10 border-verde' : s.estado === 'rechazada' ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300'}`}>
                  <div className="flex justify-between items-start gap-3 flex-wrap mb-3">
                    <div>
                      <div className="font-semibold text-base">{nombre}</div>
                      <div className="text-xs text-gray-600">
                        Matrícula: <strong>{al?.matricula ?? '—'}</strong> ·
                        Modificaciones usadas: <strong>{al?.modificaciones_libres_usadas ?? 0}/2</strong> ·
                        {new Date(s.solicitado_at).toLocaleString('es-MX')}
                      </div>
                    </div>
                    <Badge tone={s.estado === 'aprobada' ? 'verde' : s.estado === 'rechazada' ? 'rosa' : 'ambar'} size="sm">
                      {s.estado}
                    </Badge>
                  </div>

                  <div className="text-xs bg-white border border-gray-200 rounded p-2 mb-2">
                    <div className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Motivo del alumno</div>
                    {s.motivo}
                  </div>

                  <div className="bg-white border border-gray-200 rounded p-2 text-xs">
                    <div className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Cambios solicitados</div>
                    <table className="w-full">
                      <thead className="text-[10px] text-gray-500">
                        <tr><th className="text-left">Campo</th><th className="text-left">Valor anterior</th><th className="text-left">Valor nuevo</th></tr>
                      </thead>
                      <tbody>
                        {Object.entries(cambios).map(([campo, valNuevo]) => (
                          <tr key={campo} className="border-t border-gray-100">
                            <td className="py-1 font-semibold">{LABELS[campo] ?? campo}</td>
                            <td className="py-1 text-gray-500 line-through">{anteriores[campo] ?? '—'}</td>
                            <td className="py-1 text-verde-oscuro font-semibold">{String(valNuevo ?? '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {s.motivo_rechazo && (
                    <div className="mt-2 text-xs bg-rose-100 border border-rose-300 rounded p-2 text-rose-800">
                      <strong>Rechazado:</strong> {s.motivo_rechazo}
                    </div>
                  )}

                  {s.estado === 'pendiente' && (
                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                      <ResolverFichaForm id={s.id} />
                      {al?.id && (
                        <div className="text-[10px] text-gray-500 text-right">
                          <ReiniciarContadorBtn alumnoId={al.id} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <div className="text-xs text-gray-600 space-y-1">
          <p>📌 <strong>Flujo recomendado:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>El alumno solicita el cambio con motivo</li>
            <li>Acude a Control Escolar con identificación a justificar</li>
            <li>Verifican el motivo y autorizan</li>
            <li>Click "Aprobar" (aplica los cambios) o "Rechazar" (con motivo)</li>
            <li>Si quieres permitir más modificaciones libres en el futuro, usa el botón "Reiniciar contador"</li>
          </ol>
        </div>
      </Card>
    </div>
  );
}
