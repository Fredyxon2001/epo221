// Consultas tipadas al lado servidor. Centralizado para reutilizar.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export async function getAlumnoActual() {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  // Usa adminClient para evitar fallos de RLS/cookies
  const admin = adminClient();
  const { data: alumno } = await admin
    .from('alumnos').select('*').eq('perfil_id', user.id).maybeSingle();
  return alumno;
}

/** Devuelve el profesor (id) del user autenticado, usando adminClient (bypass RLS). */
export async function getProfesorActualId(): Promise<string | null> {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const admin = adminClient();
  const { data } = await admin.from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();
  return (data as any)?.id ?? null;
}

export async function getEvaluacionGeneral(alumnoId: string) {
  const auth = createClient();
  const supabase = adminClient();
  const { data } = await supabase
    .from('vista_evaluacion_general').select('*').eq('alumno_id', alumnoId).maybeSingle();
  return data;
}

export async function getPromediosPorSemestre(alumnoId: string) {
  const auth = createClient();
  const supabase = adminClient();
  const { data } = await supabase
    .from('vista_promedios_semestre').select('*')
    .eq('alumno_id', alumnoId)
    .order('grado').order('semestre');
  return data ?? [];
}

export async function getPromediosAnuales(alumnoId: string) {
  const auth = createClient();
  const supabase = adminClient();
  const { data } = await supabase
    .from('vista_promedios_anuales').select('*')
    .eq('alumno_id', alumnoId).order('anio');
  return data ?? [];
}

export async function getHistorialAcademico(alumnoId: string) {
  const auth = createClient();
  const supabase = adminClient();
  const { data } = await supabase
    .from('vista_historial_academico').select('*')
    .eq('alumno_id', alumnoId)
    .order('ciclo', { ascending: false })
    .order('semestre').order('materia');
  return data ?? [];
}

export async function getEstadoCuenta(alumnoId: string) {
  const auth = createClient();
  const supabase = adminClient();
  const { data } = await supabase
    .from('vista_estado_cuenta').select('*')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false });
  return data ?? [];
}
