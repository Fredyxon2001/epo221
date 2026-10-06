'use server';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function guardarConfigPush(fd: FormData) {
  await requireAccess(["admin","staff","director"], "admin/push/actions.ts:guardarConfigPush");
  await validateFormData(fd);

  const supabase = (await createClient());
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
