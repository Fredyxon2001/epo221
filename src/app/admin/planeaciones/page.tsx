import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { RevisarPlaneacionForm } from './RevisarPlaneacionForm';
import { DescargarArchivoBtn } from '@/app/profesor/planeaciones/DescargarArchivoBtn';

const ESTADO_STYLE: Record<string, string> = {
  borrador: 'bg-gray-200 text-gray-700',
  enviada: 'bg-amber-100 text-amber-800',
  aprobada: 'bg-verde-claro/40 text-verde-oscuro',
  rechazada: 'bg-rose-100 text-rose-700',
};

export default async function AdminPlaneacionesPage({ searchParams }: { searchParams?: { estado?: string } }) {
  const supabase = createClient();
  const filtro = searchParams?.estado ?? 'enviada';

  let q = supabase
    .from('planeaciones')
    .select('*, asignacion:asignaciones(materia:materias(nombre), grupo:grupos(grado, grupo, turno), profesor:profesores(nombre, apellido_paterno))')
    .order('updated_at', { ascending: false });
  if (filtro !== 'todas') q = q.eq('estado', filtro);

  const { data: planes } = await q;

  const estados = ['enviada', 'aprobada', 'rechazada', 'borrador', 'todas'] as const;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dirección académica"
        title="📝 Revisión de planeaciones"
        description="Revisa las planeaciones enviadas por los docentes y aprueba u observa."
      />

      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {estados.map((e) => (
            <a key={e} href={`/admin/planeaciones?estado=${e}`}
              className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${filtro === e ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
              {e}
            </a>
          ))}
        </div>

        {(planes ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Sin resultados.</p>
        ) : (
          <div className="space-y-3">
            {planes!.map((p: any) => {
              const g = p.asignacion?.grupo;
              const grupo = g ? `${g.grado}°${String.fromCharCode(64 + (g.grupo ?? 1))} (${g.turno ?? ''})` : '—';
              const docente = p.asignacion?.profesor
                ? `${p.asignacion.profesor.nombre} ${p.asignacion.profesor.apellido_paterno ?? ''}`.trim()
                : '—';
              return (
                <div key={p.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{p.titulo}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${ESTADO_STYLE[p.estado]}`}>{p.estado}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">v{p.version}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {p.asignacion?.materia?.nombre} · {grupo} · Parcial {p.parcial} · Prof. {docente}
                      </div>
                      {p.contenido && <p className="mt-2 text-xs text-gray-700 whitespace-pre-wrap">{p.contenido}</p>}
                      {p.observaciones_revisor && (
                        <div className="mt-2 text-xs bg-amber-50 border-l-2 border-amber-400 p-2">
                          <strong>Observaciones previas: </strong>{p.observaciones_revisor}
                        </div>
                      )}
                    </div>
                    {p.archivo_url && <DescargarArchivoBtn path={p.archivo_url} nombre={p.archivo_nombre ?? 'archivo'} />}
                  </div>

                  {p.estado === 'enviada' && (
                    <div className="mt-3 pt-3 border-t">
                      <RevisarPlaneacionForm id={p.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
