'use server';
import { requireAccess } from '@/lib/security/access';
import { adminClient } from '@/lib/supabase/admin';
import { calcularRiesgoCiclo } from '@/lib/riesgo/score';
import { revalidatePath } from 'next/cache';
export async function recalcularRiesgo(): Promise<{ ok?: boolean; error?: string; total?: number }> {
  await requireAccess(['admin','staff','director'], 'admin/riesgo:recalcular');
  try {
    const client = adminClient();
    const { data: ciclo, error } = await client.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();
    if (error) throw error;
    if (!ciclo) return { error: 'Sin ciclo activo' };
    const resultados = await calcularRiesgoCiclo(client, ciclo.id);
    const saved = await client.rpc('security_save_risk_run', { p_cycle: ciclo.id, p_rows: resultados, p_origin: 'manual_admin' });
    if (saved.error) throw saved.error;
    revalidatePath('/admin/riesgo');
    revalidatePath('/profesor/riesgo');
    return { ok: true, total: resultados.length };
  } catch { return { error: 'No se pudo completar el cálculo. Reintenta; no se guardaron resultados parciales.' }; }
}
