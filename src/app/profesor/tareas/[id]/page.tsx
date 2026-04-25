import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card } from '@/components/privado/ui';
import { CalificarEntregaForm } from './CalificarEntregaForm';

export default async function TareaDetalle({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  const { data: tarea } = await supabase.from('tareas')
    .select('*, asignacion:asignaciones(id, profesor_id, grupo_id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno))')
    .eq('id', params.id).maybeSingle();

  if (!tarea || (tarea as any).asignacion?.profesor_id !== prof?.id) {
    return <div className="p-5">Tarea no encontrada o sin permiso.</div>;
  }

  const { data: inscrip } = await supabase.from('inscripciones')
    .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)')
    .eq('grupo_id', (tarea as any).asignacion.grupo_id);

  const { data: entregas } = await supabase.from('entregas_tarea')
    .select('*').eq('tarea_id', params.id);
  const byAlumno = new Map((entregas ?? []).map((e: any) => [e.alumno_id, e]));

  const admin = adminClient();

  const alumnosConEntrega = await Promise.all((inscrip ?? []).map(async (i: any) => {
    const e = byAlumno.get(i.alumno.id);
    let url: string | null = null;
    if (e?.archivo_url) {
      const { data } = await admin.storage.from('tareas').createSignedUrl(e.archivo_url, 3600);
      url = data?.signedUrl ?? null;
    }
    return { alumno: i.alumno, entrega: e, signedUrl: url };
  }));

  const entregadas = alumnosConEntrega.filter((x) => x.entrega).length;
  const calificadas = alumnosConEntrega.filter((x) => x.entrega?.calificacion != null).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${(tarea as any).asignacion.materia?.nombre ?? ''} · ${(tarea as any).asignacion.grupo?.semestre}° ${(tarea as any).asignacion.grupo?.grupo}`}
        title={tarea.titulo}
        description={`Entrega: ${new Date(tarea.fecha_entrega).toLocaleString('es-MX')} · ${tarea.puntos} pts · ${entregadas}/${alumnosConEntrega.length} entregadas · ${calificadas} calificadas`}
        actions={<Link href="/profesor/tareas" className="text-xs text-verde font-semibold hover:underline">← Volver</Link>}
      />

      <Card eyebrow="Instrucciones" title="">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{tarea.instrucciones}</p>
      </Card>

      <Card eyebrow="Entregas" title="Alumnos">
        <div className="divide-y divide-gray-100">
          {alumnosConEntrega.map(({ alumno, entrega, signedUrl }) => (
            <div key={alumno.id} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {alumno.apellido_paterno} {alumno.apellido_materno ?? ''} {alumno.nombre}
                  </div>
                  <div className="text-xs text-gray-500">{alumno.matricula ?? '—'}</div>
                  {entrega ? (
                    <div className="text-xs mt-1 text-gray-600">
                      Entregado: {new Date(entrega.entregado_at).toLocaleString('es-MX')}
                      {signedUrl && (
                        <> · <a href={signedUrl} target="_blank" className="text-verde-oscuro underline">📎 {entrega.archivo_nombre ?? 'archivo'}</a></>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs mt-1 text-rose-600">Sin entrega</div>
                  )}
                  {entrega?.comentario && <div className="text-xs text-gray-700 italic mt-1">"{entrega.comentario}"</div>}
                </div>
                <div className="text-right shrink-0">
                  {entrega?.calificacion != null ? (
                    <div className="text-xl font-bold text-verde-oscuro tabular-nums">{entrega.calificacion}</div>
                  ) : (
                    <span className="text-xs text-gray-400">Sin calificar</span>
                  )}
                </div>
              </div>
              {entrega && <CalificarEntregaForm entrega={entrega} puntosMax={tarea.puntos} />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
