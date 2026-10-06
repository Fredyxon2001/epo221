import { cronAuthorized } from '@/lib/security/secrets';
import { adminClient } from '@/lib/supabase/admin';
import { createSecurityBackup } from '@/lib/security/backup';
import { cleanupStagedUploads } from '@/lib/security/upload-tickets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return new Response('Unauthorized',{status:401});
  const client = adminClient();
  const { error } = await client.rpc('security_cleanup');
  if (error) return Response.json({ error:'No se pudo ejecutar el mantenimiento de seguridad.' },{status:500});
  try {
    await cleanupStagedUploads();
    const backup = await createSecurityBackup();
    const { error: logError } = await client.from('security_events').insert({ event:'backup_verified',operation:`tables:${backup.tables};rows:${backup.rows};files:${backup.files}` });
    if (logError) throw new Error('No se pudo registrar la verificación.');
    return Response.json({ok:true,...backup});
  } catch { return Response.json({error:'El respaldo de seguridad no se completó.'},{status:500}); }
}
