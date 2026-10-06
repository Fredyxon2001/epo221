import { apiAccess } from '@/lib/security/api-access';
import { sessionIdentity } from '@/lib/security/access';
import { rateLimit } from '@/lib/security/rate-limit';
import { allowedFileName } from '@/lib/security/form-data';
import { createUploadTicket, UPLOAD_BUCKET } from '@/lib/security/upload-tickets';
import { adminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const denied = await apiAccess(req);
  if (denied) return denied;
  if (Number(req.headers.get('content-length') ?? 0) > 3000) return Response.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
  const text = await req.text();
  if (text.length > 3000) return Response.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
  let input;
  try { input = JSON.parse(text); } catch { return Response.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
  if (!input || typeof input.name !== 'string' || input.name.length > 200 || !allowedFileName(input.name) ||
    typeof input.type !== 'string' || input.type.length > 150 || !Number.isInteger(input.size) || input.size < 1 || input.size > 50 * 1024 * 1024) {
    return Response.json({ error: 'Tipo o tamaño de archivo no permitido.' }, { status: 400 });
  }
  const identity = await sessionIdentity();
  if (!identity) return Response.json({ error: 'Sesión requerida.' }, { status: 401 });
  if (!await rateLimit('file-upload', 30, 600, identity.user.id)) return Response.json({ error: 'Demasiadas cargas. Intenta más tarde.' }, { status: 429 });
  const upload = createUploadTicket(identity.user.id, input.name, input.type, input.size);
  const { data, error } = await adminClient().storage.from(UPLOAD_BUCKET).createSignedUploadUrl(upload.path, { upsert: false });
  if (error) return Response.json({ error: 'No se pudo preparar la carga.' }, { status: 503 });
  return Response.json({ ticket: upload.ticket, signedUrl: data.signedUrl }, { headers: { 'Cache-Control': 'private, no-store' } });
}
