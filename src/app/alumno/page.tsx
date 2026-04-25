// Dashboard premium del alumno
import Link from 'next/link';
import { getAlumnoActual, getEvaluacionGeneral, getPromediosPorSemestre, getPromediosAnuales, getHistorialAcademico } from '@/lib/queries';
import { createClient } from '@/lib/supabase/server';
import { StatCard, Card, PageHeader, Badge, EmptyState } from '@/components/privado/ui';
import { DataTable } from '@/components/privado/DataTable';
import { DashboardHero } from '@/components/privado/DashboardHero';

export default async function AlumnoDashboard() {
  const alumno = (await getAlumnoActual())!;
  const supabase = createClient();

  const [eval_, semestres, anuales, historial] = await Promise.all([
    getEvaluacionGeneral(alumno.id),
    getPromediosPorSemestre(alumno.id),
    getPromediosAnuales(alumno.id),
    getHistorialAcademico(alumno.id),
  ]);

  // Anuncios vigentes dirigidos a alumnos (globales + anclados a su grupo actual)
  const { data: insActiva } = await supabase
    .from('inscripciones').select('grupo_id, ciclo:ciclos_escolares(activo)')
    .eq('alumno_id', alumno.id).eq('estatus', 'activa');
  const miGrupoId = (insActiva ?? []).find((i: any) => i.ciclo?.activo)?.grupo_id ?? null;

  const { data: anunciosRaw } = await supabase
    .from('anuncios')
    .select('id, titulo, cuerpo, prioridad, icono, created_at, fijado, grupo_id, rol_objetivo')
    .eq('publicado', true)
    .in('audiencia', ['todos', 'alumnos'])
    .order('fijado', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);
  const anuncios = (anunciosRaw ?? []).filter((a: any) =>
    (!a.grupo_id || a.grupo_id === miGrupoId) &&
    (!a.rol_objetivo || a.rol_objetivo === 'alumno')
  ).slice(0, 4);

  // Últimas calificaciones registradas
  const ultimas = [...historial]
    .filter((m) => m.p1 != null || m.p2 != null || m.p3 != null)
    .slice(0, 5);

  const prom = eval_?.promedio_general ? Number(eval_.promedio_general) : null;
  const avance = eval_?.porcentaje_avance ? Number(eval_.porcentaje_avance) : 0;

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow="Portal alumno"
        title={`¡Hola, ${alumno.nombre.split(' ')[0]}!`}
        subtitle="Tu trayectoria académica en un solo lugar: promedios, boleta, avance y anuncios. Sigue brillando. 🌟"
        icon="🎓"
        chip={prom != null ? { label: prom >= 9 ? 'Excelencia' : prom >= 8 ? 'Muy bien' : prom >= 6 ? 'En marcha' : 'A reforzar', tone: prom >= 8 ? 'verde' : 'dorado' } : undefined}
        gradient="from-verde-oscuro via-verde to-verde-medio"
      >
        <Link
          href="/alumno/boleta"
          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          📄 Ver boleta
        </Link>
      </DashboardHero>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Promedio general"
          value={prom != null ? prom.toFixed(2) : '—'}
          hint={prom != null ? (prom >= 9 ? 'Excelencia' : prom >= 8 ? 'Muy bien' : prom >= 6 ? 'Adecuado' : 'Requiere atención') : 'Sin registros'}
          icon="📐"
          tone={prom != null && prom >= 8 ? 'verde' : prom != null && prom < 6 ? 'rosa' : 'dorado'}
        />
        <StatCard
          label="Avance"
          value={`${avance}%`}
          hint={`${eval_?.semestres_cursados ?? 0} de 6 semestres`}
          icon="🎯"
          tone="dorado"
        />
        <StatCard
          label="Materias aprobadas"
          value={`${eval_?.total_aprobadas ?? 0}/${eval_?.total_materias ?? 0}`}
          hint="Del total cursado"
          icon="✅"
          tone="verde"
        />
        <StatCard
          label="Reprobadas"
          value={`${eval_?.total_reprobadas ?? 0}`}
          hint={(eval_?.total_reprobadas ?? 0) > 0 ? 'Regulariza en Control Escolar' : 'Sin pendientes'}
          icon={(eval_?.total_reprobadas ?? 0) > 0 ? '⚠️' : '🌟'}
          tone={(eval_?.total_reprobadas ?? 0) > 0 ? 'rosa' : 'azul'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avance + por año */}
        <div className="lg:col-span-2 space-y-6">
          <Card eyebrow="Trayecto" title="Avance del bachillerato">
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-5xl font-serif text-verde-oscuro tabular-nums">{avance}%</div>
                <div className="text-xs text-gray-500">{eval_?.semestres_cursados ?? 0} de 6 semestres cursados</div>
              </div>
              <Badge tone={avance >= 80 ? 'verde' : avance >= 50 ? 'dorado' : 'gray'}>
                {avance >= 80 ? 'Recta final' : avance >= 50 ? 'A medio camino' : 'En inicio'}
              </Badge>
            </div>
            <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-verde-oscuro via-verde to-verde-claro transition-all duration-700"
                style={{ width: `${Math.max(2, avance)}%` }}
              />
              <div
                className="absolute top-0 h-full w-8 bg-white/40 blur-sm"
                style={{ left: `${Math.max(0, avance - 4)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] uppercase tracking-wider text-gray-400">
              <span>Ingreso</span><span>3° año</span><span>Egreso</span>
            </div>
          </Card>

          <Card eyebrow="Por año escolar" title="Rendimiento anual">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((anio) => {
                const a = anuales.find((x) => x.anio === anio);
                const prom = a?.promedio_anual ? Number(a.promedio_anual) : null;
                const tone = prom == null ? 'gray' : prom >= 8 ? 'verde' : prom >= 6 ? 'dorado' : 'rosa';
                return (
                  <div key={anio} className="relative p-4 rounded-xl bg-gradient-to-br from-white to-crema border border-gray-200 hover:border-verde/40 transition">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-verde font-semibold">
                      {anio === 1 ? 'Primer año' : anio === 2 ? 'Segundo año' : 'Tercer año'}
                    </div>
                    <div className="font-serif text-3xl text-verde-oscuro mt-2 tabular-nums">
                      {prom != null ? prom.toFixed(2) : '—'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {a ? `${a.materias_aprobadas}/${a.materias_cursadas} aprobadas` : 'No cursado'}
                    </div>
                    <div className="mt-3">
                      <Badge tone={tone as any} size="sm">
                        {prom == null ? 'Pendiente' : prom >= 8 ? 'Sobresaliente' : prom >= 6 ? 'Aprobado' : 'Reprobado'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            eyebrow="Último movimiento"
            title="Calificaciones recientes"
            action={
              <Link href="/alumno/calificaciones" className="text-xs font-semibold text-verde hover:text-verde-oscuro inline-flex items-center gap-1">
                Ver todas →
              </Link>
            }
          >
            <DataTable
              rowKey={(r, i) => `${r.materia}-${i}`}
              rows={ultimas}
              empty="Aún no hay calificaciones registradas."
              columns={[
                {
                  key: 'materia',
                  label: 'Materia',
                  render: (r: any) => (
                    <div>
                      <div className="font-medium text-verde-oscuro">{r.materia}</div>
                      <div className="text-[11px] text-gray-500">{r.profesor ?? '—'} · Sem {r.semestre}°</div>
                    </div>
                  ),
                },
                { key: 'p1', label: 'P1', align: 'center', render: (r: any) => r.p1 ?? '—' },
                { key: 'p2', label: 'P2', align: 'center', render: (r: any) => r.p2 ?? '—' },
                { key: 'p3', label: 'P3', align: 'center', render: (r: any) => r.p3 ?? '—' },
                {
                  key: 'final',
                  label: 'Final',
                  align: 'right',
                  render: (r: any) => (
                    <span className="font-serif text-lg text-verde-oscuro tabular-nums">
                      {r.promedio_final != null ? Number(r.promedio_final).toFixed(2) : '—'}
                    </span>
                  ),
                },
                {
                  key: 'estado',
                  label: 'Estado',
                  align: 'center',
                  hideOn: 'mobile',
                  render: (r: any) =>
                    r.estatus_materia === 'aprobado' ? <Badge tone="verde" size="sm">Aprobado</Badge>
                      : r.estatus_materia === 'reprobado' ? <Badge tone="rosa" size="sm">Reprobado</Badge>
                      : <Badge tone="gray" size="sm">Cursando</Badge>,
                },
              ]}
            />
          </Card>
        </div>

        {/* Sidebar derecha */}
        <div className="space-y-6">
          <Card eyebrow="Avisos" title="Anuncios recientes">
            {anuncios && anuncios.length > 0 ? (
              <ul className="space-y-3">
                {anuncios.map((a) => (
                  <li key={a.id} className="group relative p-3 rounded-xl bg-gradient-to-br from-crema to-white border border-gray-200 hover:border-verde/50 transition">
                    <div className="flex items-start gap-2">
                      <div className="text-xl">{a.icono ?? '📣'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold text-sm text-verde-oscuro line-clamp-1">{a.titulo}</div>
                          {a.prioridad === 'urgente' && <Badge tone="rosa" size="sm">Urgente</Badge>}
                          {a.prioridad === 'alta' && <Badge tone="ambar" size="sm">Importante</Badge>}
                          {a.fijado && <Badge tone="dorado" size="sm">📌</Badge>}
                        </div>
                        {a.cuerpo && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{a.cuerpo}</div>}
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 mt-1.5">
                          {new Date(a.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="🕊️" title="Sin anuncios" description="No hay avisos vigentes por ahora." />
            )}
          </Card>

          <Card eyebrow="Atajos" title="¿Qué quieres hacer?">
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/alumno/calificaciones', label: 'Ver calificaciones', icon: '📊' },
                { href: '/alumno/boleta', label: 'Descargar boleta', icon: '📄' },
                { href: '/alumno/solicitudes', label: 'Mis solicitudes', icon: '💬' },
                { href: '/alumno/estado-cuenta', label: 'Estado de cuenta', icon: '💳' },
                { href: '/alumno/ficha', label: 'Mi ficha', icon: '👤' },
                { href: '/publico/contacto', label: 'Contactar', icon: '📞' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex flex-col items-start gap-1 p-3 rounded-xl border border-gray-200 hover:border-verde hover:bg-crema transition"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{a.icon}</span>
                  <span className="text-[12px] font-semibold text-verde-oscuro leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Historial por semestre */}
      <Card eyebrow="Histórico" title="Rendimiento por semestre">
        <DataTable
          rowKey={(r, i) => `${r.ciclo}-${r.semestre}-${i}`}
          rows={semestres}
          empty="Sin registros aún."
          columns={[
            { key: 'ciclo', label: 'Ciclo', render: (s: any) => `${s.ciclo} ${s.periodo}` },
            { key: 'semestre', label: 'Sem', align: 'center', render: (s: any) => `${s.semestre}°` },
            { key: 'materias_cursadas', label: 'Materias', align: 'center' },
            { key: 'materias_aprobadas', label: 'Aprobadas', align: 'center', render: (s: any) => <span className="text-verde font-semibold">{s.materias_aprobadas}</span> },
            { key: 'materias_reprobadas', label: 'Reprobadas', align: 'center', render: (s: any) => s.materias_reprobadas > 0 ? <span className="text-rose-600 font-semibold">{s.materias_reprobadas}</span> : '0' },
            {
              key: 'promedio_semestre',
              label: 'Promedio',
              align: 'right',
              render: (s: any) => (
                <span className="font-serif text-lg text-verde-oscuro tabular-nums">
                  {s.promedio_semestre != null ? Number(s.promedio_semestre).toFixed(2) : '—'}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
