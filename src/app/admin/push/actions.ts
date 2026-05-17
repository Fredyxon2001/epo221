'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function guardarConfigPush(fd: FormData) {
  const supabase = createClient();
  const webhook_url = String(fd.get('webhook_url') ?? '').trim() || null;
  const webhook_secret = String(fd.get('webhook_secret') ?? '').trim() || null;
  const enabled = fd.get('enabled') === 'on';
  const { error } = await supabase
    .from('push_webhook_config')
    .update({ webhook_url, webhook_secret, enabled })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/push');
}
