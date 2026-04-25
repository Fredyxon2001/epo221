// Generador de boletas masivas por grupo — lista los alumnos activos del grupo
// y abre los PDFs en lote (usa el endpoint /api/boleta/[alumnoId] ya existente).
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';
import { codigoGrupoDesdeSemestre } from '@/lib/grupos';
import Link from 'next/link';
import { BoletasLauncher } from './BoletasLauncher';

export default async function BoletasGrupo({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: grupo } = await supabase
    .from('grupos')
    .select('id, semestre, grupo, grado, turno, ciclo:ciclos_escolares(codigo, periodo)')
    .eq('id', params.id).single();

  if (!grupo) return <EmptyState icon="🔍" title="Grupo no encontrado" />;

  const { data: inscritos } = await supabase
    .from('inscripciones')
    .select('alumno:alumnos(id, matricula, curp, nombre, apellido_paterno, apellido_materno)')
    .eq('grupo_id', params.id).eq('estatus', 'activa');

  const alumnos = ((inscritos ?? []) as any[])
    .map((i) => i.alumno)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.apellido_paterno ?? '').localeCompare(b.apellido_paterno ?? ''));

  const codigo = codigoGrupoDesdeSemestre(grupo.semestre, grupo.grupo);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Grupo ${codigo}`}
        title="Boletas del grupo"
        description={`${grupo.semestre}° semestre · ${grupo.turno} · Ciclo ${(grupo as any).ciclo?.codigo ?? '—'}`}
        actions={<Link href="/admin/grupos" className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />

      <Card eyebrow="Alumnos" title={`${alumnos.length} inscritos activos`}>
        {alumnos.length === 0 ? (
          <EmptyState icon="📭" title="Sin alumnos" description="Este grupo no tiene alumnos inscritos activos." />
        ) : (
          <>
            <BoletasLauncher alumnos={alumnos.map((a: any) => ({ id: a.id, nombre: `${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.nombre}`.trim() }))} />
            <div className="mt-4 grid md:grid-cols-2 gap-2">
              {alumnos.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-white/70">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{a.apellido_paterno} {a.apellido_materno ?? ''} {a.nombre}</div>
                    <div className="text-[11px] text-gray-500">{a.matricula ?? '—'} · {a.curp}</div>
                  </div>
                  <a
                    href={`/api/boleta/${a.id}`}
                    target="_blank"
                    className="text-xs bg-verde text-white rounded px-2 py-1 hover:bg-verde-medio shrink-0"
                  >
                    PDF ↗
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
