import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card } from '@/components/privado/ui';
import { ComentarEvidenciaForm } from './ComentarEvidenciaForm';

export default async function PortafolioProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Asignaciones del profe → grupos → alumnos
  const { data: asigs } = await supabase.from('asignaciones')
    .select('id, grupo_id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('profesor_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');

  const gids = Array.from(new Set((asigs ?? []).map((a: any) => a.grupo_id)));
  const { data: insc } = gids.length
    ? await supabase.from('inscripciones').select('alumno_id, grupo_id, alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)').in('grupo_id', gids)
    : { data: [] as any[] };
  const aIds = (insc ?? []).map((i: any) => i.alumno_id);

  const { data: evs } = aIds.length
    ? await supabase.from('portafolio_evidencias')
        .select('*, asignacion:asignaciones(materia:materias(nombre))')
        .in('alumno_id', aIds).order('created_at', { ascending: false }).limit(200)
    : { data: [] as any[] };

  const admin = adminClient();
  const withUrls = await Promise.all((evs ?? []).map(async (e: any) => {
    const { data } = await admin.storage.from('portafolio').createSignedUrl(e.archivo_url, 3600);
    return { ...e, signedUrl: data?.signedUrl };
  }));

  const alumnoMap = new Map((insc ?? []).map((i: any) => [i.alumno_id, i.alumno]));

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Evaluación" title="🗂️ Portafolio de mis alumnos" description="Revisa y comenta las evidencias que suben tus alumnos." />

      <Card>
        {withUrls.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Aún no hay evidencias cargadas.</p>
        ) : (
          <div className="space-y-3">
            {withUrls.map((e) => {
              const al = alumnoMap.get(e.alumno_id);
              return (
                <div key={e.id} className={`border rounded-lg p-3 ${e.destacada ? 'border-dorado bg-dorado/5' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm">{e.destacada && '⭐ '}{e.titulo}</div>
                      <div className="text-xs text-gray-500">
                        {al ? `${al.apellido_paterno} ${al.nombre}` : '—'} · {al?.matricula ?? ''} · {e.asignacion?.materia?.nombre ?? 'General'} · {new Date(e.created_at).toLocaleDateString('es-MX')}
                      </div>
                    </div>
                  </div>
                  {e.descripcion && <p className="text-xs text-gray-700 mt-1">{e.descripcion}</p>}
                  {e.signedUrl && (
                    <a href={e.signedUrl} target="_blank" className="text-xs text-verde-oscuro font-semibold underline mt-1 inline-block">
                      📎 {e.archivo_nombre}
                    </a>
                  )}
                  <ComentarEvidenciaForm id={e.id} current={e.comentario_docente} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
