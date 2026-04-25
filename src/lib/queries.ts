// Consultas tipadas al lado servidor. Centralizado para reutilizar.
import { createClient } from '@/lib/supabase/server';

export async function getAlumnoActual() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: alumno } = await supabase
    .from('alumnos').select('*').eq('perfil_id', user.id).single();
  return alumno;
}

export async function getEvaluacionGeneral(alumnoId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('vista_evaluacion_general').select('*').eq('alumno_id', alumnoId).single();
  return data;
}

export async function getPromediosPorSemestre(alumnoId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('vista_promedios_semestre').select('*')
    .eq('alumno_id', alumnoId)
    .order('grado').order('semestre');
  return data ?? [];
}

export async function getPromediosAnuales(alumnoId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('vista_promedios_anuales').select('*')
    .eq('alumno_id', alumnoId).order('anio');
  return data ?? [];
}

export async function getHistorialAcademico(alumnoId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('vista_historial_academico').select('*')
    .eq('alumno_id', alumnoId)
    .order('ciclo', { ascending: false })
    .order('semestre').order('materia');
  return data ?? [];
}

export async function getEstadoCuenta(alumnoId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('vista_estado_cuenta').select('*')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false });
  return data ?? [];
}
