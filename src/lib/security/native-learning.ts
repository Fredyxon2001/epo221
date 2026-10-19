import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** New native writes require the complete server-side boundary; never infer readiness. */
export async function nativeLearningReady(service: Pick<SupabaseClient, 'rpc'>): Promise<boolean> {
  try {
    const result = await service.rpc('security_mobile_learning_ready');
    return !result.error && result.data === true;
  } catch { return false; }
}
