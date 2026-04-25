// Selector de profesor para iniciar un hilo de mensajes.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';

export default async function NuevoHiloAlumno() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Grupo activo
  const { data: ins } = await supabase
    .from('inscripciones')
    .select('grupo:grupos(id, orientador_id)')
    .eq('alumno_id', alumno.id)
    .eq('ciclo_id', ciclo?.id ?? '')
    .maybeSingle();

  const grupo: any = ins?.grupo;
  if (!grupo) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Mensajes" title="Nueva conversación" />
        <Card><EmptyState icon="🏫" title="Sin grupo activo" description="No estás inscrito este ciclo." /></Card>
      </div>
    );
  }

  // Profesores asignados a tu grupo + orientador
  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('profesor:profesores(id, nombre, apellido_paterno, apellido_materno, email), materia:materias(nombre)')
    .eq('grupo_id', grupo.id).eq('ciclo_id', ciclo!.id);

  const orientadorId = grupo.orientador_id as string | null;
  const { data: orientador } = orientadorId
    ? await supabase.from('profesores').select('id, nombre, apellido_paterno, apellido_materno, email').eq('id', orientadorId).maybeSingle()
    : { data: null as any };

  const mapa = new Map<string, { id: string; nombre: string; email?: string; materias: string[]; esOrientador: boolean }>();
  for (const a of asigs ?? []) {
    const p: any = (a as any).profesor;
    if (!p?.id) continue;
    const existing = mapa.get(p.id);
    if (existing) existing.materias.push((a as any).materia?.nombre ?? '');
    else mapa.set(p.id, {
      id: p.id,
      nombre: `${p.apellido_paterno} ${p.apellido_materno ?? ''} ${p.nombre}`.trim(),
      email: p.email ?? undefined,
      materias: [(a as any).materia?.nombre ?? ''],
      esOrientador: false,
    });
  }
  if (orientador) {
    const existing = mapa.get(orientador.id);
    if (existing) existing.esOrientador = true;
    else mapa.set(orientador.id, {
      id: orientador.id,
      nombre: `${orientador.apellido_paterno} ${orientador.apellido_materno ?? ''} ${orientador.nombre}`.trim(),
      email: orientador.email ?? undefined,
      materias: [],
      esOrientador: true,
    });
  }

  const lista = Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Mensajes"
        title="Nueva conversación"
        description="Elige al docente con quien quieres comunicarte."
        actions={<Link href="/alumno/mensajes" className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />
      <Card>
        {lista.length === 0 ? (
          <EmptyState icon="👩‍🏫" title="Sin docentes disponibles" />
        ) : (
          <div className="space-y-2">
            {lista.map((p) => (
              <Link
                key={p.id}
                href={`/alumno/mensajes/${p.id}`}
                className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-verde hover:shadow transition"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-dorado to-dorado-claro text-verde-oscuro flex items-center justify-center font-bold shadow">
                  {p.nombre.split(' ').slice(0, 2).map(s => s[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    Prof. {p.nombre}
                    {p.esOrientador && <span className="text-[10px] bg-dorado/30 text-verde-oscuro px-2 py-0.5 rounded-full font-bold">🧭 Orientador</span>}
                  </div>
                  {p.materias.filter(Boolean).length > 0 && (
                    <div className="text-[11px] text-gray-500 truncate">{p.materias.filter(Boolean).join(' · ')}</div>
                  )}
                  {p.email && <div className="text-[10px] text-gray-400">{p.email}</div>}
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
