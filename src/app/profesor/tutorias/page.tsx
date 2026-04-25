import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { NuevoHorarioForm } from './NuevoHorarioForm';
import { EliminarHorarioBtn } from './EliminarHorarioBtn';
import { ProcesarCitaForm } from './ProcesarCitaForm';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default async function TutoriasProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  const { data: horarios } = await supabase.from('tutorias_horarios')
    .select('*').eq('profesor_id', prof?.id ?? '').order('dia_semana').order('hora_inicio');

  const { data: citas } = await supabase.from('tutorias_citas')
    .select('*, alumno:alumnos(nombre, apellido_paterno, apellido_materno, matricula)')
    .eq('profesor_id', prof?.id ?? '').order('fecha', { ascending: false });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Acompañamiento"
        title="🗓️ Mis tutorías"
        description="Publica tus horarios disponibles y gestiona las citas que solicitan alumnos y tutores."
      />

      <Card eyebrow="Mis horarios" title="Disponibilidad semanal">
        <NuevoHorarioForm />
        {(horarios ?? []).length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {horarios!.map((h: any) => (
              <div key={h.id} className="flex justify-between items-center border rounded-lg p-2 text-sm">
                <div>
                  <strong>{DIAS[h.dia_semana]}</strong> · {h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)} · {h.modalidad}
                  {h.lugar && <span className="text-gray-500"> · {h.lugar}</span>}
                </div>
                <EliminarHorarioBtn id={h.id} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card eyebrow={`Citas (${citas?.length ?? 0})`} title="Solicitudes y agenda">
        {(citas ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Aún no hay citas.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {citas!.map((c: any) => (
              <div key={c.id} className="py-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">
                      {c.alumno ? `${c.alumno.apellido_paterno} ${c.alumno.nombre}` : (c.tutor_contacto ?? 'Contacto externo')}
                      {c.alumno?.matricula && <span className="text-xs text-gray-500"> · {c.alumno.matricula}</span>}
                    </div>
                    <div className="text-xs text-gray-600">
                      📅 {new Date(c.fecha).toLocaleString('es-MX')} · {c.duracion_min} min · {c.modalidad} · {c.solicitante_tipo}
                    </div>
                    <p className="text-xs text-gray-700 mt-1 italic">"{c.motivo}"</p>
                    {c.notas_profesor && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded p-2">💬 {c.notas_profesor}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${
                    c.estado === 'solicitada' ? 'bg-amber-100 text-amber-800' :
                    c.estado === 'confirmada' ? 'bg-verde-claro/40 text-verde-oscuro' :
                    c.estado === 'realizada' ? 'bg-sky-100 text-sky-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>{c.estado}</span>
                </div>
                <ProcesarCitaForm cita={c} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
