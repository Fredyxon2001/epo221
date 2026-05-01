// ORIENTADOR: bandeja de propuestas de calificaciones por validar
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState, Badge } from '@/components/privado/ui';
import { AccionPropuestaForm } from './AccionPropuestaForm';

export default async function OrientadorCalificaciones({ searchParams }: { searchParams?: { estado?: string; grupo_id?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  if (!prof) return <div className="p-5">No eres docente.</div>;

  // Grupos que orienta
  const { data: misGrupos } = await supabase
    .from('grupos').select('id, grado, semestre, grupo, turno').eq('orientador_id', prof.id).is('deleted_at', null);
  if (!misGrupos || misGrupos.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Orientación" title="📝 Calificaciones a validar" />
        <Card><EmptyState icon="🧭" title="No eres orientador" description="Esta vista es para docentes asignados como orientadores de grupo." /></Card>
      </div>
    );
  }

  const grupoIds = misGrupos.map((g) => g.id);
  // Asignaciones de mis grupos
  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('id, grupo_id, materia:materias(nombre), profesor:profesores(nombre, apellido_paterno)')
    .in('grupo_id', grupoIds);
  const asigIds = (asigs ?? []).map((a) => a.id);

  const filtroEstado = searchParams?.estado ?? 'pendiente';
  const filtroGrupo = searchParams?.grupo_id ?? '';

  let q = supabase
    .from('calificaciones_propuestas')
    .select('*, alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula), asignacion:asignaciones(id, grupo_id, materia:materias(nombre), profesor:profesores(nombre, apellido_paterno))')
    .in('asignacion_id', asigIds.length ? asigIds : ['00000000-0000-0000-0000-000000000000'])
    .order('propuesta_at', { ascending: false });
  if (filtroEstado !== 'todas') q = q.eq('estado', filtroEstado);

  const { data: propuestas } = await q;
  let filas = propuestas ?? [];
  if (filtroGrupo) filas = filas.filter((p: any) => p.asignacion?.grupo_id === filtroGrupo);

  const counts = { pendiente: 0, validada: 0, rechazada: 0 };
  for (const p of (propuestas ?? [])) (counts as any)[p.estado]++;

  const estados = ['pendiente', 'validada', 'rechazada', 'todas'] as const;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Orientación · Captura de calificaciones"
        title="📝 Calificaciones por validar"
        description="Revisa las calificaciones que los maestros de tus grupos han enviado. Al validar se aplican al expediente del alumno."
      />

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div className="text-xs text-gray-500 uppercase">Pendientes</div>
          <div className="text-3xl font-bold text-amber-700 tabular-nums">{counts.pendiente}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 uppercase">Validadas</div>
          <div className="text-3xl font-bold text-verde-oscuro tabular-nums">{counts.validada}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 uppercase">Rechazadas</div>
          <div className="text-3xl font-bold text-rose-700 tabular-nums">{counts.rechazada}</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <span className="text-xs text-gray-500 mr-2">Estado:</span>
          {estados.map((e) => (
            <a key={e} href={`/profesor/orientacion/calificaciones?estado=${e}${filtroGrupo ? `&grupo_id=${filtroGrupo}` : ''}`}
              className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${filtroEstado === e ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
              {e}
            </a>
          ))}
          <span className="text-xs text-gray-500 mr-2 ml-4">Grupo:</span>
          <a href={`/profesor/orientacion/calificaciones?estado=${filtroEstado}`}
            className={`text-xs px-3 py-1 rounded-full font-semibold ${!filtroGrupo ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
            Todos
          </a>
          {misGrupos.map((g) => (
            <a key={g.id} href={`/profesor/orientacion/calificaciones?estado=${filtroEstado}&grupo_id=${g.id}`}
              className={`text-xs px-3 py-1 rounded-full font-semibold ${filtroGrupo === g.id ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
              {g.grado}°{String.fromCharCode(64 + (g.grupo ?? 1))} {g.turno}
            </a>
          ))}
        </div>

        {filas.length === 0 ? (
          <EmptyState icon="🎉" title="Sin propuestas" description="No hay propuestas pendientes que coincidan con el filtro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-2 py-2">Alumno</th>
                  <th className="px-2 py-2">Materia</th>
                  <th className="px-2 py-2">Maestro</th>
                  <th className="px-2 py-2 text-center">Parcial</th>
                  <th className="px-2 py-2 text-center">Calif.</th>
                  <th className="px-2 py-2 text-center">Faltas</th>
                  <th className="px-2 py-2">Observación</th>
                  <th className="px-2 py-2">Estado</th>
                  <th className="px-2 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((p: any) => {
                  const al = p.alumno;
                  const nombre = al ? `${al.nombre} ${al.apellido_paterno ?? ''} ${al.apellido_materno ?? ''}`.trim() : '—';
                  const maestro = p.asignacion?.profesor
                    ? `${p.asignacion.profesor.nombre} ${p.asignacion.profesor.apellido_paterno ?? ''}`.trim() : '—';
                  return (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-2 py-2">
                        <div className="font-semibold">{nombre}</div>
                        <div className="text-[10px] text-gray-500">{al?.matricula ?? '—'}</div>
                      </td>
                      <td className="px-2 py-2">{p.asignacion?.materia?.nombre}</td>
                      <td className="px-2 py-2 text-gray-600">{maestro}</td>
                      <td className="px-2 py-2 text-center">{p.parcial}</td>
                      <td className="px-2 py-2 text-center font-semibold tabular-nums">
                        <span className={p.calificacion != null && Number(p.calificacion) < 6 ? 'text-rose-700' : 'text-verde-oscuro'}>
                          {p.calificacion ?? '—'}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">{p.faltas ?? 0}</td>
                      <td className="px-2 py-2 max-w-[200px] truncate" title={p.observaciones ?? ''}>{p.observaciones ?? ''}</td>
                      <td className="px-2 py-2">
                        <Badge tone={p.estado === 'validada' ? 'verde' : p.estado === 'rechazada' ? 'rosa' : 'ambar'} size="sm">
                          {p.estado}
                        </Badge>
                      </td>
                      <td className="px-2 py-2">
                        {p.estado === 'pendiente' ? (
                          <AccionPropuestaForm id={p.id} />
                        ) : (
                          <span className="text-[10px] text-gray-400">{p.motivo_rechazo ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
