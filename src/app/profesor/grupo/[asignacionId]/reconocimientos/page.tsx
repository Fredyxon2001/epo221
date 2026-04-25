// Reconocimientos y badges automáticos del grupo.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import { calcularBadges, tonoClases } from '@/lib/reconocimientos';
import Link from 'next/link';

export default async function ReconocimientosGrupo({ params }: { params: { asignacionId: string } }) {
  const supabase = createClient();

  const { data: asig } = await supabase
    .from('asignaciones')
    .select('id, grupo_id, ciclo_id, materia:materias(nombre), grupo:grupos(semestre, grupo, turno)')
    .eq('id', params.asignacionId).single();

  if (!asig) return <EmptyState icon="🔍" title="Asignación no encontrada" />;

  const { data: inscritos } = await supabase
    .from('inscripciones')
    .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno)')
    .eq('grupo_id', (asig as any).grupo_id)
    .eq('ciclo_id', (asig as any).ciclo_id)
    .eq('estatus', 'activa');

  const alumnos = ((inscritos ?? []) as any[]).map((i) => i.alumno).filter(Boolean);
  const ids = alumnos.map((a) => a.id);

  const { data: califs } = ids.length
    ? await supabase.from('calificaciones').select('*')
        .eq('asignacion_id', params.asignacionId).in('alumno_id', ids)
    : { data: [] as any[] };

  const badges = calcularBadges((califs ?? []) as any, alumnos);

  // Agrupar por alumno
  const porAlumno = new Map<string, typeof badges>();
  for (const b of badges) {
    if (!porAlumno.has(b.alumnoId)) porAlumno.set(b.alumnoId, []);
    porAlumno.get(b.alumnoId)!.push(b);
  }

  const m = asig as any;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reconocimientos"
        title={`🏆 ${m?.materia?.nombre}`}
        description={`${m?.grupo?.semestre}° semestre · ${m?.grupo?.turno} · Generados automáticamente del desempeño del grupo`}
        actions={<Link href={`/profesor/grupo/${params.asignacionId}`} className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />

      {badges.length === 0 ? (
        <Card><EmptyState icon="📭" title="Aún no hay reconocimientos" description="Se generan cuando empieces a capturar calificaciones." /></Card>
      ) : (
        <>
          <Card eyebrow="Galería" title="Podio de honor">
            <div className="grid md:grid-cols-3 gap-3">
              {badges.filter((b) => ['oro','plata','bronce'].includes(b.tono)).map((b, i) => (
                <div key={i} className={`rounded-2xl border-2 p-5 text-center ${tonoClases[b.tono]} shadow-lg`}>
                  <div className="text-5xl mb-2">{b.icono}</div>
                  <div className="font-serif text-base">{b.titulo}</div>
                  <div className="text-xs mt-1 opacity-90">{b.descripcion}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card eyebrow="Todos los reconocimientos" title={`${badges.length} badges otorgados`}>
            <div className="space-y-3">
              {Array.from(porAlumno.entries()).map(([alumnoId, list]) => {
                const a = alumnos.find((x) => x.id === alumnoId);
                return (
                  <div key={alumnoId} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white/70">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-verde-claro to-verde text-white flex items-center justify-center font-bold shadow">
                      {a?.nombre?.[0]}{a?.apellido_paterno?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{a?.apellido_paterno} {a?.apellido_materno ?? ''} {a?.nombre}</div>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {list.map((b, i) => (
                          <span key={i} className={`inline-flex items-center gap-1 rounded-full text-[10px] px-2 py-0.5 border font-semibold ${tonoClases[b.tono]}`}>
                            <span>{b.icono}</span> {b.titulo}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
