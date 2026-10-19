import { mobileIdentity, mobileReply } from '@/lib/security/mobile';
import { mobileUuid } from '@/lib/security/mobile-exams';
import { rateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export async function GET(req: Request) {
  try {
    const identity = await mobileIdentity(req); if (identity.response) return identity.response;
    const params = new URL(req.url).searchParams, kind = params.get('kind'), id = params.get('id');
    if (!mobileUuid(id) || !['notice', 'submission'].includes(kind ?? '')) return mobileReply('Archivo inválido.', 400);
    if (!await rateLimit('mobile-file-read', 60, 600, identity.user.id)) return mobileReply('Demasiadas descargas. Intenta más tarde.', 429);
    let bucket: string, path: string | null, name: string | null, type: string | null = null, size: number | null = null;
    if (kind === 'notice') {
      const row = await identity.client.from('avisos').select('adjunto_url,adjunto_nombre,vence_at').eq('id', id).maybeSingle();
      if (row.error) return mobileReply('No se pudo consultar el archivo.', 503);
      if (!row.data || (row.data.vence_at && Date.parse(row.data.vence_at) < Date.now())) return mobileReply('Archivo no disponible.', 404);
      bucket = 'mensajes'; path = row.data.adjunto_url; name = row.data.adjunto_nombre;
    } else {
      const row = await identity.client.from('entregas_tarea').select('archivo_url,archivo_nombre,archivo_tipo,archivo_tamano').eq('id', id).maybeSingle();
      if (row.error) return mobileReply('No se pudo consultar el archivo.', 503);
      if (!row.data) return mobileReply('Archivo no disponible.', 404);
      bucket = 'tareas'; path = row.data.archivo_url; name = row.data.archivo_nombre; type = row.data.archivo_tipo; size = row.data.archivo_tamano;
    }
    // A record ID chooses a protected resource, never an arbitrary bucket, URL or path.
    if (!path || !name || path.startsWith('/') || /[\\\r\n]/.test(path) || path.includes('://') || path.split('/').includes('..')) return mobileReply('Archivo no disponible.', 404);
    const result = await identity.client.storage.from(bucket).createSignedUrl(path, 60, { download: name });
    if (result.error || !result.data?.signedUrl) return mobileReply('Archivo no disponible.', 404);
    return Response.json({ url: result.data.signedUrl, name, type, size, expires_in: 60 }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return mobileReply('No se pudo recuperar el archivo. Intenta nuevamente.', 503); }
}
