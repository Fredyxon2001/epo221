import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';
import { AgendarCitaForm } from './AgendarCitaForm';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default async function TutoriasAlumno() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Docentes que imparten en el grupo del alumno
  const { data: insc } = await supabase.from('inscripciones').select('grupo_id').eq('alumno_id', alumno.id);
  const gids = (insc ?? []).map((i: any) => i.grupo_id);
  const { data: asigs } = gids.length
    ? await supabase.from('asignaciones')
        .select('profesor:profesores(id, perfil:perfiles(nombre)), materia:materias(nombre)')
        .in('grupo_id', gids).eq('ciclo_id', ciclo?.id ?? '')
    : { data: [] as any[] };

  // dedupe por profesor
  const profesMap = new Map<string, any>();
  for (const a of asigs ?? []) {
    const p = (a as any).profesor;
    if (p?.id && !profesMap.has(p.id)) profesMap.set(p.id, { ...p, materias: [] });
    if (p?.id) profesMap.get(p.id).materias.push((a as any).materia?.nombre);
  }
  const docentes = Array.from(profesMap.values());
  const profIds = docentes.map((d) => d.id);

  const { data: horarios } = profIds.length
    ? await supabase.from('tutorias_horarios').select('*').in('profesor_id', profIds)
    : { data: [] as any[] };
  const hPorProf = new Map<string, any[]>();
  for (const h of horarios ?? []) {
    const arr = hPorProf.get((h as any).profesor_id) ?? [];
    arr.push(h); hPorProf.set((h as any).profesor_id, arr);
  }

  const { data: misCitas } = await supabase.from('tutorias_citas')
    .select('*, profesor:profesores(perfil:perfiles(nombre))')
    .eq('alumno_id', alumno.id).order('fecha', { ascending: false });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Acompañamiento"
        title="🗓️ Tutorías"
        description="Agenda tiempo con tus docentes para asesoría académica o personal."
      />

      <Card eyebrow={`Mis citas (${misCitas?.length ?? 0})`} title="Historial">
        {(misCitas ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Aún no has solicitado tutorías.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {misCitas!.map((c: any) => (
              <div key={c.id} className="py-2 flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold">Prof. {c.profesor?.perfil?.nombre ?? '—'}</div>
                  <div className="text-xs text-gray-600">{new Date(c.fecha).toLocaleString('es-MX')} · {c.duracion_min} min · {c.modalidad}</div>
                  <p className="text-xs text-gray-700 italic">"{c.motivo}"</p>
                  {c.notas_profesor && <p className="text-xs text-gray-700 mt-1 bg-gray-50 rounded p-2">💬 {c.notas_profesor}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  c.estado === 'solicitada' ? 'bg-amber-100 text-amber-800' :
                  c.estado === 'confirmada' ? 'bg-verde-claro/40 text-verde-oscuro' :
                  c.estado === 'realizada' ? 'bg-sky-100 text-sky-700' :
                  'bg-rose-100 text-rose-700'
                }`}>{c.estado}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card eyebrow="Docentes disponibles" title="Solicitar una cita">
        {docentes.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Sin docentes asignados.</p>
        ) : (
          <div className="space-y-3">
            {docentes.map((d) => (
              <div key={d.id} className="border rounded-lg p-3">
                <div className="font-semibold text-sm">Prof. {d.perfil?.nombre ?? '—'}</div>
                <div className="text-xs text-gray-500">{d.materias.filter(Boolean).join(', ')}</div>
                {(hPorProf.get(d.id) ?? []).length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    <strong>Disponibilidad:</strong>{' '}
                    {(hPorProf.get(d.id) ?? []).map((h: any, i: number) => (
                      <span key={h.id}>
                        {i > 0 && ' · '}{DIAS[h.dia_semana]} {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)} ({h.modalidad})
                      </span>
                    ))}
                  </div>
                )}
                <AgendarCitaForm profesorId={d.id} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
