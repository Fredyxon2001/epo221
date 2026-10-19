import { nativeLearningReady } from '@/lib/security/native-learning';
import { mobileIdentity, mobileReply } from '@/lib/security/mobile';
import { mobileUuid } from '@/lib/security/mobile-exams';
import { allowedFileName } from '@/lib/security/form-data';
import { createUploadTicket, UPLOAD_BUCKET } from '@/lib/security/upload-tickets';
import { rateLimit } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export async function POST(req: Request) {
  try {
    const identity = await mobileIdentity(req); if (identity.response) return identity.response;
    if (identity.profile.rol !== 'alumno') return mobileReply('Acceso de alumno requerido.', 403);
    if (!req.headers.get('content-type')?.startsWith('application/json')) return mobileReply('Solicitud inválida.', 400);
    if (Number(req.headers.get('content-length') ?? 0) > 3000) return mobileReply('Solicitud demasiado grande.', 413);
    const raw = await req.text(); if (Buffer.byteLength(raw, 'utf8') > 3000) return mobileReply('Solicitud demasiado grande.', 413);
    let input; try { input = JSON.parse(raw); } catch { return mobileReply('Solicitud inválida.', 400); }
    if (input?.action !== 'prepare' || !mobileUuid(input.task_id) || typeof input.name !== 'string' || input.name.length > 200 || /[\\/\r\n\0]/.test(input.name) || !allowedFileName(input.name) ||
      typeof input.type !== 'string' || input.type.length > 150 || !Number.isInteger(input.size) || input.size < 1 || input.size > 25 * 1024 * 1024) return mobileReply('Tipo o tamaño de archivo no permitido (máximo 25 MB).', 400);
    if (!await rateLimit('mobile-task-upload', 30, 600, identity.user.id)) return mobileReply('Demasiadas cargas. Intenta más tarde.', 429);
    if (!await nativeLearningReady(identity.service)) return mobileReply('La carga móvil de archivos todavía no está habilitada. Usa el portal escolar.', 503);
    const task = await identity.client.from('tareas').select('id,permite_archivos,fecha_apertura,fecha_entrega,cierra_estricto').eq('id', input.task_id).maybeSingle();
    if (task.error) return mobileReply('No se pudo comprobar la tarea.', 503);
    if (!task.data || !task.data.permite_archivos || Date.parse(task.data.fecha_apertura) > Date.now() || (task.data.cierra_estricto && Date.parse(task.data.fecha_entrega) < Date.now())) return mobileReply('Esta tarea no admite el archivo.', 409);
    const upload = createUploadTicket(identity.user.id, input.name, input.type, input.size);
    const result = await identity.service.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(upload.path, { upsert: false });
    if (result.error || !result.data?.signedUrl) return mobileReply('No se pudo preparar la carga.', 503);
    return Response.json({ ticket: upload.ticket, signedUrl: result.data.signedUrl }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return mobileReply('No se pudo preparar el archivo. Intenta nuevamente.', 503); }
}
