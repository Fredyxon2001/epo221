'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function crearHorario(formData: FormData): Promise<void> {
  const supabase = createClient();
  const asigId = String(formData.get('asignacion_id'));
  const dia = Number(formData.get('dia'));
  const horaInicio = String(formData.get('hora_inicio'));
  const horaFin = String(formData.get('hora_fin'));
  const aula = String(formData.get('aula') ?? '') || null;

  if (!asigId || !dia || !horaInicio || !horaFin) {
    redirect('/admin/horarios?error=Faltan+datos');
  }

  const { error } = await supabase.from('horarios').insert({
    asignacion_id: asigId, dia, hora_inicio: horaInicio, hora_fin: horaFin, aula,
  });

  if (error) redirect(`/admin/horarios?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/horarios');
  redirect('/admin/horarios?ok=Sesi%C3%B3n+creada');
}

export async function eliminarHorario(formData: FormData): Promise<void> {
  const supabase = createClient();
  const id = String(formData.get('id'));
  await supabase.from('horarios').delete().eq('id', id);
  revalidatePath('/admin/horarios');
  redirect('/admin/horarios?ok=Sesi%C3%B3n+eliminada');
}

// Bloques por turno. Receso 10:20-11:00 (matutino) y 16:40-17:20 (vespertino).
const SLOTS_MATUTINO = [
  { ini: '07:00', fin: '08:00' },
  { ini: '08:00', fin: '09:00' },
  { ini: '09:00', fin: '10:00' },
  // 10:00-10:20 transición; 10:20-11:00 RECESO
  { ini: '11:00', fin: '12:00' },
  { ini: '12:00', fin: '13:00' },
  { ini: '13:00', fin: '14:00' },
];
const SLOTS_VESPERTINO = [
  { ini: '14:00', fin: '15:00' },
  { ini: '15:00', fin: '16:00' },
  { ini: '16:00', fin: '16:40' },
  // 16:40-17:20 RECESO
  { ini: '17:20', fin: '18:20' },
  { ini: '18:20', fin: '19:20' },
  { ini: '19:20', fin: '20:20' },
];

// Genera horarios automáticamente respetando horas_semestrales y evitando
// conflictos dentro del mismo grupo. Para cada grupo del ciclo activo:
//  • Calcula horas/semana por asignación = round(horas_semestrales/18), min 1, max 5.
//  • Distribuye esas horas en los 5 días usando los bloques del turno.
//  • No duplica el mismo bloque en el mismo grupo (pero sí puede coincidir entre grupos).
export async function generarHorariosAutomaticos(): Promise<void> {
  const supabase = createClient();

  const { data: ciclo } = await supabase
    .from('ciclos_escolares').select('id').eq('activo', true).single();
  if (!ciclo) redirect('/admin/horarios?error=Sin+ciclo+activo');

  const { data: grupos } = await supabase
    .from('grupos').select('id, grado, semestre, grupo, turno').eq('ciclo_id', ciclo!.id);

  // Limpia horarios del ciclo actual antes de regenerar
  const { data: asigsCiclo } = await supabase
    .from('asignaciones').select('id').eq('ciclo_id', ciclo!.id);
  const asigIds = (asigsCiclo ?? []).map((a: any) => a.id);
  if (asigIds.length) await supabase.from('horarios').delete().in('asignacion_id', asigIds);

  for (const g of grupos ?? []) {
    const slots = g.turno === 'vespertino' ? SLOTS_VESPERTINO : SLOTS_MATUTINO;

    const { data: asigs } = await supabase
      .from('asignaciones')
      .select('id, materia:materias(nombre, horas_semestrales)')
      .eq('grupo_id', g.id).eq('ciclo_id', ciclo!.id);

    // Ocupación: Map<"dia-slot", true>
    const ocupado = new Set<string>();
    // Distribuir días para balancear (round-robin)
    let cursorDia = 1; // 1=Lun .. 5=Vie

    for (const a of asigs ?? []) {
      const m: any = (a as any).materia;
      const horasSem = m?.horas_semestrales ?? 54;
      let horasNecesarias = Math.max(1, Math.min(5, Math.round(horasSem / 18)));

      // Coloca 1 hora por día por asignación hasta cubrir. Si faltan, agrega bloques contiguos.
      let intentos = 0;
      while (horasNecesarias > 0 && intentos < 60) {
        const dia = cursorDia;
        // Buscar primer slot libre ese día
        let colocado = false;
        for (let i = 0; i < slots.length; i++) {
          const key = `${dia}-${i}`;
          if (!ocupado.has(key)) {
            ocupado.add(key);
            await supabase.from('horarios').insert({
              asignacion_id: a.id,
              dia,
              hora_inicio: slots[i].ini,
              hora_fin: slots[i].fin,
              aula: `A-${g.grado}${String(g.grupo).padStart(2, '0')}`,
            });
            colocado = true;
            horasNecesarias--;
            break;
          }
        }
        cursorDia = (cursorDia % 5) + 1; // siguiente día
        if (!colocado) intentos++;
        else intentos = 0;
      }
    }
  }

  revalidatePath('/admin/horarios');
  revalidatePath('/alumno/horario');
  revalidatePath('/profesor/horario');
  redirect('/admin/horarios?ok=Horarios+generados');
}
