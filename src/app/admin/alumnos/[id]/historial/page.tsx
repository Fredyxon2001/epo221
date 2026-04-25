// Timeline de movimientos del alumno: inscripciones, cambios de grupo, promociones, bajas.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { codigoGrupoDesdeSemestre } from '@/lib/grupos';
import Link from 'next/link';

const estatusMeta: Record<string, { label: string; icon: string; tone: any }> = {
  activa:        { label: 'Inscripción activa',    icon: '✅', tone: 'verde' },
  promovido:     { label: 'Promovido',             icon: '⬆️', tone: 'azul' },
  cambio_grupo:  { label: 'Cambio de grupo',       icon: '↔️', tone: 'ambar' },
  baja:          { label: 'Baja definitiva',       icon: '⛔', tone: 'rosa' },
  baja_temporal: { label: 'Baja temporal',         icon: '⏸️', tone: 'ambar' },
  egresado:      { label: 'Egresado',              icon: '🎓', tone: 'dorado' },
};

export default async function HistorialAlumno({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: alumno } = await supabase
    .from('alumnos')
    .select('id, curp, matricula, nombre, apellido_paterno, apellido_materno, generacion, estatus')
    .eq('id', params.id).single();

  if (!alumno) {
    return <EmptyState icon="🔍" title="Alumno no encontrado" />;
  }

  const { data: insc } = await supabase
    .from('inscripciones')
    .select(`
      id, estatus, fecha_inscripcion,
      grupo:grupos(id, semestre, grupo, grado, turno),
      ciclo:ciclos_escolares(id, codigo, periodo)
    `)
    .eq('alumno_id', params.id)
    .order('fecha_inscripcion', { ascending: false });

  // Detectar repetidores: mismo semestre aparece más de una vez en la historia
  const semestres = (insc ?? []).map((i: any) => i.grupo?.semestre).filter(Boolean);
  const repetidos = semestres.filter((s, i) => semestres.indexOf(s) !== i);
  const esRepetidor = repetidos.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trayectoria"
        title={`${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''} ${alumno.nombre}`}
        description={`Matrícula ${alumno.matricula ?? '—'} · CURP ${alumno.curp} · Generación ${alumno.generacion ?? '—'}`}
        actions={
          <>
            {esRepetidor && <Badge tone="rosa">Repetidor</Badge>}
            <Badge tone={alumno.estatus === 'activo' ? 'verde' : 'gray'}>{alumno.estatus}</Badge>
            <Link href="/admin/alumnos" className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>
          </>
        }
      />

      <Card eyebrow="Timeline" title="Movimientos académicos">
        {(insc ?? []).length === 0 ? (
          <EmptyState icon="📭" title="Sin movimientos" description="Este alumno aún no tiene inscripciones registradas." />
        ) : (
          <ol className="relative border-l-2 border-verde/20 ml-3 space-y-6 pt-2">
            {(insc ?? []).map((i: any) => {
              const m = estatusMeta[i.estatus] ?? { label: i.estatus, icon: '•', tone: 'gray' };
              const codigo = i.grupo ? codigoGrupoDesdeSemestre(i.grupo.semestre, i.grupo.grupo) : '—';
              return (
                <li key={i.id} className="ml-6">
                  <span className="absolute -left-4 flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-verde text-lg shadow">
                    {m.icon}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={m.tone}>{m.label}</Badge>
                    <span className="text-sm text-gray-500">{new Date(i.fecha_inscripcion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="mt-1 text-sm text-verde-oscuro">
                    <span className="font-semibold">Grupo {codigo}</span>
                    {i.grupo && <> · {i.grupo.semestre}° semestre · {i.grupo.turno}</>}
                  </div>
                  {i.ciclo && (
                    <div className="text-xs text-gray-500 mt-0.5">Ciclo {i.ciclo.codigo} {i.ciclo.periodo}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
