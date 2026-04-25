import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { NuevaPlaneacionForm } from './NuevaPlaneacionForm';
import { EliminarPlaneacionBtn } from './EliminarPlaneacionBtn';
import { DescargarArchivoBtn } from './DescargarArchivoBtn';

const ESTADO_STYLE: Record<string, string> = {
  borrador: 'bg-gray-200 text-gray-700',
  enviada: 'bg-amber-100 text-amber-800',
  aprobada: 'bg-verde-claro/40 text-verde-oscuro',
  rechazada: 'bg-rose-100 text-rose-700',
};

export default async function ProfesorPlaneacionesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  if (!prof) return <div className="p-5">No eres docente.</div>;

  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('profesor_id', prof.id);

  const asigIds = (asigs ?? []).map((a: any) => a.id);
  const { data: planes } = asigIds.length
    ? await supabase.from('planeaciones')
        .select('*, asignacion:asignaciones(materia:materias(nombre), grupo:grupos(grado, grupo))')
        .in('asignacion_id', asigIds)
        .order('updated_at', { ascending: false })
    : { data: [] as any[] };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Planeación didáctica"
        title="📝 Mis planeaciones"
        description="Sube tu planeación por parcial y asignatura. Cada envío se versiona; dirección puede aprobarla u observarla."
      />

      <Card eyebrow="Nueva versión" title="Subir planeación">
        <NuevaPlaneacionForm asignaciones={asigs ?? []} />
      </Card>

      <Card eyebrow={`Historial (${planes?.length ?? 0})`} title="Mis planeaciones">
        {(planes ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Aún no has subido planeaciones.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {planes!.map((p: any) => {
              const g = p.asignacion?.grupo;
              const grupo = g ? `${g.grado}°${String.fromCharCode(64 + (g.grupo ?? 1))}` : '—';
              return (
                <div key={p.id} className="py-3 flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{p.titulo}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${ESTADO_STYLE[p.estado] ?? 'bg-gray-200'}`}>
                        {p.estado}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">v{p.version}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.asignacion?.materia?.nombre} · {grupo} · Parcial {p.parcial}
                    </div>
                    {p.observaciones_revisor && (
                      <div className="mt-2 text-xs bg-amber-50 border-l-2 border-amber-400 p-2">
                        <strong>Observaciones: </strong>{p.observaciones_revisor}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    {p.archivo_url && <DescargarArchivoBtn path={p.archivo_url} nombre={p.archivo_nombre ?? 'archivo'} />}
                    {p.estado !== 'aprobada' && <EliminarPlaneacionBtn id={p.id} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
