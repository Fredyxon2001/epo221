// Grupos donde el profesor es ORIENTADOR (tutor). Puede ver panorama
// completo: alumnos, asistencia acumulada, riesgo, observaciones.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, StatCard, Badge, EmptyState } from '@/components/privado/ui';
import { codigoGrupo } from '@/lib/grupos';
import Link from 'next/link';

export default async function Orientacion() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  if (!profesor?.id) {
    return <EmptyState icon="🔍" title="Sin perfil docente" description="Pide a control escolar vincular tu cuenta." />;
  }

  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, grado, semestre, grupo, turno, ciclo:ciclos_escolares(codigo, periodo, activo)')
    .eq('orientador_id', profesor.id);

  const activos = ((grupos ?? []) as any[]).filter((g) => g.ciclo?.activo);

  // Por cada grupo: alumnos activos, con materias reprobadas, faltas totales
  const datos = await Promise.all(
    activos.map(async (g) => {
      const { data: insc } = await supabase
        .from('inscripciones')
        .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)')
        .eq('grupo_id', g.id).eq('estatus', 'activa');
      const alumnos = ((insc ?? []) as any[]).map((i) => i.alumno).filter(Boolean);
      const ids = alumnos.map((a) => a.id);

      let riesgo = new Set<string>();
      let faltasTotales = 0;
      let promedioAcum = 0;
      let promedioCount = 0;

      if (ids.length) {
        const { data: califs } = await supabase
          .from('calificaciones')
          .select('alumno_id, promedio_final, faltas_p1, faltas_p2, faltas_p3')
          .in('alumno_id', ids);
        for (const c of califs ?? []) {
          const pf = Number(c.promedio_final ?? 0);
          if (pf > 0) {
            promedioAcum += pf; promedioCount++;
            if (pf < 7) riesgo.add(c.alumno_id);
          }
          faltasTotales += (c.faltas_p1 ?? 0) + (c.faltas_p2 ?? 0) + (c.faltas_p3 ?? 0);
        }
      }

      return {
        ...g,
        alumnos,
        promedio: promedioCount ? promedioAcum / promedioCount : 0,
        riesgo: riesgo.size,
        faltasTotales,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tutoría"
        title="🎓 Mis grupos orientados"
        description="Grupos donde eres orientador (tutor). Aquí tienes la vista panorámica: alumnos, riesgo académico y asistencia."
      />

      {datos.length === 0 ? (
        <Card>
          <EmptyState
            icon="👨‍🏫"
            title="Aún no tienes grupos asignados"
            description="Cuando el administrador te asigne como orientador, aparecerán aquí."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Grupos" value={datos.length} icon="🏫" tone="verde" />
            <StatCard label="Alumnos" value={datos.reduce((s, g) => s + g.alumnos.length, 0)} icon="🎓" tone="azul" />
            <StatCard label="En riesgo" value={datos.reduce((s, g) => s + g.riesgo, 0)} icon="⚠️" tone="rosa" />
            <StatCard label="Faltas acum." value={datos.reduce((s, g) => s + g.faltasTotales, 0)} icon="📅" tone="dorado" />
          </div>

          {datos.map((g: any) => (
            <Card
              key={g.id}
              eyebrow={`Grupo ${codigoGrupo(g.grado, g.grupo)}`}
              title={`${g.semestre}° semestre · ${g.turno}`}
              action={<Badge tone="dorado">{g.alumnos.length} alumnos</Badge>}
            >
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Promedio grupo</div>
                  <div className={`font-serif text-2xl ${g.promedio >= 8 ? 'text-verde' : g.promedio >= 7 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {g.promedio > 0 ? g.promedio.toFixed(2) : '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">En riesgo</div>
                  <div className="font-serif text-2xl text-rose-600">{g.riesgo}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Faltas totales</div>
                  <div className="font-serif text-2xl text-amber-700">{g.faltasTotales}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.alumnos.map((a: any) => (
                  <Link
                    key={a.id}
                    href={`/profesor/mensajes/${a.id}`}
                    className="block border border-gray-200 rounded-lg px-3 py-2 bg-white/70 hover:border-verde hover:shadow transition"
                  >
                    <div className="font-medium text-sm truncate">{a.apellido_paterno} {a.apellido_materno ?? ''} {a.nombre}</div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-2">
                      <span>{a.matricula ?? '—'}</span>
                      <span className="text-verde">💬 Mensaje</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
