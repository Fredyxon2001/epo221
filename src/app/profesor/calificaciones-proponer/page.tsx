// MAESTRO: propone calificaciones por parcial; el orientador del grupo las valida
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, EmptyState } from '@/components/privado/ui';
import { ProponerCalificacionesForm } from './ProponerCalificacionesForm';

export default async function ProponerCalificacionesPage({ searchParams }: { searchParams?: { asignacion_id?: string; parcial?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  if (!prof) return <div className="p-5">No eres docente.</div>;

  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno, orientador:profesores(nombre, apellido_paterno))')
    .eq('profesor_id', prof.id);

  const asignacion_id = searchParams?.asignacion_id ?? (asigs?.[0]?.id ?? '');
  const parcial = Number(searchParams?.parcial ?? 1);

  let alumnos: any[] = [];
  let propuestasRecientes: any[] = [];
  let asigSeleccionada: any = null;
  if (asignacion_id) {
    asigSeleccionada = (asigs ?? []).find((a: any) => a.id === asignacion_id);
    if (asigSeleccionada?.grupo) {
      const grupoId = (asigs ?? []).find((a: any) => a.id === asignacion_id);
      // Obtener inscripciones del grupo de la asignación
      const { data: asig } = await supabase.from('asignaciones').select('grupo_id').eq('id', asignacion_id).maybeSingle();
      if (asig?.grupo_id) {
        const { data: insc } = await supabase
          .from('inscripciones')
          .select('alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula)')
          .eq('grupo_id', asig.grupo_id)
          .eq('estatus', 'activa');
        alumnos = (insc ?? []).map((i: any) => i.alumno).filter(Boolean);
      }
    }
    // Propuestas previas
    const { data: prev } = await supabase
      .from('calificaciones_propuestas')
      .select('id, alumno_id, parcial, calificacion, faltas, estado, motivo_rechazo, validada_at')
      .eq('asignacion_id', asignacion_id)
      .order('propuesta_at', { ascending: false })
      .limit(50);
    propuestasRecientes = prev ?? [];
  }

  const orientNombre = asigSeleccionada?.grupo?.orientador
    ? `${asigSeleccionada.grupo.orientador.nombre ?? ''} ${asigSeleccionada.grupo.orientador.apellido_paterno ?? ''}`.trim()
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Captura de calificaciones"
        title="📤 Enviar calificaciones al orientador"
        description="Como maestro, propones las calificaciones del parcial. El orientador del grupo las valida y se aplican al expediente del alumno."
      />

      <Card>
        <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="block">
            <span className="text-xs text-gray-600">Asignación</span>
            <select name="asignacion_id" defaultValue={asignacion_id} className="mt-1 w-full border rounded-lg px-3 py-2">
              {(asigs ?? []).map((a: any) => {
                const g = a.grupo;
                const grupo = g ? `${g.grado}°${String.fromCharCode(64 + (g.grupo ?? 1))} (${g.turno ?? ''})` : '—';
                return <option key={a.id} value={a.id}>{a.materia?.nombre} · {grupo}</option>;
              })}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Parcial</span>
            <select name="parcial" defaultValue={String(parcial)} className="mt-1 w-full border rounded-lg px-3 py-2">
              <option value="1">Parcial 1</option>
              <option value="2">Parcial 2</option>
              <option value="3">Parcial 3</option>
            </select>
          </label>
          <div className="flex items-end">
            <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded-lg w-full">Cargar grupo</button>
          </div>
        </form>

        {orientNombre && (
          <div className="mt-3 text-xs text-gray-600 bg-amber-50 border-l-2 border-amber-400 p-2 rounded">
            🧭 Orientador del grupo: <strong>{orientNombre}</strong> · será quien valide las calificaciones que envíes.
          </div>
        )}
      </Card>

      {alumnos.length === 0 ? (
        <Card>
          <EmptyState icon="📋" title="Sin alumnos inscritos" description="Selecciona otra asignación o verifica con admin las inscripciones." />
        </Card>
      ) : (
        <Card eyebrow={`Parcial ${parcial}`} title={`Propón calificaciones (${alumnos.length} alumnos)`}>
          <ProponerCalificacionesForm
            asignacionId={asignacion_id}
            parcial={parcial}
            alumnos={alumnos}
            propuestasPrevias={propuestasRecientes}
          />
        </Card>
      )}

      {propuestasRecientes.length > 0 && (
        <Card eyebrow="Bitácora" title="Últimas propuestas enviadas">
          <div className="text-xs">
            <table className="w-full">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-2 py-1">Alumno</th>
                  <th className="px-2 py-1 text-center">Parcial</th>
                  <th className="px-2 py-1 text-center">Cal.</th>
                  <th className="px-2 py-1 text-center">Faltas</th>
                  <th className="px-2 py-1">Estado</th>
                  <th className="px-2 py-1">Observación</th>
                </tr>
              </thead>
              <tbody>
                {propuestasRecientes.slice(0, 20).map((p: any) => {
                  const alumno = alumnos.find((a) => a.id === p.alumno_id);
                  return (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-2 py-1">{alumno ? `${alumno.nombre} ${alumno.apellido_paterno}` : p.alumno_id.slice(0, 8)}</td>
                      <td className="px-2 py-1 text-center">{p.parcial}</td>
                      <td className="px-2 py-1 text-center">{p.calificacion ?? '—'}</td>
                      <td className="px-2 py-1 text-center">{p.faltas ?? 0}</td>
                      <td className="px-2 py-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                          p.estado === 'validada' ? 'bg-verde-claro/30 text-verde-oscuro'
                          : p.estado === 'rechazada' ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                        }`}>{p.estado}</span>
                      </td>
                      <td className="px-2 py-1 text-rose-700">{p.motivo_rechazo ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
