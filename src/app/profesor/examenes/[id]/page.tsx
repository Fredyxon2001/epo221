import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { AgregarPreguntaForm } from './AgregarPreguntaForm';
import { EliminarPreguntaBtn } from './EliminarPreguntaBtn';
import { CalificarAbiertaForm } from './CalificarAbiertaForm';

export default async function ExamenDetalle({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  const { data: examen } = await supabase.from('examenes')
    .select('*, asignacion:asignaciones(profesor_id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo))')
    .eq('id', params.id).maybeSingle();
  if (!examen || (examen as any).asignacion?.profesor_id !== prof?.id) {
    return <div className="p-5">Examen no encontrado o sin permiso.</div>;
  }

  const { data: preguntas } = await supabase.from('examen_preguntas')
    .select('*').eq('examen_id', params.id).order('orden');

  const { data: intentos } = await supabase.from('examen_intentos')
    .select('*, alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)')
    .eq('examen_id', params.id).order('inicio', { ascending: false });

  const totalPuntos = (preguntas ?? []).reduce((s: number, p: any) => s + Number(p.puntos), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${(examen as any).asignacion.materia?.nombre} · ${(examen as any).asignacion.grupo?.semestre}° ${(examen as any).asignacion.grupo?.grupo}`}
        title={examen.titulo}
        description={`Cierra: ${new Date(examen.fecha_cierre).toLocaleString('es-MX')} · ${examen.duracion_min} min · ${preguntas?.length ?? 0} preguntas · ${totalPuntos} pts`}
        actions={<Link href="/profesor/examenes" className="text-xs text-verde font-semibold hover:underline">← Volver</Link>}
      />

      <Card eyebrow="Preguntas" title="">
        {(preguntas ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Aún no hay preguntas.</p>
        ) : (
          <ol className="space-y-3 list-decimal list-inside">
            {preguntas!.map((p: any, i: number) => (
              <li key={p.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold text-sm">{p.enunciado}</div>
                    <div className="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5">
                      {p.tipo} · {p.puntos} pts
                      {p.respuesta_correcta && ` · Correcta: ${p.respuesta_correcta}`}
                    </div>
                    {p.opciones && (
                      <ul className="mt-1 text-xs text-gray-600 space-y-0.5">
                        {(p.opciones as any[]).map((o) => (
                          <li key={o.clave}>
                            <strong>{o.clave}:</strong> {o.texto}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <EliminarPreguntaBtn id={p.id} examenId={examen.id} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card eyebrow="Agregar" title="Nueva pregunta">
        <AgregarPreguntaForm examenId={examen.id} ordenInicial={(preguntas?.length ?? 0) + 1} />
      </Card>

      <Card eyebrow={`Intentos (${intentos?.length ?? 0})`} title="Alumnos que han presentado">
        {(intentos ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Aún nadie ha presentado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {await Promise.all(intentos!.map(async (it: any) => {
              const { data: resp } = await supabase.from('examen_respuestas')
                .select('*, pregunta:examen_preguntas(enunciado, tipo, puntos, respuesta_correcta)')
                .eq('intento_id', it.id);
              const abiertas = (resp ?? []).filter((r: any) => r.pregunta?.tipo === 'abierta' && r.puntos_obtenidos == null);
              return (
                <div key={it.id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm">
                        {it.alumno?.apellido_paterno} {it.alumno?.nombre} · {it.alumno?.matricula ?? '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Inicio: {new Date(it.inicio).toLocaleString('es-MX')} · Estado: {it.estado}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-verde-oscuro tabular-nums">
                        {it.calificacion != null ? it.calificacion : '—'}
                      </div>
                    </div>
                  </div>
                  {abiertas.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-rose-700 font-semibold">⚠️ {abiertas.length} respuestas abiertas por calificar</div>
                      {abiertas.map((r: any) => (
                        <div key={r.id} className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                          <div className="font-semibold">{r.pregunta.enunciado}</div>
                          <div className="italic text-gray-700 my-1">"{r.respuesta ?? '(sin respuesta)'}"</div>
                          <CalificarAbiertaForm id={r.id} puntosMax={Number(r.pregunta.puntos)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }))}
          </div>
        )}
      </Card>
    </div>
  );
}
