import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { adminClient } from '@/lib/supabase/admin';
import { sessionIdentity } from './access';

export const UPLOAD_BUCKET = 'security-uploads';
export const UPLOAD_PREFIX = 'epo-upload-v1.';
const MAX_SIZE = 50 * 1024 * 1024;
type Ticket = { actor: string; path: string; name: string; type: string; size: number; expires: number };
function mac(value: string) { return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`upload-v1:${value}`).digest(); }
export function createUploadTicket(actor: string, name: string, type: string, size: number) {
  const payload: Ticket = { actor, name, type, size, path: `${actor}/${randomUUID()}`, expires: Date.now() + 15 * 60_000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { path: payload.path, ticket: `${UPLOAD_PREFIX}${encoded}.${mac(encoded).toString('base64url')}` };
}
export async function receiveUploadTicket(value: string): Promise<File> {
  const parts = value.split('.');
  if (value.length > 3000 || parts.length !== 3 || parts[0] !== 'epo-upload-v1') throw new Error('Referencia de archivo inválida.');
  const expected = mac(parts[1]), signature = Buffer.from(parts[2], 'base64url');
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) throw new Error('Referencia de archivo inválida.');
  const ticket = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Ticket;
  const identity = await sessionIdentity();
  if (!identity || ticket.actor !== identity.user.id || ticket.expires < Date.now() ||
    !ticket.path.startsWith(`${identity.user.id}/`) || !Number.isInteger(ticket.size) || ticket.size < 1 || ticket.size > MAX_SIZE) {
    throw new Error('La carga venció o pertenece a otra sesión. Selecciona el archivo nuevamente.');
  }
  const storage = adminClient().storage.from(UPLOAD_BUCKET);
  try {
    const info = await storage.info(ticket.path);
    if (info.error || info.data?.size !== ticket.size) throw new Error('El archivo no se recibió completo. Intenta nuevamente.');
    const { data, error } = await storage.download(ticket.path);
    if (error || !data || data.size !== ticket.size) throw new Error('No se pudo recuperar el archivo.');
    return new File([data], ticket.name, { type: ticket.type });
  } finally {
    // Staged objects are single-use; the action writes the validated final object.
    await storage.remove([ticket.path]);
  }
}

export async function cleanupStagedUploads() {
  const client = adminClient();
  const { data, error } = await client.rpc('security_expired_upload_paths');
  if (error) throw new Error('No se pudo consultar las cargas vencidas.');
  if (!data?.length) return;
  const removed = await client.storage.from(UPLOAD_BUCKET).remove(data.map((row: { name: string }) => row.name));
  if (removed.error) throw new Error('No se pudieron eliminar las cargas vencidas.');
}
