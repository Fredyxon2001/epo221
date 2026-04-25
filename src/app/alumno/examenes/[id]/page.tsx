import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';
import { PresentarExamen } from './PresentarExamen';
import { iniciarIntento } from '../actions';

export default async function PresentarExamenPage({ params }: { params: { id: string } }) {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();

  const { data: examen } = await supabase.from('examenes')
    .select('*, asignacion:asignaciones(materia:materias(nombre))')
    .eq('id', params.id).maybeSingle();
  if (!examen) return <div className="p-5">Examen no encontrado.</div>;

  // Iniciar o recuperar intento
  const res = await iniciarIntento(params.id);
  if (res.error) return <div className="p-5 text-rose-700">{res.error}</div>;

  const { data: preguntas } = await supabase.from('examen_preguntas')
    .select('id, tipo, enunciado, puntos, opciones, orden').eq('examen_id', params.id).order('orden');

  // Si aleatorizar, shuffle en servidor (determinista por intento: aquí random simple)
  let preguntasFinal = preguntas ?? [];
  if (examen.aleatorizar) {
    preguntasFinal = [...preguntasFinal].sort(() => Math.random() - 0.5);
  }

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
        duracionMin={examen.duracion_min}
      />
    </div>
  );
}
