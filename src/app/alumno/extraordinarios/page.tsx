import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';
import { SolicitarExtraordinarioForm } from './SolicitarExtraordinarioForm';

const ESTADOS: Record<string, { label: string; color: string }> = {
  solicitado: { label: 'Solicitado', color: 'bg-gray-100 text-gray-700' },
  pago_pendiente: { label: 'Pago pendiente', color: 'bg-dorado/20 text-amber-800' },
  pagado: { label: 'Pagado', color: 'bg-sky-100 text-sky-700' },
  agendado: { label: 'Agendado', color: 'bg-indigo-100 text-indigo-700' },
  aplicado: { label: 'Aplicado', color: 'bg-violet-100 text-violet-700' },
  calificado: { label: 'Calificado', color: 'bg-verde-claro/40 text-verde-oscuro' },
  rechazado: { label: 'Rechazado', color: 'bg-rose-100 text-rose-700' },
};

export default async function ExtraordinariosAlumno() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();

  // Materias reprobadas — del historial académico
  const { data: historial } = await supabase.from('vista_historial_academico')
    .select('*').eq('alumno_id', alumno.id);
  const reprobadas = (historial ?? []).filter((h: any) => h.promedio_final != null && h.promedio_final < 6);

  // Asignaciones asociadas (para select) — buscar por materia+grupo actual
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();
  const { data: insc } = await supabase.from('inscripciones').select('grupo_id').eq('alumno_id', alumno.id);
  const gids = (insc ?? []).map((i: any) => i.grupo_id);
  const { data: asigs } = gids.length
    ? await supabase.from('asignaciones').select('id, materia:materias(id, nombre)').in('grupo_id', gids).eq('ciclo_id', ciclo?.id ?? '')
    : { data: [] as any[] };

  const { data: solicitudes } = await supabase.from('examenes_extraordinarios')
    .select('*, asignacion:asignaciones(materia:materias(nombre))')
    .eq('alumno_id', alumno.id).order('created_at', { ascending: false });

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        eyebrow="Exámenes extraordinarios y de recuperación"
        title="📘 Mis extraordinarios"
        description="Solicita recuperación o extraordinarios para regularizar tus materias."
      />

      {reprobadas.length > 0 && (
        <Card eyebrow="Materias reprobadas" title="Sugerencias">
          <div className="flex flex-wrap gap-2">
            {reprobadas.map((r: any, i: number) => (
              <span key={i} className="text-xs bg-rose-50 border border-rose-200 text-rose-700 px-2 py-1 rounded-full">
                {r.materia} · {r.promedio_final}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card eyebrow="Nueva" title="Solicitar examen">
        <SolicitarExtraordinarioForm asignaciones={asigs ?? []} />
      </Card>

      <Card eyebrow={`Historial (${solicitudes?.length ?? 0})`} title="Mis solicitudes">
        {(solicitudes ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Aún no tienes solicitudes.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {solicitudes!.map((s: any) => {
              const e = ESTADOS[s.estado] ?? ESTADOS.solicitado;
              return (
                <div key={s.id} className="py-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{s.asignacion?.materia?.nombre ?? '—'} · {s.tipo}</div>
                      <div className="text-xs text-gray-500">Solicitado: {new Date(s.created_at).toLocaleDateString('es-MX')}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${e.color}`}>{e.label}</span>
                  </div>
                  {s.motivo && <p className="text-xs text-gray-700 mt-1 italic">"{s.motivo}"</p>}
                  {s.referencia_pago && <div className="text-xs mt-1"><strong>Ref. pago:</strong> {s.referencia_pago} {s.monto && `· $${s.monto}`}</div>}
                  {s.fecha_examen && <div className="text-xs mt-1"><strong>Fecha examen:</strong> {new Date(s.fecha_examen).toLocaleString('es-MX')}</div>}
                  {s.calificacion != null && (
                    <div className="text-xs mt-1"><strong>Calificación:</strong> <span className="text-verde-oscuro font-bold">{s.calificacion}</span></div>
                  )}
                  {s.observaciones && <div className="text-xs text-gray-700 mt-1 bg-gray-50 p-2 rounded">{s.observaciones}</div>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
