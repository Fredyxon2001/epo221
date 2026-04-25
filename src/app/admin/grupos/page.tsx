import { createClient } from '@/lib/supabase/server';
import {
  crearGrupo, crearGruposBulk, crearAsignacion,
  sembrarAsignaciones, cambiarAlumnoDeGrupo, promoverGrupo,
  asignarOrientador,
} from './actions';
import { codigoGrupo, labelGrupo, gradoDeSemestre, siguienteSemestre } from '@/lib/grupos';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';

export default async function AdminGrupos({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string };
}) {
  const supabase = createClient();

  const [
    { data: grupos },
    { data: ciclos },
    { data: materias },
    { data: profes },
    { data: alumnos },
  ] = await Promise.all([
    supabase.from('grupos')
      .select(`id, grado, semestre, grupo, turno, ciclo_id, orientador_id, ciclo:ciclos_escolares(codigo, periodo, activo, fecha_fin), orientador:profesores!grupos_orientador_id_fkey(nombre, apellido_paterno)`)
      .order('semestre').order('grupo'),
    supabase.from('ciclos_escolares').select('*').order('codigo', { ascending: false }),
    supabase.from('materias').select('id, nombre, semestre').eq('activo', true).order('semestre'),
    supabase.from('profesores').select('id, nombre, apellido_paterno').eq('activo', true),
    supabase.from('alumnos').select('id, nombre, apellido_paterno, matricula').eq('estatus', 'activo').limit(500),
  ]);

  // Conteo de alumnos y asignaciones por grupo
  const enriched = await Promise.all(
    (grupos ?? []).map(async (g: any) => {
      const [{ count: nAlumnos }, { count: nAsigs }] = await Promise.all([
        supabase.from('inscripciones').select('id', { count: 'exact', head: true }).eq('grupo_id', g.id).eq('estatus', 'activa'),
        supabase.from('asignaciones').select('id', { count: 'exact', head: true }).eq('grupo_id', g.id),
      ]);
      return { ...g, nAlumnos: nAlumnos ?? 0, nAsigs: nAsigs ?? 0 };
    }),
  );

  // Agrupar por ciclo → semestre
  const byCiclo = new Map<string, any>();
  for (const g of enriched) {
    const ck = `${g.ciclo?.codigo ?? '—'} ${g.ciclo?.periodo ?? ''}`;
    if (!byCiclo.has(ck)) byCiclo.set(ck, { ciclo: g.ciclo, ciclo_id: g.ciclo_id, grupos: [] });
    byCiclo.get(ck).grupos.push(g);
  }

  const cicloActivo = (ciclos ?? []).find((c: any) => c.activo) ?? null;

  return (
    <div className="max-w-7xl space-y-6">
      <PageHeader
        eyebrow="Gestión académica"
        title="Grupos y asignaciones"
        description="Crea grupos por semestre con nomenclatura institucional (101..307), siembra materias automáticamente, promueve o transfiere alumnos."
      />

      {searchParams?.ok && (
        <div className="bg-verde-claro/20 border border-verde/30 text-verde-oscuro rounded-xl px-4 py-3 text-sm">
          ✅ {searchParams.ok}
        </div>
      )}
      {searchParams?.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          ⚠️ {searchParams.error}
        </div>
      )}

      {/* ─────────── Crear grupos en lote ─────────── */}
      <Card
        eyebrow="Alta masiva"
        title="Crear grupos por semestre"
      >
        <p className="text-xs text-gray-500 mb-4">
          La nomenclatura se arma automática: <b>semestre 1–2</b> → 101..1NN, <b>3–4</b> → 201..2NN, <b>5–6</b> → 301..3NN.
          Marca <i>“sembrar materias”</i> para que los nuevos grupos queden asignados a todas las materias activas de ese semestre.
        </p>
        <form action={crearGruposBulk} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm items-end">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Ciclo</label>
            <select name="ciclo_id" required defaultValue={cicloActivo?.id ?? ''} className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              {(ciclos ?? []).map((c: any) => (
                <option key={c.id} value={c.id}>{c.codigo} {c.periodo}{c.activo ? ' ●' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Semestre</label>
            <select name="semestre" required className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <option key={s} value={s}>{s}° (grado {gradoDeSemestre(s)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Desde</label>
            <input name="desde" type="number" min={1} max={99} defaultValue={1} className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Hasta</label>
            <input name="hasta" type="number" min={1} max={99} defaultValue={7} className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Turno</label>
            <select name="turno" className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="matutino">Matutino</option>
              <option value="vespertino">Vespertino</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mb-2">
            <input type="checkbox" name="auto_asignaciones" value="1" defaultChecked />
            <span className="text-xs">Sembrar materias</span>
          </label>
          <button className="md:col-span-6 bg-verde hover:bg-verde-oscuro text-white rounded-lg px-4 py-2.5 font-semibold transition">
            🚀 Crear grupos
          </button>
        </form>
      </Card>

      {/* ─────────── Grupos agrupados por ciclo ─────────── */}
      {Array.from(byCiclo.entries()).map(([ck, { ciclo, ciclo_id, grupos }]) => {
        const porSemestre = new Map<number, any[]>();
        for (const g of grupos) {
          if (!porSemestre.has(g.semestre)) porSemestre.set(g.semestre, []);
          porSemestre.get(g.semestre)!.push(g);
        }
        const semsOrdenados = Array.from(porSemestre.keys()).sort((a, b) => a - b);

        return (
          <Card
            key={ck}
            eyebrow="Ciclo"
            title={`${ciclo?.codigo ?? ''} ${ciclo?.periodo ?? ''}${ciclo?.activo ? ' · activo' : ''}`}
          >
            {semsOrdenados.length === 0 && <EmptyState icon="📚" title="Aún no hay grupos" />}
            {semsOrdenados.map((sem) => (
              <div key={sem} className="mb-5 last:mb-0">
                <div className="text-[11px] uppercase tracking-[0.3em] text-gray-500 font-semibold mb-2">
                  {sem}° semestre · grado {gradoDeSemestre(sem)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {porSemestre.get(sem)!.map((g: any) => (
                    <div key={g.id} className="bg-white/80 backdrop-blur border border-gray-200 rounded-xl p-4 hover:border-verde transition">
                      <div className="flex items-baseline justify-between">
                        <div className="font-serif text-2xl text-verde-oscuro tabular-nums">
                          {codigoGrupo(g.grado, g.grupo)}
                        </div>
                        <Badge tone={g.turno === 'matutino' ? 'azul' : 'dorado'} size="sm">{g.turno}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-600">
                        <span>👥 {g.nAlumnos}</span>
                        <span>📚 {g.nAsigs}</span>
                      </div>
                      <div className="mt-2 text-[11px] text-gray-600 border-t border-gray-100 pt-2">
                        <div className="flex items-center gap-1">
                          <span>🎓</span>
                          <span className="font-medium">
                            {g.orientador
                              ? `${g.orientador.apellido_paterno} ${g.orientador.nombre?.[0]}.`
                              : <span className="text-gray-400">Sin orientador</span>}
                          </span>
                        </div>
                        <form action={asignarOrientador} className="mt-1 flex gap-1">
                          <input type="hidden" name="grupo_id" value={g.id} />
                          <select name="profesor_id" defaultValue={g.orientador_id ?? ''} className="text-[10px] border rounded px-1 py-0.5 flex-1 min-w-0">
                            <option value="">— sin orientador —</option>
                            {(profes ?? []).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.apellido_paterno} {p.nombre}</option>
                            ))}
                          </select>
                          <button className="text-[10px] bg-verde text-white px-1.5 rounded hover:bg-verde-medio">✓</button>
                        </form>
                      </div>
                      {g.nAsigs === 0 && (
                        <form action={sembrarAsignaciones} className="mt-2">
                          <input type="hidden" name="grupo_id" value={g.id} />
                          <button className="text-[11px] text-verde hover:underline">Sembrar materias →</button>
                        </form>
                      )}
                      {g.nAlumnos > 0 && (
                        <a href={`/admin/grupos/${g.id}/boletas`} className="block mt-1 text-[11px] text-verde hover:underline">
                          📄 Boletas del grupo →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        );
      })}

      {/* ─────────── Promoción de grupo (avanza de semestre/ciclo) ─────────── */}
      <Card
        eyebrow="Fin de ciclo"
        title="Promover grupo al siguiente semestre / ciclo"
      >
        <p className="text-xs text-gray-500 mb-4">
          Toma a todos los alumnos activos del <b>grupo origen</b> y los inscribe en el <b>grupo destino</b>.
          Si hay repetidores, lista sus matrículas separadas por coma — esos se quedan en su mismo semestre.
        </p>
        <form action={promoverGrupo} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm items-end">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Grupo origen (ciclo anterior)</label>
            <select name="grupo_origen_id" required className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Seleccionar…</option>
              {enriched.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {codigoGrupo(g.grado, g.grupo)} · {labelGrupo(g)} · {g.ciclo?.codigo} {g.ciclo?.periodo} ({g.nAlumnos} al.)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Grupo destino (ciclo nuevo, semestre siguiente)</label>
            <select name="grupo_destino_id" required className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Seleccionar…</option>
              {enriched.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {codigoGrupo(g.grado, g.grupo)} · {labelGrupo(g)} · {g.ciclo?.codigo} {g.ciclo?.periodo}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Repetidores (IDs de alumno separados por coma, opcional)</label>
            <input name="repetidores" placeholder="uuid1, uuid2, …" className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs" />
          </div>
          <button className="md:col-span-2 bg-dorado text-verde-oscuro font-bold rounded-lg px-4 py-2.5 hover:bg-dorado-claro transition">
            ⇧ Promover grupo
          </button>
        </form>
      </Card>

      {/* ─────────── Cambio de grupo individual ─────────── */}
      <Card
        eyebrow="Movimiento individual"
        title="Cambiar a un alumno de grupo"
      >
        <form action={cambiarAlumnoDeGrupo} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm items-end">
          <div className="md:col-span-2">
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Alumno</label>
            <select name="alumno_id" required className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Seleccionar alumno…</option>
              {(alumnos ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.apellido_paterno} {a.nombre} {a.matricula ? `· ${a.matricula}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Nuevo grupo</label>
            <select name="grupo_id" required className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Grupo destino…</option>
              {enriched
                .filter((g: any) => g.ciclo?.activo)
                .map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {codigoGrupo(g.grado, g.grupo)} · {g.semestre}° sem · {g.turno}
                  </option>
                ))}
            </select>
          </div>
          <button className="md:col-span-3 bg-verde text-white rounded-lg px-4 py-2.5 font-semibold hover:bg-verde-oscuro transition">
            Mover alumno
          </button>
        </form>
      </Card>

      {/* ─────────── Crear asignación suelta ─────────── */}
      <Card
        eyebrow="Ajuste fino"
        title="Asignar una materia puntual a un grupo"
      >
        <form action={crearAsignacion} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm items-end">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Materia</label>
            <select name="materia_id" required className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Materia…</option>
              {(materias ?? []).map((m: any) => (
                <option key={m.id} value={m.id}>{m.semestre}° · {m.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Grupo</label>
            <select name="grupo_id" required className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Grupo…</option>
              {enriched.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {codigoGrupo(g.grado, g.grupo)} · {g.semestre}° · {g.ciclo?.codigo}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-gray-500">Profesor</label>
            <select name="profesor_id" className="mt-1 w-full bg-white/80 border border-gray-200 rounded-lg px-3 py-2">
              <option value="">Sin asignar</option>
              {(profes ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellido_paterno}</option>
              ))}
            </select>
          </div>
          <button className="bg-verde text-white rounded-lg px-4 py-2.5 font-semibold hover:bg-verde-oscuro transition">
            Crear asignación
          </button>
        </form>
      </Card>
    </div>
  );
}
