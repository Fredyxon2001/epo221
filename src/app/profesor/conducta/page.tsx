// Profesor: crear reporte de conducta de un alumno de sus grupos.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { NuevoReporteForm } from './NuevoReporteForm';

export default async function ConductaProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Alumnos de sus grupos (asignados + orientados)
  const { data: asigs } = await supabase.from('asignaciones')
    .select('grupo_id').eq('profesor_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');
  const { data: orient } = await supabase.from('grupos')
    .select('id').eq('orientador_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');
  const grupoIds = Array.from(new Set([
    ...(asigs ?? []).map((a: any) => a.grupo_id),
    ...(orient ?? []).map((g: any) => g.id),
  ]));

  const { data: inscripciones } = grupoIds.length
    ? await supabase.from('inscripciones')
        .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)')
        .in('grupo_id', grupoIds).eq('ciclo_id', ciclo?.id ?? '')
    : { data: [] as any[] };
  const alumnosMap = new Map<string, any>();
  for (const i of inscripciones ?? []) {
    const a: any = (i as any).alumno;
    if (a?.id) alumnosMap.set(a.id, a);
  }
  const alumnos = Array.from(alumnosMap.values())
    .sort((a, b) => `${a.apellido_paterno} ${a.nombre}`.localeCompare(`${b.apellido_paterno} ${b.nombre}`));

  // Mis reportes recientes
  const { data: mios } = await supabase.from('reportes_conducta')
    .select('id, tipo, categoria, descripcion, fecha, estado, alumno:alumnos(nombre, apellido_paterno)')
    .eq('profesor_id', prof?.id ?? '')
    .order('created_at', { ascending: false }).limit(20);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Disciplina"
        title="📣 Reporte de conducta"
        description="Envía un reporte (positivo o negativo) al orientador del grupo del alumno."
        actions={<Link href="/profesor/conducta/bandeja" className="text-sm text-verde font-semibold hover:underline">Bandeja orientador →</Link>}
      />

      <Card eyebrow="Nuevo" title="Crear reporte">
        <NuevoReporteForm alumnos={alumnos} />
      </Card>

      <Card eyebrow="Historial" title={`Mis últimos reportes (${(mios ?? []).length})`}>
        {(mios ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Aún no has enviado reportes.</p>
        ) : (
          <div className="space-y-2">
            {(mios ?? []).map((r: any) => (
              <div key={r.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${r.tipo === 'positivo' ? 'bg-verde-claro/30 text-verde-oscuro' : 'bg-rose-100 text-rose-700'}`}>
                    {r.tipo === 'positivo' ? '⭐ Positivo' : '⚠️ Negativo'}
                  </span>
                  <span className="text-gray-500">{r.categoria}</span>
                  <span className="text-gray-400 ml-auto">{r.fecha} · {r.estado}</span>
                </div>
                <div className="font-semibold">{r.alumno?.apellido_paterno} {r.alumno?.nombre}</div>
                <div className="text-gray-700 text-xs mt-1 line-clamp-2">{r.descripcion}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
