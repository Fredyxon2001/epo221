import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export type InitialCredential = { nombre: string; matricula: string; email: string; password: string };
function key() {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('No se configuró el cifrado de credenciales.');
  return createHash('sha256').update(`epo221:initial-credentials:v1:${secret}`).digest();
}
export function encryptCredentials(credentials: InitialCredential[]) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from('epo221:initial-credentials:v1'));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
export function decryptCredentials(value: string): InitialCredential[] {
  const [version, iv, tag, encrypted, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted || extra) throw new Error('Formato de credenciales inválido.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAAD(Buffer.from('epo221:initial-credentials:v1'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  const parsed = JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted,'base64url')), decipher.final()]).toString('utf8'));
  if (!Array.isArray(parsed) || !parsed.every(c => c && ['nombre','matricula','email','password'].every(field => typeof c[field] === 'string'))) throw new Error('Datos de credenciales inválidos.');
  return parsed;
}
