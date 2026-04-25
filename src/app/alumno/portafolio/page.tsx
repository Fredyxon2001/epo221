import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';
import { SubirEvidenciaForm } from './SubirEvidenciaForm';
import { EliminarEvidenciaBtn } from './EliminarEvidenciaBtn';

export default async function PortafolioAlumno() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();
  const admin = adminClient();

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();
  const { data: insc } = await supabase.from('inscripciones').select('grupo_id').eq('alumno_id', alumno.id);
  const gids = (insc ?? []).map((i: any) => i.grupo_id);
  const { data: asigs } = gids.length
    ? await supabase.from('asignaciones').select('id, materia:materias(nombre)').in('grupo_id', gids).eq('ciclo_id', ciclo?.id ?? '')
    : { data: [] as any[] };

  const { data: evidencias } = await supabase.from('portafolio_evidencias')
    .select('*, asignacion:asignaciones(materia:materias(nombre))')
    .eq('alumno_id', alumno.id).order('created_at', { ascending: false });

  const withUrls = await Promise.all((evidencias ?? []).map(async (e: any) => {
    const { data } = await admin.storage.from('portafolio').createSignedUrl(e.archivo_url, 3600);
    return { ...e, signedUrl: data?.signedUrl };
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Mis trabajos destacados"
        title="🗂️ Portafolio de evidencias"
        description="Sube trabajos, proyectos, certificados o cualquier evidencia que muestre tu progreso."
      />

      <Card eyebrow="Nueva evidencia" title="Agregar">
        <SubirEvidenciaForm asignaciones={asigs ?? []} />
      </Card>

      <Card eyebrow={`Evidencias (${withUrls.length})`} title="Mi portafolio">
        {withUrls.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Aún no agregas evidencias.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {withUrls.map((e) => (
              <div key={e.id} className={`border rounded-lg p-3 ${e.destacada ? 'border-dorado bg-dorado/5' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {e.destacada && '⭐ '}{e.titulo}
                    </div>
                    <div className="text-xs text-gray-500">
                      {e.asignacion?.materia?.nombre ?? 'General'} · {new Date(e.created_at).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                  <EliminarEvidenciaBtn id={e.id} />
                </div>
                {e.descripcion && <p className="text-xs text-gray-700 mt-1">{e.descripcion}</p>}
                {e.signedUrl && (
                  <a href={e.signedUrl} target="_blank" className="text-xs text-verde-oscuro font-semibold underline mt-2 inline-block">
                    📎 {e.archivo_nombre}
                  </a>
                )}
                {e.comentario_docente && (
                  <div className="mt-2 bg-verde-claro/20 border-l-2 border-verde p-2 text-xs">
                    <div className="text-verde-oscuro font-semibold uppercase tracking-wider text-[10px]">Comentario docente</div>
                    <p className="italic">{e.comentario_docente}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
