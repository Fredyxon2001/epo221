import { requireIdentity } from "@/lib/security/access";
import { scopedClient } from '@/lib/security/resources';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';
import { PresentarExamen } from './PresentarExamen';
import { iniciarIntento } from '../actions';
import { createHash } from 'node:crypto';

export default async function PresentarExamenPage(props: { params: Promise<{ id: string }> }) {
  await requireIdentity(["alumno"]);

  const params = await props.params;
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const auth = (await createClient());
  const supabase = (await scopedClient());

  const { data: examen } = await supabase.from('examenes')
    .select('*, asignacion:asignaciones(materia:materias(nombre))')
    .eq('id', params.id).maybeSingle();
  if (!examen) return <div className="p-5">Examen no encontrado.</div>;

  // Iniciar o recuperar intento
  const res = await iniciarIntento(params.id);
  if (res.error) return <div className="p-5 text-rose-700">{res.error}</div>;

  const { data: preguntas } = await supabase.from('examen_preguntas')
    .select('id, tipo, enunciado, puntos, opciones, orden').eq('examen_id', params.id).order('orden');

  // El orden se conserva al recargar el mismo intento.
  let preguntasFinal = preguntas ?? [];
  if (examen.aleatorizar) {
    const order = (id: string) => createHash('sha256').update(`${res.id}:${id}`).digest('hex');
    preguntasFinal = [...preguntasFinal].sort((a, b) => order(a.id).localeCompare(order(b.id)));
  }
  const { data: attempt, error: attemptError } = await supabase.from('examen_intentos')
    .select('inicio').eq('id', res.id!).single();
  if (attemptError || !attempt?.inicio) return <div role="alert">No se pudo recuperar el tiempo del intento.</div>;
  const deadline = Math.min(Date.parse(examen.fecha_cierre), Date.parse(attempt.inicio) + Number(examen.duracion_min ?? 60) * 60_000);
  const remainingSeconds = Math.max(0, Math.floor((deadline - Date.now()) / 1000));

  const { data: respuestas } = await supabase.from('examen_respuestas')
    .select('pregunta_id, respuesta').eq('intento_id', res.id!);
  const respMap: Record<string, string> = {};
  for (const r of respuestas ?? []) respMap[(r as any).pregunta_id] = (r as any).respuesta ?? '';

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow={(examen as any).asignacion?.materia?.nombre ?? ''}
        title={examen.titulo}
        description={`${examen.duracion_min} min · ${preguntasFinal.length} preguntas · Cierra ${new Date(examen.fecha_cierre).toLocaleString('es-MX')}`}
      />

      {examen.instrucciones && (
        <Card eyebrow="Instrucciones" title="">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{examen.instrucciones}</p>
        </Card>
      )}

      <PresentarExamen
        intentoId={res.id!}
        preguntas={preguntasFinal}
        respuestasIniciales={respMap}
        remainingSeconds={remainingSeconds}
      />
    </div>
  );
}
