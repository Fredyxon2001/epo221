// Panorama institucional para la Dirección.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, StatCard, Card, Badge, EmptyState, Countdown } from '@/components/privado/ui';
import { DashboardHero } from '@/components/privado/DashboardHero';

export default async function DirectorHome() {
  const supabase = createClient();
  const { data: perfil } = await supabase
    .from('perfiles').select('nombre').eq('id', (await supabase.auth.getUser()).data.user!.id).single();

  const { data: ciclo } = await supabase.from('ciclos_escolares').select('*').eq('activo', true).maybeSingle();

  const [
    { count: alumnos },
    { count: profes },
    { count: grupos },
    { count: solicAbiertas },
    { count: solicTotal },
    { count: anunciosVig },
  ] = await Promise.all([
    supabase.from('alumnos').select('*', { count: 'exact', head: true }).eq('estatus', 'activo'),
    supabase.from('profesores').select('*', { count: 'exact', head: true }).eq('activo', true),
    ciclo ? supabase.from('grupos').select('*', { count: 'exact', head: true }).eq('ciclo_id', ciclo.id) : Promise.resolve({ count: 0 } as any),
    supabase.from('solicitudes_revision').select('*', { count: 'exact', head: true }).eq('estado', 'abierta'),
    supabase.from('solicitudes_revision').select('*', { count: 'exact', head: true }),
    supabase.from('anuncios').select('*', { count: 'exact', head: true }).eq('publicado', true),
  ]);

  // Próximo parcial a cerrar
  const { data: parciales } = ciclo
    ? await supabase
        .from('parciales_config')
        .select('numero, nombre, abre_captura, cierra_captura')
        .eq('ciclo_id', ciclo.id)
        .order('numero')
    : { data: [] as any[] };
  const hoy = new Date();
  const parcialActivo = (parciales ?? []).find((p: any) => {
    const a = p.abre_captura ? new Date(p.abre_captura) : null;
    const c = p.cierra_captura ? new Date(p.cierra_captura) : null;
    return (!a || hoy >= a) && (!c || hoy <= c);
  });

  // Últimas solicitudes respondidas (vista de calidad)
  const { data: ultSol } = await supabase
    .from('solicitudes_revision')
    .select(`
      id, parcial, motivo, estado, created_at,
      alumno:alumnos(nombre, apellido_paterno),
      asignacion:asignaciones(materia:materias(nombre), profesor:profesores(perfil:perfiles(nombre)))
    `)
    .order('created_at', { ascending: false }).limit(5);

  const nombre = (perfil?.nombre ?? 'Director').split(' ')[0];

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow="Dirección · EPO 221"
        title={`Panorama institucional`}
        subtitle={`Bienvenido, ${nombre}. Visión ejecutiva de la escuela en tiempo real: matrícula, académico y comunicación.`}
        icon="🏛️"
        chip={ciclo ? { label: `Ciclo ${ciclo.codigo}`, tone: 'dorado' } : undefined}
        gradient="from-[#1a1200] via-[#3a2a05] to-verde-oscuro"
      >
        <Link href="/director/anuncios" className="inline-flex items-center gap-2 bg-gradient-to-r from-dorado to-dorado-claro text-verde-oscuro text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition">
          📣 Nuevo comunicado
        </Link>
      </DashboardHero>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Alumnos activos" value={alumnos ?? 0} icon="🎓" tone="verde" />
        <StatCard label="Profesores activos" value={profes ?? 0} icon="👨‍🏫" tone="dorado" />
        <StatCard label="Grupos del ciclo" value={grupos ?? 0} icon="🏫" tone="azul" />
        <StatCard
          label="Solicitudes abiertas"
          value={solicAbiertas ?? 0}
          icon="💬"
          tone={(solicAbiertas ?? 0) > 0 ? 'rosa' : 'slate'}
          href="/director/solicitudes"
          hint={`${solicTotal ?? 0} totales registradas`}
        />
      </div>

      {/* Hero ciclo activo */}
      {ciclo && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1200] via-[#3a2a05] to-verde-oscuro text-white p-6 md:p-8 shadow-2xl shadow-black/30">
          <div className="aurora absolute inset-0 opacity-40" aria-hidden />
          <div className="grain absolute inset-0" aria-hidden />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.4em] text-dorado-claro">Ciclo vigente</div>
              <div className="font-serif text-3xl md:text-4xl mt-1">
                {ciclo.codigo} <span className="text-dorado-claro">·</span> {ciclo.periodo}
              </div>
              {ciclo.fecha_inicio && ciclo.fecha_fin && (
                <div className="text-sm text-white/70 mt-1">
                  {new Date(ciclo.fecha_inicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                  {' — '}
                  {new Date(ciclo.fecha_fin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>

            {parcialActivo && parcialActivo.cierra_captura && (
              <div className="glass rounded-xl p-4 min-w-[260px]">
                <div className="text-[10px] uppercase tracking-[0.3em] text-dorado-claro">Captura activa</div>
                <div className="font-serif text-xl mt-0.5">{parcialActivo.nombre ?? `Parcial ${parcialActivo.numero}`}</div>
                <div className="mt-2"><Countdown target={parcialActivo.cierra_captura} label="Cierra en" /></div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card
          eyebrow="Calidad académica"
          title="Solicitudes recientes"
          className="lg:col-span-2"
          action={<Link href="/director/solicitudes" className="text-xs font-semibold text-verde hover:text-verde-oscuro">Ver todas →</Link>}
        >
          {(!ultSol || ultSol.length === 0) ? (
            <EmptyState icon="📭" title="Sin movimientos" description="No hay solicitudes registradas aún." />
          ) : (
            <ul className="space-y-2">
              {ultSol.map((s: any) => (
                <li key={s.id} className="p-3 rounded-xl border border-gray-200 hover:bg-crema/40 transition flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-verde-claro/30 text-verde-oscuro font-bold flex items-center justify-center text-sm shrink-0">
                    P{s.parcial ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-verde-oscuro truncate">
                      {s.alumno?.apellido_paterno} {s.alumno?.nombre} · {s.asignacion?.materia?.nombre}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Docente: {(s.asignacion?.profesor as any)?.perfil?.nombre ?? '—'}
                    </div>
                  </div>
                  <Badge
                    tone={s.estado === 'abierta' ? 'ambar' : s.estado === 'respondida' ? 'azul' : s.estado === 'aceptada' ? 'verde' : s.estado === 'rechazada' ? 'rosa' : 'gray'}
                    size="sm"
                  >
                    {s.estado}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card eyebrow="Comunicación" title="Mis canales" action={<Link href="/director/anuncios" className="text-xs font-semibold text-verde">Gestionar →</Link>}>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-crema/40 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">📣</span>
                <div>
                  <div className="font-semibold text-sm text-verde-oscuro">Comunicados internos</div>
                  <div className="text-[11px] text-gray-500">Vigentes en dashboards</div>
                </div>
              </div>
              <Badge tone="verde" size="md">{anunciosVig ?? 0}</Badge>
            </div>
            <Link href="/admin/noticias" className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 hover:border-verde transition">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌐</span>
                <div>
                  <div className="font-semibold text-sm text-verde-oscuro">Noticias públicas</div>
                  <div className="text-[11px] text-gray-500">Visibles en el sitio web</div>
                </div>
              </div>
              <span className="text-verde font-semibold text-sm">→</span>
            </Link>
            <Link href="/admin/convocatorias" className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 hover:border-verde transition">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <div>
                  <div className="font-semibold text-sm text-verde-oscuro">Convocatorias</div>
                  <div className="text-[11px] text-gray-500">Procesos oficiales</div>
                </div>
              </div>
              <span className="text-verde font-semibold text-sm">→</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
