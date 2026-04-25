import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function ExamenesProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { data: asigs } = await supabase.from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('profesor_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');
  const asigIds = (asigs ?? []).map((a: any) => a.id);
  const asigMap = new Map((asigs ?? []).map((a: any) => [a.id, a]));

  const { data: examenes } = asigIds.length
    ? await supabase.from('examenes').select('*').in('asignacion_id', asigIds).order('fecha_cierre', { ascending: false })
    : { data: [] as any[] };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Evaluación digital"
        title="🧪 Exámenes en línea"
        description="Crea exámenes de opción múltiple, V/F y abiertas. Los alumnos los contestan en el navegador."
        actions={
          <Link href="/profesor/examenes/nuevo" className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30">
            + Nuevo examen
          </Link>
        }
      />

      <Card>
        {(examenes ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Aún no has creado exámenes.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {examenes!.map((e: any) => {
              const a: any = asigMap.get(e.asignacion_id);
              const cerrado = new Date(e.fecha_cierre) < new Date();
              return (
                <Link key={e.id} href={`/profesor/examenes/${e.id}`} className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 rounded">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{e.titulo}</div>
                    <div className="text-xs text-gray-500">
                      {a?.materia?.nombre} · {a?.grupo?.semestre}° {a?.grupo?.grupo} · P{e.parcial ?? '—'} · {e.duracion_min} min
                    </div>
                    <div className={`text-xs mt-0.5 ${cerrado ? 'text-gray-400' : 'text-verde-oscuro'}`}>
                      {cerrado ? 'Cerrado' : 'Activo'} hasta {new Date(e.fecha_cierre).toLocaleString('es-MX')}
                    </div>
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
