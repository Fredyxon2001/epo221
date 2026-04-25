'use server';
// Autoservicio: alumno con CURP+matrícula o docente con RFC resetea a contraseña temporal.
import { adminClient } from '@/lib/supabase/admin';

const TEMP_PASSWORD = 'EPO221!';

export async function recuperarPassword(fd: FormData): Promise<{ error?: string; ok?: boolean; temporal?: string }> {
  const tipo = String(fd.get('tipo') ?? 'alumno');
  const clave1 = String(fd.get('clave1') ?? '').trim().toUpperCase(); // CURP o RFC
  const clave2 = String(fd.get('clave2') ?? '').trim();               // matrícula o (no usada en docente)

  if (clave1.length < 10) return { error: 'Dato inválido' };

  const sb = adminClient();
  let perfilId: string | null = null;

  if (tipo === 'alumno') {
    if (!clave2) return { error: 'Captura tu matrícula' };
    const { data } = await sb
      .from('alumnos').select('perfil_id, matricula, curp')
      .eq('curp', clave1).eq('matricula', clave2).maybeSingle();
    perfilId = data?.perfil_id ?? null;
  } else {
    const { data } = await sb
      .from('profesores').select('perfil_id, rfc')
      .eq('rfc', clave1).maybeSingle();
    perfilId = data?.perfil_id ?? null;
  }

  if (!perfilId) return { error: 'No encontramos una cuenta con esos datos' };

  const { error: upErr } = await sb.auth.admin.updateUserById(perfilId, { password: TEMP_PASSWORD });
  if (upErr) return { error: upErr.message };

  await sb.from('perfiles').update({
    debe_cambiar_password: true,
    password_reset_at: new Date().toISOString(),
  }).eq('id', perfilId);

  return { ok: true, temporal: TEMP_PASSWORD };
}
