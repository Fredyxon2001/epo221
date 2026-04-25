// Captura rápida de asistencia por día. Un clic por alumno.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import Link from 'next/link';
import { guardarAsistencia } from './actions';

export default async function AsistenciaGrupo({
  params, searchParams,
}: {
  params: { asignacionId: string };
  searchParams: { fecha?: string; ok?: string; error?: string };
}) {
  const supabase = createClient();
  const fecha = searchParams.fecha || new Date().toISOString().slice(0, 10);

  const { data: asig } = await supabase
    .from('asignaciones')
    .select('id, grupo_id, ciclo_id, materia:materias(nombre), grupo:grupos(semestre, grupo, turno)')
    .eq('id', params.asignacionId).single();

  if (!asig) return <EmptyState icon="🔍" title="Asignación no encontrada" />;

  const { data: inscritos } = await supabase
    .from('inscripciones')
    .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)')
    .eq('grupo_id', (asig as any).grupo_id)
    .eq('ciclo_id', (asig as any).ciclo_id)
    .eq('estatus', 'activa');

  const alumnos = ((inscritos ?? []) as any[])
    .map((i) => i.alumno)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.apellido_paterno ?? '').localeCompare(b.apellido_paterno ?? ''));

  const { data: registros } = await supabase
    .from('asistencias').select('alumno_id, estado')
    .eq('asignacion_id', params.asignacionId).eq('fecha', fecha);
  const mapa = new Map((registros ?? []).map((r: any) => [r.alumno_id, r.estado]));

  const m = asig as any;
  const estados = [
    { k: 'presente',    label: 'P', tone: 'bg-verde text-white' },
    { k: 'retardo',     label: 'R', tone: 'bg-amber-500 text-white' },
    { k: 'justificada', label: 'J', tone: 'bg-sky-500 text-white' },
    { k: 'falta',       label: 'F', tone: 'bg-rose-500 text-white' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asistencia"
        title={m?.materia?.nombre}
        description={`${m?.grupo?.semestre}° semestre · ${m?.grupo?.turno}`}
        actions={<Link href={`/profesor/grupo/${params.asignacionId}`} className="text-xs text-verde font-semibold hover:underline px-3 py-1">← Volver</Link>}
      />

      {searchParams.ok && <div className="rounded-lg bg-verde-claro/30 border border-verde/30 px-4 py-2 text-sm text-verde-oscuro">✓ {decodeURIComponent(searchParams.ok)}</div>}

      <Card eyebrow="Día" title="Selecciona la fecha">
        <form className="flex flex-wrap gap-3 items-center">
          <input type="date" name="fecha" defaultValue={fecha} className="border rounded px-2 py-1 text-sm" />
          <button className="bg-verde text-white rounded px-3 py-1 text-sm hover:bg-verde-medio">Ver</button>
        </form>
      </Card>

      <Card eyebrow="Lista" title={`${alumnos.length} alumnos`}>
        {alumnos.length === 0 ? (
          <EmptyState icon="📭" title="Sin alumnos" />
        ) : (
          <form action={guardarAsistencia} className="space-y-2">
            <input type="hidden" name="asignacion_id" value={params.asignacionId} />
            <input type="hidden" name="fecha" value={fecha} />
            {alumnos.map((a: any, idx: number) => {
              const actual = mapa.get(a.id) ?? 'presente';
              return (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-white/70">
                  <span className="text-[11px] text-gray-400 w-6 tabular-nums">{idx + 1}</span>
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium truncate">{a.apellido_paterno} {a.apellido_materno ?? ''} {a.nombre}</div>
                    <div className="text-[10px] text-gray-500">{a.matricula ?? '—'}</div>
                  </div>
                  <div className="flex gap-1">
                    {estados.map((e) => (
                      <label key={e.k} className={`cursor-pointer w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition ${actual === e.k ? `${e.tone} shadow-md scale-105` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        <input type="radio" name={`estado_${a.id}`} value={e.k} defaultChecked={actual === e.k} className="sr-only" />
                        {e.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="pt-3 flex justify-between items-center text-xs text-gray-500">
              <span>P: Presente · R: Retardo · J: Justificada · F: Falta</span>
              <button className="bg-gradient-to-r from-verde to-verde-medio text-white rounded-xl px-5 py-2 font-semibold shadow-lg shadow-verde/30">
                💾 Guardar asistencia
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
