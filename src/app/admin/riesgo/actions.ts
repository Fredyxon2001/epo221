'use server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { calcularRiesgoCiclo } from '@/lib/riesgo/score';
import { revalidatePath } from 'next/cache';

export async function recalcularRiesgo(): Promise<{ ok?: boolean; error?: string; total?: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Sesión expirada' };
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) return { error: 'Sin permiso' };

  const admin = adminClient();
  const { data: ciclo } = await admin.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();
  if (!ciclo) return { error: 'Sin ciclo activo' };

  const resultados = await calcularRiesgoCiclo(admin as any, ciclo.id);
  if (resultados.length) {
    await admin.from('riesgo_snapshots').insert(resultados.map((r) => ({
      alumno_id: r.alumno_id,
      ciclo_id: ciclo.id,
      score: r.score,
      nivel: r.nivel,
      factores: r.factores,
      recomendacion: r.recomendacion,
      generado_por: 'manual_admin',
    })));
  }
  revalidatePath('/admin/riesgo');
  return { ok: true, total: resultados.length };
}
