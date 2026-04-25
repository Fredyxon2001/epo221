'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { gradoDeSemestre, siguienteSemestre } from '@/lib/grupos';

// ───────────────────────── Crear 1 grupo suelto ─────────────────────────
export async function crearGrupo(formData: FormData): Promise<void> {
  const supabase = createClient();
  const semestre = Number(formData.get('semestre'));
  const grupo = Number(formData.get('grupo'));
  const grado = gradoDeSemestre(semestre);

  const { error } = await supabase.from('grupos').insert({
    ciclo_id: String(formData.get('ciclo_id')),
    grado,
    semestre,
    grupo,
    turno: String(formData.get('turno') || 'matutino'),
  });

  if (error) {
    redirect(`/admin/grupos?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/admin/grupos');
  redirect('/admin/grupos?ok=Grupo+creado');
}

// ──────────────── Crear MÚLTIPLES grupos por semestre (bulk) ────────────────
export async function crearGruposBulk(formData: FormData): Promise<void> {
  const supabase = createClient();

  const cicloId = String(formData.get('ciclo_id'));
  const semestre = Number(formData.get('semestre'));
  const turno = String(formData.get('turno') || 'matutino');
  const desde = Number(formData.get('desde') || 1);
  const hasta = Number(formData.get('hasta') || 7);
  const autoAsignar = String(formData.get('auto_asignaciones') || '') === '1';

  if (!cicloId || !semestre || desde < 1 || hasta < desde) {
    redirect('/admin/grupos?error=Par%C3%A1metros+inv%C3%A1lidos');
  }

  const grado = gradoDeSemestre(semestre);

  const rows = [];
  for (let n = desde; n <= hasta; n++) {
    rows.push({ ciclo_id: cicloId, grado, semestre, grupo: n, turno });
  }

  // upsert para tolerar grupos que ya existen en ese ciclo
  const { data: creados, error } = await supabase
    .from('grupos')
    .upsert(rows, { onConflict: 'ciclo_id,semestre,grupo,turno', ignoreDuplicates: true })
    .select('id, grupo');

  if (error) redirect(`/admin/grupos?error=${encodeURIComponent(error.message)}`);

  // Auto-crear asignaciones con TODAS las materias activas de ese semestre
  if (autoAsignar) {
    const { data: materias } = await supabase
      .from('materias').select('id').eq('semestre', semestre).eq('activo', true);

    // Necesitamos los ids de los grupos que quedaron (creados + existentes)
    const { data: gruposTodos } = await supabase
      .from('grupos').select('id, grupo')
      .eq('ciclo_id', cicloId).eq('semestre', semestre).eq('turno', turno)
      .gte('grupo', desde).lte('grupo', hasta);

    if (materias?.length && gruposTodos?.length) {
      const asigs: any[] = [];
      for (const g of gruposTodos) {
        for (const m of materias) {
          asigs.push({ ciclo_id: cicloId, grupo_id: g.id, materia_id: m.id });
        }
      }
      // upsert evita duplicados si ya existían
      await supabase.from('asignaciones').upsert(asigs, { ignoreDuplicates: true });
    }
  }

  revalidatePath('/admin/grupos');
  revalidatePath('/admin/asignaciones');
  const n = creados?.length ?? 0;
  redirect(`/admin/grupos?ok=${encodeURIComponent(`${n} grupos creados`)}`);
}

// ──────────────── Crear asignación suelta (materia → grupo) ────────────────
export async function crearAsignacion(formData: FormData): Promise<void> {
  const supabase = createClient();
  const grupoId = String(formData.get('grupo_id'));
  const { data: grupo } = await supabase
    .from('grupos').select('ciclo_id').eq('id', grupoId).single();

  await supabase.from('asignaciones').insert({
    materia_id: String(formData.get('materia_id')),
    grupo_id: grupoId,
    profesor_id: String(formData.get('profesor_id') ?? '') || null,
    ciclo_id: grupo?.ciclo_id,
  });
  revalidatePath('/admin/grupos');
  redirect('/admin/grupos?ok=Asignaci%C3%B3n+creada');
}

// ──────────────── Sembrar asignaciones a un grupo existente ────────────────
// Toma TODAS las materias activas del semestre y las asigna al grupo
// (idempotente — no duplica).
export async function sembrarAsignaciones(formData: FormData): Promise<void> {
  const supabase = createClient();
  const grupoId = String(formData.get('grupo_id'));

  const { data: grupo } = await supabase
    .from('grupos').select('id, ciclo_id, semestre').eq('id', grupoId).single();
  if (!grupo) redirect('/admin/grupos?error=Grupo+no+encontrado');

  const { data: materias } = await supabase
    .from('materias').select('id').eq('semestre', grupo!.semestre).eq('activo', true);

  const rows = (materias ?? []).map((m) => ({
    ciclo_id: grupo!.ciclo_id,
    grupo_id: grupo!.id,
    materia_id: m.id,
  }));

  if (rows.length) {
    await supabase.from('asignaciones').upsert(rows, { ignoreDuplicates: true });
  }

  revalidatePath('/admin/grupos');
  revalidatePath('/admin/asignaciones');
  redirect(`/admin/grupos?ok=${encodeURIComponent(`${rows.length} materias sembradas`)}`);
}

// ──────────────────────── Cambiar alumno de grupo ────────────────────────
// Útil cuando se mueve dentro del mismo ciclo (mismo semestre u otro).
export async function cambiarAlumnoDeGrupo(formData: FormData): Promise<void> {
  const supabase = createClient();
  const alumnoId = String(formData.get('alumno_id'));
  const nuevoGrupoId = String(formData.get('grupo_id'));
  if (!alumnoId || !nuevoGrupoId) redirect('/admin/grupos?error=Faltan+datos');

  const { data: nuevo } = await supabase
    .from('grupos').select('ciclo_id').eq('id', nuevoGrupoId).single();
  if (!nuevo) redirect('/admin/grupos?error=Grupo+destino+inv%C3%A1lido');

  // Cerrar inscripciones activas del alumno en este ciclo
  await supabase
    .from('inscripciones')
    .update({ estatus: 'cambio_grupo' })
    .eq('alumno_id', alumnoId)
    .eq('ciclo_id', nuevo!.ciclo_id)
    .eq('estatus', 'activa');

  // Abrir la nueva
  await supabase.from('inscripciones').insert({
    alumno_id: alumnoId,
    grupo_id: nuevoGrupoId,
    ciclo_id: nuevo!.ciclo_id,
    estatus: 'activa',
  });

  revalidatePath('/admin/grupos');
  revalidatePath('/admin/alumnos');
  redirect('/admin/grupos?ok=Alumno+movido');
}

// ──────────────── Promover alumnos a siguiente semestre/ciclo ────────────────
// origen: grupo del ciclo anterior; destino: grupo del ciclo nuevo.
// Si 'repetidores' contiene ids de alumnos, NO los promueve (quedan en mismo sem).
export async function promoverGrupo(formData: FormData): Promise<void> {
  const supabase = createClient();
  const grupoOrigenId = String(formData.get('grupo_origen_id'));
  const grupoDestinoId = String(formData.get('grupo_destino_id'));
  const repetidoresRaw = String(formData.get('repetidores') ?? '');
  const repetidores = new Set(repetidoresRaw.split(',').map((s) => s.trim()).filter(Boolean));

  if (!grupoOrigenId || !grupoDestinoId) {
    redirect('/admin/grupos?error=Faltan+grupos');
  }

  const { data: destino } = await supabase
    .from('grupos').select('ciclo_id').eq('id', grupoDestinoId).single();
  if (!destino) redirect('/admin/grupos?error=Grupo+destino+inv%C3%A1lido');

  // Inscripciones activas del grupo origen
  const { data: insc } = await supabase
    .from('inscripciones')
    .select('alumno_id')
    .eq('grupo_id', grupoOrigenId)
    .eq('estatus', 'activa');

  const aPromover = (insc ?? []).filter((i) => !repetidores.has(i.alumno_id));
  const aRepetir = (insc ?? []).filter((i) => repetidores.has(i.alumno_id));

  // Cerrar origen
  if ((insc ?? []).length) {
    await supabase
      .from('inscripciones')
      .update({ estatus: 'promovido' })
      .eq('grupo_id', grupoOrigenId)
      .eq('estatus', 'activa');
  }

  // Nuevas inscripciones en destino para los que avanzan
  if (aPromover.length) {
    await supabase.from('inscripciones').insert(
      aPromover.map((i) => ({
        alumno_id: i.alumno_id,
        grupo_id: grupoDestinoId,
        ciclo_id: destino!.ciclo_id,
        estatus: 'activa',
      })),
    );
  }

  // Los que reprueban re-inscribirlos al MISMO semestre en el nuevo ciclo,
  // usando cualquier grupo del mismo semestre que exista en el ciclo destino.
  if (aRepetir.length) {
    const { data: origen } = await supabase
      .from('grupos').select('semestre, turno').eq('id', grupoOrigenId).single();
    const { data: mismoSem } = await supabase
      .from('grupos').select('id').eq('ciclo_id', destino!.ciclo_id)
      .eq('semestre', origen!.semestre).eq('turno', origen!.turno).limit(1);
    const grupoRepetidor = mismoSem?.[0]?.id;
    if (grupoRepetidor) {
      await supabase.from('inscripciones').insert(
        aRepetir.map((i) => ({
          alumno_id: i.alumno_id,
          grupo_id: grupoRepetidor,
          ciclo_id: destino!.ciclo_id,
          estatus: 'activa',
        })),
      );
    }
  }

  revalidatePath('/admin/grupos');
  redirect(`/admin/grupos?ok=${encodeURIComponent(`Promovidos ${aPromover.length}, repetidores ${aRepetir.length}`)}`);
}

// ──────────────── Asignar orientador a un grupo ────────────────
export async function asignarOrientador(formData: FormData): Promise<void> {
  const supabase = createClient();
  const grupoId = String(formData.get('grupo_id'));
  const profesorId = String(formData.get('profesor_id') ?? '') || null;

  const { error } = await supabase.from('grupos')
    .update({ orientador_id: profesorId })
    .eq('id', grupoId);

  if (error) redirect(`/admin/grupos?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/grupos');
  redirect('/admin/grupos?ok=Orientador+asignado');
}

// Helper público para sugerir grupo destino del mismo consecutivo en el ciclo siguiente
export async function sugerirGrupoDestino(
  grupoOrigenId: string,
  cicloDestinoId: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data: origen } = await supabase
    .from('grupos').select('semestre, grupo, turno').eq('id', grupoOrigenId).single();
  if (!origen) return null;
  const sigSem = siguienteSemestre(origen.semestre);
  if (!sigSem) return null;
  const { data } = await supabase
    .from('grupos')
    .select('id')
    .eq('ciclo_id', cicloDestinoId)
    .eq('semestre', sigSem)
    .eq('grupo', origen.grupo)
    .eq('turno', origen.turno)
    .maybeSingle();
  return data?.id ?? null;
}
