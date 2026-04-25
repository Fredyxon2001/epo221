// Selector de alumno para iniciar un hilo (sólo alumnos de grupos del profesor).
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import { codigoGrupoDesdeSemestre } from '@/lib/grupos';

export default async function NuevoHiloProfesor({ searchParams }: { searchParams: { grupo?: string; q?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  if (!profesor) return null;

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Grupos donde enseña + grupos que orienta
  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('grupo:grupos(id, grado, semestre, grupo, turno)')
    .eq('profesor_id', profesor.id).eq('ciclo_id', ciclo?.id ?? '');
  const { data: orientados } = await supabase
    .from('grupos').select('id, grado, semestre, grupo, turno').eq('orientador_id', profesor.id).eq('ciclo_id', ciclo?.id ?? '');

  const gruposMap = new Map<string, any>();
  for (const a of asigs ?? []) { const g: any = (a as any).grupo; if (g?.id) gruposMap.set(g.id, g); }
  for (const g of orientados ?? []) gruposMap.set(g.id, g);
  const grupos = Array.from(gruposMap.values()).sort((a, b) => (a.semestre - b.semestre) || a.grupo.localeCompare(b.grupo));

  const grupoSel = searchParams.grupo ?? grupos[0]?.id ?? '';
  const q = (searchParams.q ?? '').trim().toLowerCase();

  const { data: inscripciones } = grupoSel
    ? await supabase
        .from('inscripciones')
        .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)')
        .eq('grupo_id', grupoSel).eq('ciclo_id', ciclo!.id)
    : { data: [] as any[] };

  let alumnos = (inscripciones ?? []).map((i: any) => i.alumno).filter(Boolean) as any[];
  if (q) {
    alumnos = alumnos.filter((a) =>
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.matricula ?? ''}`.toLowerCase().includes(q)
    );
  }
  alumnos.sort((a, b) => `${a.apellido_paterno} ${a.nombre}`.localeCompare(`${b.apellido_paterno} ${b.nombre}`));

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Mensajes"
        title="Nueva conversación"
        description="Elige un alumno de tus grupos."
        actions={<Link href="/profesor/mensajes" className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />

      <Card>
        <form className="flex flex-wrap gap-3 items-end text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Grupo</label>
            <select name="grupo" defaultValue={grupoSel} className="border rounded px-2 py-1">
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {codigoGrupoDesdeSemestre(g.semestre, g.grupo)} · {g.semestre}° · {g.turno}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">Buscar alumno</label>
            <input name="q" defaultValue={q} placeholder="Nombre o matrícula…" className="w-full border rounded px-2 py-1" />
          </div>
          <button className="bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio">Filtrar</button>
        </form>
      </Card>

      <Card>
        {alumnos.length === 0 ? (
          <EmptyState icon="🎓" title="Sin alumnos" description="No hay inscritos que coincidan." />
        ) : (
          <div className="space-y-1">
            {alumnos.map((a: any) => (
              <Link
                key={a.id}
                href={`/profesor/mensajes/${a.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-verde hover:shadow transition"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-verde to-verde-medio text-white flex items-center justify-center font-bold shadow">
                  {a.nombre?.[0]}{a.apellido_paterno?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{a.apellido_paterno} {a.apellido_materno ?? ''} {a.nombre}</div>
                  <div className="text-[11px] text-gray-500 font-mono">{a.matricula ?? '—'}</div>
                </div>
                <div className="text-verde">→</div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
