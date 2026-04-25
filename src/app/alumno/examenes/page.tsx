import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function ExamenesAlumno() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { data: insc } = await supabase.from('inscripciones').select('grupo_id').eq('alumno_id', alumno.id);
  const gids = (insc ?? []).map((i: any) => i.grupo_id);
  const { data: asigs } = gids.length
    ? await supabase.from('asignaciones').select('id, materia:materias(nombre)').in('grupo_id', gids).eq('ciclo_id', ciclo?.id ?? '')
    : { data: [] as any[] };
  const asigMap = new Map((asigs ?? []).map((a: any) => [a.id, a]));
  const asigIds = (asigs ?? []).map((a: any) => a.id);

  const { data: examenes } = asigIds.length
    ? await supabase.from('examenes').select('*').in('asignacion_id', asigIds).order('fecha_cierre', { ascending: true })
    : { data: [] as any[] };

  const { data: intentos } = examenes?.length
    ? await supabase.from('examen_intentos').select('examen_id, estado, calificacion, numero')
        .eq('alumno_id', alumno.id).in('examen_id', examenes.map((e: any) => e.id))
    : { data: [] as any[] };
  const intMap = new Map<string, any[]>();
  for (const it of intentos ?? []) {
    const arr = intMap.get((it as any).examen_id) ?? [];
    arr.push(it); intMap.set((it as any).examen_id, arr);
  }

  const ahora = new Date();

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Evaluación" title="🧪 Exámenes en línea" description="Presenta tus exámenes directamente en el navegador." />

      <Card>
        {(examenes ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No hay exámenes programados.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {examenes!.map((e: any) => {
              const abierto = new Date(e.fecha_apertura) <= ahora && new Date(e.fecha_cierre) >= ahora;
              const its = intMap.get(e.id) ?? [];
              const ultimo = its[0];
              const a = asigMap.get(e.asignacion_id) as any;
              return (
                <div key={e.id} className="py-3 flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{e.titulo}</div>
                    <div className="text-xs text-gray-500">{a?.materia?.nombre ?? '—'} · {e.duracion_min} min · P{e.parcial ?? '—'}</div>
                    <div className="text-xs text-gray-600 mt-0.5">Cierra: {new Date(e.fecha_cierre).toLocaleString('es-MX')}</div>
                  </div>
                  <div className="text-right">
                    {ultimo?.estado === 'calificado' && (
                      <div className="text-2xl font-bold text-verde-oscuro tabular-nums">{ultimo.calificacion}</div>
                    )}
                    {ultimo?.estado === 'enviado' && <span className="text-xs text-dorado font-semibold">En revisión</span>}
                    {abierto && (!ultimo || ultimo.estado === 'en_curso') && (
                      <Link href={`/alumno/examenes/${e.id}`} className="inline-block bg-verde hover:bg-verde-oscuro text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
                        {ultimo?.estado === 'en_curso' ? 'Continuar' : 'Presentar'}
                      </Link>
                    )}
                    {!abierto && !ultimo && (
                      <span className="text-xs text-gray-400">
                        {new Date(e.fecha_apertura) > ahora ? 'Próximo' : 'Cerrado'}
                      </span>
                    )}
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
