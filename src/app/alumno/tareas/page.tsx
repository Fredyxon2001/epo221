import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function TareasAlumno() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Grupos donde está inscrito
  const { data: insc } = await supabase.from('inscripciones')
    .select('grupo_id').eq('alumno_id', alumno.id);
  const gruposIds = (insc ?? []).map((i: any) => i.grupo_id);

  // Asignaciones de esos grupos en el ciclo activo
  const { data: asigs } = gruposIds.length
    ? await supabase.from('asignaciones').select('id, materia:materias(nombre)').in('grupo_id', gruposIds).eq('ciclo_id', ciclo?.id ?? '')
    : { data: [] as any[] };
  const asigIds = (asigs ?? []).map((a: any) => a.id);
  const asigMap = new Map((asigs ?? []).map((a: any) => [a.id, a]));

  const { data: tareas } = asigIds.length
    ? await supabase.from('tareas').select('id, titulo, fecha_entrega, puntos, asignacion_id')
        .in('asignacion_id', asigIds).order('fecha_entrega', { ascending: true })
    : { data: [] as any[] };

  const { data: entregas } = tareas?.length
    ? await supabase.from('entregas_tarea').select('tarea_id, entregado_at, calificacion')
        .eq('alumno_id', alumno.id).in('tarea_id', tareas.map((t: any) => t.id))
    : { data: [] as any[] };
  const entMap = new Map((entregas ?? []).map((e: any) => [e.tarea_id, e]));

  const pendientes: any[] = [];
  const entregadas: any[] = [];
  const calificadas: any[] = [];
  for (const t of tareas ?? []) {
    const e = entMap.get(t.id);
    if (e?.calificacion != null) calificadas.push({ t, e });
    else if (e) entregadas.push({ t, e });
    else pendientes.push({ t, e });
  }

  const renderItem = ({ t, e }: any) => {
    const vence = new Date(t.fecha_entrega);
    const vencida = vence < new Date() && !e;
    const a: any = asigMap.get(t.asignacion_id);
    return (
      <Link key={t.id} href={`/alumno/tareas/${t.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded-lg">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{t.titulo}</div>
          <div className="text-xs text-gray-500">{a?.materia?.nombre ?? '—'} · {t.puntos} pts</div>
          <div className={`text-xs mt-0.5 ${vencida ? 'text-rose-600' : 'text-gray-600'}`}>
            {vencida ? '⚠️ Vencida' : 'Entrega'}: {vence.toLocaleString('es-MX')}
          </div>
        </div>
        <div className="text-right">
          {e?.calificacion != null ? (
            <div className="text-xl font-bold text-verde-oscuro tabular-nums">{e.calificacion}</div>
          ) : e ? (
            <span className="text-xs text-dorado font-semibold">Entregada</span>
          ) : (
            <span className="text-xs text-rose-600 font-semibold">Pendiente</span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Evaluación" title="📝 Mis tareas" description="Entrega tus tareas en línea y consulta retroalimentación." />

      <Card eyebrow={`Pendientes (${pendientes.length})`} title="Por entregar">
        {pendientes.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">¡Al día! No tienes pendientes.</p>
          : <div className="divide-y divide-gray-100">{pendientes.map(renderItem)}</div>}
      </Card>

      <Card eyebrow={`Entregadas (${entregadas.length})`} title="Esperando calificación">
        {entregadas.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">—</p>
          : <div className="divide-y divide-gray-100">{entregadas.map(renderItem)}</div>}
      </Card>

      <Card eyebrow={`Calificadas (${calificadas.length})`} title="Tareas evaluadas">
        {calificadas.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">—</p>
          : <div className="divide-y divide-gray-100">{calificadas.map(renderItem)}</div>}
      </Card>
    </div>
  );
}
