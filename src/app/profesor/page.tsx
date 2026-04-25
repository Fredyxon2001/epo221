// Dashboard premium del profesor: plazos activos, solicitudes abiertas y mis grupos.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, StatCard, Card, Badge, EmptyState, Countdown } from '@/components/privado/ui';
import { DashboardHero } from '@/components/privado/DashboardHero';
import { codigoGrupo } from '@/lib/grupos';

export default async function ProfesorDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: perfil } = await supabase.from('perfiles').select('nombre').eq('id', user!.id).single();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  const profesorId = profesor?.id ?? '';

  // Asignaciones del ciclo activo
  const { data: asignaciones } = await supabase
    .from('asignaciones')
    .select(`
      id, grupo_id,
      materia:materias(nombre, semestre, tipo),
      grupo:grupos(grado, semestre, grupo, turno),
      ciclo:ciclos_escolares(id, codigo, periodo, activo)
    `)
    .eq('profesor_id', profesorId);

  const activas = (asignaciones ?? []).filter((a: any) => a.ciclo?.activo);
  const cicloActivoId = (activas[0] as any)?.ciclo?.id ?? null;

  // Parciales del ciclo activo: cuál está abierto, cuál próximo a cerrar
  const { data: parciales } = cicloActivoId
    ? await supabase
        .from('parciales_config')
        .select('numero, nombre, abre_captura, cierra_captura, publicado')
        .eq('ciclo_id', cicloActivoId)
        .order('numero')
    : { data: [] as any[] };

  const hoy = new Date();
  const activoP = (parciales ?? []).find((p: any) => {
    const a = p.abre_captura ? new Date(p.abre_captura) : null;
    const c = p.cierra_captura ? new Date(p.cierra_captura) : null;
    return (!a || hoy >= a) && (!c || hoy <= c);
  });

  // Conteos: alumnos bajo mi responsabilidad (únicos) en asignaciones del ciclo activo
  const asigIds = activas.map((a: any) => a.id);
  let alumnosUnicos = 0;
  if (asigIds.length) {
    const gIds = Array.from(new Set(activas.map((a: any) => a.grupo_id).filter(Boolean)));
    // aproximación: contar inscripciones de esos grupos en el ciclo activo
    if (gIds.length) {
      const { count } = await supabase
        .from('inscripciones')
        .select('id', { count: 'exact', head: true })
        .in('grupo_id', gIds)
        .eq('ciclo_id', cicloActivoId!)
        .eq('estatus', 'activa');
      alumnosUnicos = count ?? 0;
    }
  }

  // % capturado por asignación en el parcial activo
  const capturaPorAsig = new Map<string, { esperados: number; capturados: number }>();
  if (activoP && asigIds.length) {
    for (const a of activas as any[]) {
      const { count: esperados } = await supabase
        .from('inscripciones').select('id', { count: 'exact', head: true })
        .eq('grupo_id', a.grupo_id).eq('ciclo_id', cicloActivoId!).eq('estatus', 'activa');
      const { count: capturados } = await supabase
        .from('calificaciones').select('id', { count: 'exact', head: true })
        .eq('asignacion_id', a.id).eq('parcial', activoP.numero);
      capturaPorAsig.set(a.id, { esperados: esperados ?? 0, capturados: capturados ?? 0 });
    }
  }
  const totalEsp = Array.from(capturaPorAsig.values()).reduce((s, v) => s + v.esperados, 0);
  const totalCap = Array.from(capturaPorAsig.values()).reduce((s, v) => s + v.capturados, 0);
  const pctGlobal = totalEsp > 0 ? Math.round((totalCap / totalEsp) * 100) : 0;

  // Mensajes no leídos para el profesor
  let mensajesNoLeidos = 0;
  if (profesorId) {
    const { data: misHilos } = await supabase.from('mensajes_hilos').select('id').eq('profesor_id', profesorId);
    const hIds = (misHilos ?? []).map((h: any) => h.id);
    if (hIds.length) {
      const { count } = await supabase.from('mensajes').select('id', { count: 'exact', head: true })
        .in('hilo_id', hIds).is('leido_at', null).eq('autor_tipo', 'alumno');
      mensajesNoLeidos = count ?? 0;
    }
  }

  // Solicitudes
  let abiertas = 0, respondidas = 0;
  if (asigIds.length) {
    const { count: a } = await supabase
      .from('solicitudes_revision').select('id', { count: 'exact', head: true })
      .in('asignacion_id', asigIds).eq('estado', 'abierta');
    const { count: r } = await supabase
      .from('solicitudes_revision').select('id', { count: 'exact', head: true })
      .in('asignacion_id', asigIds).eq('estado', 'respondida');
    abiertas = a ?? 0; respondidas = r ?? 0;
  }

  // Últimas solicitudes abiertas (preview)
  const { data: ultSol } = asigIds.length
    ? await supabase
        .from('solicitudes_revision')
        .select(`
          id, parcial, motivo, estado, created_at,
          alumno:alumnos(nombre, apellido_paterno, apellido_materno, matricula),
          asignacion:asignaciones(materia:materias(nombre))
        `)
        .in('asignacion_id', asigIds)
        .eq('estado', 'abierta')
        .order('created_at', { ascending: false })
        .limit(4)
    : { data: [] as any[] };

  // Anuncios para docentes (globales + anclados a sus grupos)
  const misGruposIds = Array.from(new Set(activas.map((a: any) => a.grupo_id).filter(Boolean)));
  const { data: anunciosRaw } = await supabase
    .from('anuncios')
    .select('id, titulo, cuerpo, prioridad, icono, created_at, fijado, grupo_id, rol_objetivo')
    .eq('publicado', true)
    .in('audiencia', ['todos', 'profesores'])
    .order('fijado', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(20);
  const anuncios = (anunciosRaw ?? []).filter((a: any) =>
    (!a.grupo_id || misGruposIds.includes(a.grupo_id)) &&
    (!a.rol_objetivo || a.rol_objetivo === 'profesor')
  ).slice(0, 3);

  const nombre = (perfil?.nombre ?? 'Profesor').split(' ')[0];

  return (
    <div className="space-y-8">
      <DashboardHero
        eyebrow="Portal docente"
        title={`Bienvenido, ${nombre}`}
        subtitle="Tus grupos, plazos de captura y solicitudes de revisión. Tu brújula académica para enseñar con impacto. ✨"
        icon="👨‍🏫"
        chip={activoP ? { label: `${activoP.nombre ?? `P${activoP.numero}`} · captura abierta`, tone: 'dorado' } : undefined}
        gradient="from-[#0b3b3a] via-verde-oscuro to-verde"
      />

      {/* Plazo actual destacado */}
      {activoP && activoP.cierra_captura && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-verde-oscuro via-verde to-verde-medio text-white p-6 shadow-xl shadow-verde/20">
          <div className="aurora absolute inset-0 opacity-40" aria-hidden />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-verde-claro mb-1">Captura activa</div>
              <div className="font-serif text-2xl md:text-3xl">{activoP.nombre ?? `Parcial ${activoP.numero}`}</div>
              <div className="text-sm text-white/80 mt-1">
                Plazo para subir calificaciones del período actual.
              </div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <Countdown target={activoP.cierra_captura} label="Cierra en" />
              <div className="text-xs text-white/70">
                Cierre: {new Date(activoP.cierra_captura).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Grupos activos" value={activas.length} icon="📚" tone="verde" hint="En el ciclo actual" />
        <StatCard label="Alumnos" value={alumnosUnicos} icon="🧑‍🎓" tone="azul" hint="Bajo tu responsabilidad" />
        <StatCard
          label="% capturado"
          value={`${pctGlobal}%`}
          icon="📝"
          tone={pctGlobal >= 90 ? 'verde' : pctGlobal >= 50 ? 'dorado' : 'rosa'}
          hint={activoP ? `${activoP.nombre ?? `P${activoP.numero}`}: ${totalCap}/${totalEsp}` : 'Sin parcial abierto'}
        />
        <StatCard
          label="Mensajes"
          value={mensajesNoLeidos}
          icon="💌"
          tone={mensajesNoLeidos > 0 ? 'rosa' : 'slate'}
          hint={mensajesNoLeidos > 0 ? 'No leídos' : 'Al día'}
          href={mensajesNoLeidos > 0 ? '/profesor/mensajes' : undefined}
        />
        <StatCard
          label="Solicitudes"
          value={abiertas}
          icon="💬"
          tone={abiertas > 0 ? 'rosa' : 'slate'}
          hint={abiertas > 0 ? `${abiertas} abiertas · ${respondidas} respondidas` : 'Sin pendientes'}
          href={abiertas > 0 ? '/profesor/solicitudes' : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Grupos */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            eyebrow="Mis grupos"
            title={`Ciclo ${(activas[0] as any)?.ciclo?.codigo ?? ''} ${(activas[0] as any)?.ciclo?.periodo ?? ''}`}
            action={
              <Link href="/profesor/grupos" className="text-xs font-semibold text-verde hover:text-verde-oscuro">
                Ver todos →
              </Link>
            }
          >
            {activas.length === 0 ? (
              <EmptyState icon="📭" title="Sin grupos activos" description="No tienes grupos asignados en el ciclo vigente." />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {activas.map((a: any) => {
                  const cap = capturaPorAsig.get(a.id);
                  const pct = cap && cap.esperados > 0 ? Math.round((cap.capturados / cap.esperados) * 100) : 0;
                  return (
                  <Link
                    key={a.id}
                    href={`/profesor/grupo/${a.id}`}
                    className="group relative block rounded-xl border border-gray-200 hover:border-verde hover:shadow-lg hover:shadow-verde/10 transition p-4 bg-gradient-to-br from-white to-crema/50 overflow-hidden"
                  >
                    <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-verde-claro/20 blur-2xl group-hover:bg-dorado/30 transition" aria-hidden />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-serif text-base text-verde-oscuro leading-tight">{a.materia?.nombre}</div>
                        <Badge tone="dorado" size="sm">{a.materia?.tipo ?? 'Materia'}</Badge>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Grupo <strong>{codigoGrupo(a.grupo?.grado ?? Math.ceil((a.grupo?.semestre ?? 1) / 2), a.grupo?.grupo ?? 0)}</strong> · {a.grupo?.semestre}° sem · Turno {a.grupo?.turno}
                      </div>
                      {activoP && cap && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] text-gray-600 mb-1">
                            <span>Captura {activoP.nombre ?? `P${activoP.numero}`}</span>
                            <span className="font-semibold">{cap.capturados}/{cap.esperados} · {pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full ${pct >= 90 ? 'bg-verde' : pct >= 50 ? 'bg-dorado' : 'bg-rosa'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="mt-3 text-[11px] text-verde font-semibold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Abrir captura →
                      </div>
                    </div>
                  </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Parciales del ciclo */}
          {parciales && parciales.length > 0 && (
            <Card eyebrow="Calendario" title="Parciales del ciclo actual">
              <div className="space-y-2">
                {parciales.map((p: any) => {
                  const abre = p.abre_captura ? new Date(p.abre_captura) : null;
                  const cierra = p.cierra_captura ? new Date(p.cierra_captura) : null;
                  const ahora = new Date();
                  const estado = !abre || !cierra ? 'programado' :
                    ahora < abre ? 'proximo' :
                    ahora > cierra ? 'cerrado' : 'abierto';
                  const map: any = {
                    abierto:    { tone: 'verde',  label: 'En captura' },
                    proximo:    { tone: 'azul',   label: 'Próximo' },
                    cerrado:    { tone: 'gray',   label: 'Cerrado' },
                    programado: { tone: 'ambar',  label: 'Sin fecha' },
                  };
                  return (
                    <div key={p.numero} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-crema/40 transition">
                      <div className="w-10 h-10 rounded-xl bg-verde-claro/30 text-verde-oscuro font-serif font-bold flex items-center justify-center shrink-0">
                        P{p.numero}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-verde-oscuro text-sm">{p.nombre ?? `Parcial ${p.numero}`}</div>
                        <div className="text-xs text-gray-500">
                          {abre ? abre.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}
                          {' → '}
                          {cierra ? cierra.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}
                        </div>
                      </div>
                      <Badge tone={map[estado].tone}>{map[estado].label}</Badge>
                      {estado === 'abierto' && cierra && (
                        <Countdown target={cierra.toISOString()} label="Cierra en" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Derecha */}
        <div className="space-y-6">
          <Card
            eyebrow="Pendientes"
            title="Solicitudes abiertas"
            action={abiertas > 0 ? (
              <Link href="/profesor/solicitudes" className="text-xs font-semibold text-verde hover:text-verde-oscuro">Ver todas →</Link>
            ) : null}
          >
            {(!ultSol || ultSol.length === 0) ? (
              <EmptyState icon="🎉" title="Todo en orden" description="No tienes solicitudes pendientes." />
            ) : (
              <ul className="space-y-2">
                {ultSol.map((s: any) => (
                  <Link
                    key={s.id}
                    href="/profesor/solicitudes"
                    className="block p-3 rounded-xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm text-verde-oscuro truncate">
                        {s.alumno?.apellido_paterno} {s.alumno?.nombre}
                      </div>
                      <Badge tone="ambar" size="sm">P{s.parcial}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5 truncate">{s.asignacion?.materia?.nombre}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">{s.motivo}</div>
                  </Link>
                ))}
              </ul>
            )}
          </Card>

          <Card eyebrow="Avisos" title="Comunicados">
            {anuncios && anuncios.length > 0 ? (
              <ul className="space-y-2">
                {anuncios.map((a: any) => (
                  <li key={a.id} className="p-3 rounded-xl bg-crema/50 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{a.icono ?? '📣'}</span>
                      <div className="font-semibold text-sm text-verde-oscuro line-clamp-1 flex-1">{a.titulo}</div>
                      {a.prioridad === 'urgente' && <Badge tone="rosa" size="sm">!</Badge>}
                    </div>
                    {a.cuerpo && <div className="text-xs text-gray-600 mt-1 line-clamp-2">{a.cuerpo}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="📭" title="Sin avisos" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
