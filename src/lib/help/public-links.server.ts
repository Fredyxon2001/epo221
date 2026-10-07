import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { publicHelpLinks } from './public-links';

export async function getPublicHelpLinks() {
  const client = await createClient();
  const { data } = await client.from('paginas_publicas').select('slug,titulo').eq('publicada', true).is('deleted_at', null).order('orden');
  return publicHelpLinks((data ?? []).map(page => ({ href: `/publico/p/${page.slug}`, label: page.titulo })));
}
