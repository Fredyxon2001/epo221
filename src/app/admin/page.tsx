// Panel admin premium — KPIs, ciclo activo, últimos pagos, solicitudes globales.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, StatCard, Card, Badge, EmptyState } from '@/components/privado/ui';
import { DataTable } from '@/components/privado/DataTable';
import { DashboardHero } from '@/components/privado/DashboardHero';
import { AnimatedStat } from '@/components/privado/AnimatedStat';
import { codigoGrupo } from '@/lib/grupos';

export default async function AdminDashboard() {
  const supabase = createClient();

  const { data: cicloActivo } = await supabase
    .from('ciclos_escolares').select('*').eq('activo', true).limit(1).maybeSingle();

  const cicloId = cicloActivo?.id ?? null;

  const [
    { count: totalAlumnos },
    { count: totalProfes },
    { count: totalGrupos },
    { count: totalAsignaciones },
    { count: sinProfesor },
    { count: pagosPendientes },
    { count: solicAbiertas },
  ] = await Promise.all([
    supabase.from('alumnos').select('*', { count: 'exact', head: true }).eq('estatus', 'activo'),
    supabase.from('profesores').select('*', { count: 'exact', head: true }).eq('activo', true),
    cicloId ? supabase.from('grupos').select('*', { count: 'exact', head: true }).eq('ciclo_id', cicloId) : Promise.resolve({ count: 0 } as any),
    cicloId ? supabase.from('asignaciones').select('*', { count: 'exact', head: true }).eq('ciclo_id', cicloId) : Promise.resolve({ count: 0 } as any),
    cicloId ? supabase.from('asignaciones').select('*', { count: 'exact', head: true }).eq('ciclo_id', cicloId).is('profesor_id', null) : Promise.resolve({ count: 0 } as any),
    supabase.from('cargos').select('*', { count: 'exact', head: true }).eq('estatus', 'pendiente'),
    supabase.from('solicitudes_revision').select('*', { count: 'exact', head: true }).eq('estado', 'abierta'),
  ]);

  let pctCiclo = 0;
  if (cicloActivo?.fecha_inicio && cicloActivo?.fecha_fin) {
    const ini = new Date(cicloActivo.fecha_inicio).getTime();
    const fin = new Date(cicloActivo.fecha_fin).getTime();
    pctCiclo = Math.max(0, Math.min(100, Math.round(((Date.now() - ini) / (fin - ini)) * 100)));
  }

  const { data: ultimosPagos } = await supabase
    .from('pagos')
    .select(`id, monto_pagado, fecha_pago, metodo,
      alumno:alumnos(nombre, apellido_paterno),
      cargo:cargos(concepto:conceptos_pago(nombre), estatus)`)
    .order('created_at', { ascending: false }).limit(6);

  const { data: gruposCiclo } = cicloId
    ? await supabase.from('grupos')
        .select('id, semestre, grupo, turno, grado')
        .eq('ciclo_id', cicloId)
        .order('semestre').order('grupo')
    : { data: [] as any[] };

  const gruposConAlumnos: any[] = [];
  if (gruposCiclo && gruposCiclo.length > 0) {
    for (const g of gruposCiclo) {
      const { count } = await supabase
        .from('inscripciones').select('*', { count: 'exact', head: true })
        .eq('grupo_id', g.id).eq('estatus', 'activa');
      gruposConAlumnos.push({ ...g, alumnos: count ?? 0 });
    }
  }

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow="Panel de control · EPO 221"
        title="Resumen institucional"
        subtitle="Métricas en tiempo real, estado del ciclo activo y atajos a las tareas más frecuentes. Todo lo que mueve a la escuela, en un vistazo."
        icon="🏛️"
        chip={cicloActivo ? { label: `Ciclo ${cicloActivo.codigo}`, tone: 'dorado' } : undefined}
        gradient="from-[#091f1e] via-[#103b39] to-verde-oscuro"
      >
        <Link href="/admin/publico" className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur border border-white/25 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition">
          🌐 Sitio público
        </Link>
      </DashboardHero>

      {/* KPIs con tilt 3D + count-up */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <AnimatedStat label="Alumnos" value={totalAlumnos ?? 0} icon="🎓" tone="verde" href="/admin/alumnos" delay={0.00} />
        <AnimatedStat label="Profesores" value={totalProfes ?? 0} icon="👨‍🏫" tone="azul" href="/admin/profesores" delay={0.05} />
        <AnimatedStat label="Grupos" value={totalGrupos ?? 0} icon="🏫" tone="dorado" href="/admin/grupos" delay={0.10} />
        <AnimatedStat label="Asignaciones" value={totalAsignaciones ?? 0} icon="🔗" tone="slate" href="/admin/asignaciones" delay={0.15} />
        <AnimatedStat
          label="Sin profesor"
          value={sinProfesor ?? 0}
          icon={(sinProfesor ?? 0) > 0 ? '⚠️' : '✅'}
          tone={(sinProfesor ?? 0) > 0 ? 'rosa' : 'verde'}
          href="/admin/asignaciones"
          delay={0.20}
        />
        <AnimatedStat
          label="Pagos pend."
          value={pagosPendientes ?? 0}
          icon="💰"
          tone={(pagosPendientes ?? 0) > 0 ? 'rosa' : 'verde'}
          href="/admin/pagos"
          delay={0.25}
        />
      </div>

      {/* Solicitudes banner */}
      {(solicAbiertas ?? 0) > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white p-5 shadow-xl shadow-amber-500/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">💬</span>
            <div>
              <div className="font-serif text-xl">{solicAbiertas} solicitudes de revisión abiertas</div>
              <div className="text-sm text-white/85">Los profesores tienen solicitudes pendientes de responder.</div>
            </div>
          </div>
          <Link href="/admin/calificaciones" className="bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2 rounded-xl text-sm font-semibold border border-white/30 whitespace-nowrap">
            Supervisar →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card
          eyebrow="Ciclo activo"
          title={cicloActivo ? `${cicloActivo.codigo} · ${cicloActivo.periodo}` : 'Sin ciclo activo'}
          className="lg:col-span-2"
          action={<Link href="/admin/ciclos" className="text-xs font-semibold text-verde hover:text-verde-oscuro">Gestionar →</Link>}
        >
          {cicloActivo ? (
            <>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <div className="font-serif text-4xl text-verde-oscuro tabular-nums">{pctCiclo}%</div>
                  <div className="text-xs text-gray-500">transcurrido</div>
                </div>
                {cicloActivo.fecha_inicio && cicloActivo.fecha_fin && (
                  <div className="text-right text-xs text-gray-500">
                    <div>{new Date(cicloActivo.fecha_inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-gray-400">↓</div>
                    <div>{new Date(cicloActivo.fecha_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                )}
              </div>
              <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-verde-oscuro via-verde to-verde-claro transition-all" style={{ width: `${Math.max(2, pctCiclo)}%` }} />
              </div>

              {gruposConAlumnos.length > 0 && (
                <div className="mt-5">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-semibold mb-2">Grupos del ciclo</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {gruposConAlumnos.map((g: any) => (
                      <Link
                        key={g.id}
                        href="/admin/grupos"
                        className="p-2.5 rounded-lg border border-gray-200 hover:border-verde transition text-xs bg-white"
                      >
                        <div className="font-semibold text-verde-oscuro">{codigoGrupo(g.grado ?? Math.ceil(g.semestre / 2), g.grupo)} <span className="text-[10px] text-gray-500 capitalize">· {g.semestre}° · {g.turno}</span></div>
                        <div className="text-gray-400 text-[11px] mt-0.5">{g.alumnos} alumnos</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState icon="📅" title="No hay ciclo activo" action={<Link href="/admin/ciclos" className="bg-verde text-white text-sm font-semibold px-4 py-2 rounded-lg">Crear ciclo</Link>} />
          )}
        </Card>

        <Card eyebrow="Atajos" title="Acciones rápidas">
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/admin/alumnos', l: 'Alumnos', i: '🎓' },
              { href: '/admin/asignaciones', l: 'Asignar', i: '🔗' },
              { href: '/admin/noticias', l: 'Noticia', i: '📣' },
              { href: '/admin/anuncios', l: 'Anuncio', i: '🔔' },
              { href: '/admin/pagos', l: 'Pagos', i: '💰' },
              { href: '/admin/publico', l: 'Sitio web', i: '🌐' },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group p-3 rounded-xl border border-gray-200 hover:border-verde hover:bg-crema transition flex flex-col items-start gap-1"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{a.i}</span>
                <span className="text-[12px] font-semibold text-verde-oscuro">{a.l}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card
        eyebrow="Movimientos"
        title="Últimos pagos"
        action={<Link href="/admin/pagos" className="text-xs font-semibold text-verde hover:text-verde-oscuro">Ver todos →</Link>}
      >
        <DataTable
          rowKey={(r: any) => r.id}
          rows={(ultimosPagos ?? []) as any[]}
          empty="No hay pagos registrados aún."
          columns={[
            { key: 'alumno', label: 'Alumno', render: (p: any) => p.alumno ? `${p.alumno.apellido_paterno} ${p.alumno.nombre}` : '—' },
            { key: 'concepto', label: 'Concepto', hideOn: 'mobile', render: (p: any) => p.cargo?.concepto?.nombre ?? '—' },
            { key: 'monto', label: 'Monto', align: 'right', render: (p: any) => <span className="font-mono tabular-nums">${Number(p.monto_pagado).toFixed(2)}</span> },
            { key: 'fecha', label: 'Fecha', hideOn: 'mobile', render: (p: any) => p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-MX') : '—' },
            {
              key: 'estatus',
              label: 'Estatus',
              render: (p: any) => {
                const e = p.cargo?.estatus ?? '—';
                const tone = e === 'pagado' ? 'verde' : e === 'pendiente' ? 'ambar' : e === 'en_revision' ? 'azul' : 'gray';
                return <Badge tone={tone as any} size="sm">{e}</Badge>;
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}
