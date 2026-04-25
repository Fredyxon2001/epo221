import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';
import { ResponderEvalForm } from './ResponderEvalForm';
import crypto from 'crypto';

export default async function AlumnoEvalDocente() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();
  const ahora = new Date().toISOString();

  // Periodos activos
  const { data: periodos } = await supabase.from('eval_docente_periodos')
    .select('*').eq('activa', true)
    .lte('abierta_desde', ahora).gte('abierta_hasta', ahora).order('created_at', { ascending: false });

  if (!periodos || periodos.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Retroalimentación" title="🧭 Evaluar a mis docentes" />
        <Card><p className="text-sm text-gray-500 py-8 text-center">No hay periodos abiertos en este momento.</p></Card>
      </div>
    );
  }

  // Asignaciones del alumno (una por docente)
  const { data: insc } = await supabase.from('inscripciones').select('grupo_id').eq('alumno_id', alumno.id);
  const gids = (insc ?? []).map((i: any) => i.grupo_id);
  const { data: asigs } = gids.length
    ? await supabase.from('asignaciones')
        .select('id, materia:materias(nombre), profesor:profesores(id, perfil:perfiles(nombre))')
        .in('grupo_id', gids)
    : { data: [] as any[] };

  // Ya respondidas
  const respondidas = new Set<string>();
  for (const p of periodos) {
    for (const a of asigs ?? []) {
      const hash = crypto.createHash('md5').update(`${alumno.id}::${(p as any).id}::${(a as any).id}`).digest('hex');
      const { data } = await supabase.from('eval_docente_respuestas')
        .select('id', { head: true, count: 'exact' })
        .eq('periodo_id', (p as any).id).eq('asignacion_id', (a as any).id).eq('alumno_hash', hash);
      // check count via a separate query
    }
  }
  // Más eficiente: traer todos los hashes de este alumno
  const hashMap = new Map<string, { periodo_id: string; asig_id: string }>();
  for (const p of periodos) {
    for (const a of asigs ?? []) {
      const hash = crypto.createHash('md5').update(`${alumno.id}::${(p as any).id}::${(a as any).id}`).digest('hex');
      hashMap.set(hash, { periodo_id: (p as any).id, asig_id: (a as any).id });
    }
  }
  const hashes = Array.from(hashMap.keys());
  if (hashes.length) {
    const { data: respEx } = await supabase.from('eval_docente_respuestas')
      .select('alumno_hash').in('alumno_hash', hashes);
    for (const r of respEx ?? []) respondidas.add((r as any).alumno_hash);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Retroalimentación anónima"
        title="🧭 Evaluar a mis docentes"
        description="Tus respuestas son anónimas. Los docentes y la dirección solo ven promedios agregados."
      />

      {periodos.map((p: any) => (
        <Card key={p.id} eyebrow={p.nombre} title={`Cierra el ${new Date(p.abierta_hasta).toLocaleString('es-MX')}`}>
          {p.instrucciones && <p className="text-sm text-gray-700 mb-3">{p.instrucciones}</p>}
          <div className="space-y-4">
            {(asigs ?? []).map((a: any) => {
              const hash = crypto.createHash('md5').update(`${alumno.id}::${p.id}::${a.id}`).digest('hex');
              const yaRespondido = respondidas.has(hash);
              return (
                <div key={a.id} className="border rounded-lg p-3">
                  <div className="font-semibold text-sm">
                    {a.materia?.nombre} · Prof. {a.profesor?.perfil?.nombre ?? '—'}
                  </div>
                  {yaRespondido ? (
                    <div className="text-xs text-verde-oscuro mt-2">✅ Ya respondiste esta evaluación.</div>
                  ) : (
                    <ResponderEvalForm periodo={p} asignacionId={a.id} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
