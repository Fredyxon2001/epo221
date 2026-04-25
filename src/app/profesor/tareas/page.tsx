import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function TareasProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { data: asigs } = await supabase.from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('profesor_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');
  const asigIds = (asigs ?? []).map((a: any) => a.id);

  const { data: tareas } = asigIds.length
    ? await supabase.from('tareas').select('id, titulo, fecha_entrega, parcial, puntos, asignacion_id, created_at')
        .in('asignacion_id', asigIds).order('fecha_entrega', { ascending: false })
    : { data: [] as any[] };

  // Contadores de entregas por tarea
  const tareaIds = (tareas ?? []).map((t: any) => t.id);
  const counts: Record<string, { total: number; calif: number }> = {};
  if (tareaIds.length) {
    const { data: entregas } = await supabase.from('entregas_tarea')
      .select('tarea_id, calificacion').in('tarea_id', tareaIds);
    for (const e of entregas ?? []) {
      const k = (e as any).tarea_id;
      counts[k] ??= { total: 0, calif: 0 };
      counts[k].total++;
      if ((e as any).calificacion != null) counts[k].calif++;
    }
  }

  const asigMap = new Map((asigs ?? []).map((a: any) => [a.id, a]));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Evaluación en línea"
        title="📝 Tareas"
        description="Publica tareas, recibe entregas digitales y califícalas con retroalimentación."
        actions={
          <Link href="/profesor/tareas/nueva" className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30">
            + Nueva tarea
          </Link>
        }
      />

      <Card>
        {(tareas ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Aún no has publicado tareas. Crea la primera con el botón superior.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(tareas ?? []).map((t: any) => {
              const a: any = asigMap.get(t.asignacion_id);
              const c = counts[t.id] ?? { total: 0, calif: 0 };
              const vence = new Date(t.fecha_entrega);
              const vencida = vence < new Date();
              return (
                <Link key={t.id} href={`/profesor/tareas/${t.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{t.titulo}</div>
                    <div className="text-xs text-gray-500">
                      {a?.materia?.nombre ?? '—'} · {a?.grupo?.semestre}° {a?.grupo?.grupo} {a?.grupo?.turno ?? ''} · P{t.parcial ?? '—'} · {t.puntos} pts
                    </div>
                    <div className={`text-xs mt-0.5 ${vencida ? 'text-rose-600' : 'text-gray-600'}`}>
                      {vencida ? 'Venció' : 'Entrega'}: {vence.toLocaleString('es-MX')}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-verde-oscuro">{c.calif}/{c.total}</div>
                    <div className="text-gray-500">calificadas</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
