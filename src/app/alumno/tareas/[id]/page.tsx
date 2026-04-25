import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';
import { EntregarTareaForm } from './EntregarTareaForm';

export default async function TareaAlumnoDetalle({ params }: { params: { id: string } }) {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();

  const { data: tarea } = await supabase.from('tareas')
    .select('*, asignacion:asignaciones(materia:materias(nombre), grupo:grupos(grado, semestre, grupo))')
    .eq('id', params.id).maybeSingle();
  if (!tarea) return <div className="p-5">Tarea no encontrada.</div>;

  const { data: entrega } = await supabase.from('entregas_tarea')
    .select('*').eq('tarea_id', params.id).eq('alumno_id', alumno.id).maybeSingle();

  let signedUrl: string | null = null;
  if (entrega?.archivo_url) {
    const admin = adminClient();
    const { data } = await admin.storage.from('tareas').createSignedUrl(entrega.archivo_url, 3600);
    signedUrl = data?.signedUrl ?? null;
  }

  const vence = new Date(tarea.fecha_entrega);
  const cerrada = tarea.cierra_estricto && vence < new Date();
  const calificada = entrega?.calificacion != null;

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow={`${(tarea as any).asignacion?.materia?.nombre ?? ''}`}
        title={tarea.titulo}
        description={`Entrega: ${vence.toLocaleString('es-MX')} · ${tarea.puntos} pts`}
        actions={<Link href="/alumno/tareas" className="text-xs text-verde font-semibold hover:underline">← Volver</Link>}
      />

      <Card eyebrow="Instrucciones" title="">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{tarea.instrucciones}</p>
      </Card>

      {entrega && (
        <Card eyebrow="Mi entrega" title="">
          <div className="text-sm space-y-2">
            <div className="text-xs text-gray-500">Enviada: {new Date(entrega.entregado_at).toLocaleString('es-MX')}</div>
            {entrega.comentario && <p className="bg-gray-50 border rounded p-2 text-gray-700">{entrega.comentario}</p>}
            {signedUrl && (
              <a href={signedUrl} target="_blank" className="inline-block text-verde-oscuro font-semibold underline">
                📎 {entrega.archivo_nombre}
              </a>
            )}
            {calificada && (
              <div className="bg-verde-claro/30 border border-verde rounded-lg p-3">
                <div className="text-xs uppercase tracking-wider text-verde-oscuro font-semibold">Calificación</div>
                <div className="text-3xl font-bold text-verde-oscuro tabular-nums">{entrega.calificacion}</div>
                {entrega.retroalimentacion && <p className="text-sm text-gray-700 mt-2 italic">"{entrega.retroalimentacion}"</p>}
              </div>
            )}
          </div>
        </Card>
      )}

      {!calificada && !cerrada && (
        <Card eyebrow={entrega ? 'Reenviar' : 'Enviar entrega'} title="">
          <EntregarTareaForm tareaId={tarea.id} permiteArchivos={tarea.permite_archivos} />
        </Card>
      )}

      {cerrada && !entrega && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
          ⚠️ La tarea cerró el {vence.toLocaleString('es-MX')} y no acepta entregas tardías.
        </div>
      )}
    </div>
  );
}
