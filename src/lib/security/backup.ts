import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { adminClient } from '@/lib/supabase/admin';

export function encryptBackup(data: Buffer) {
  const secret = process.env.BACKUP_ENCRYPTION_KEY;
  if (!secret) throw new Error('No se configuró la clave de respaldos.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv);
  cipher.setAAD(Buffer.from('epo221:backup:v1'));
  const payload = Buffer.concat([cipher.update(data),cipher.final()]);
  return Buffer.concat([Buffer.from('EPOBK1'),iv,cipher.getAuthTag(),payload]);
}
export function decryptBackup(data: Buffer) {
  if (!process.env.BACKUP_ENCRYPTION_KEY || data.subarray(0,6).toString() !== 'EPOBK1') throw new Error('Respaldo inválido.');
  const cipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(process.env.BACKUP_ENCRYPTION_KEY).digest(), data.subarray(6,18));
  cipher.setAAD(Buffer.from('epo221:backup:v1')); cipher.setAuthTag(data.subarray(18,34));
  return Buffer.concat([cipher.update(data.subarray(34)),cipher.final()]);
}
export async function createSecurityBackup() {
  const client = adminClient();
  const { data: snapshot, error } = await client.rpc('security_backup_snapshot');
  if (error || !snapshot) throw new Error('No se pudo generar el respaldo de datos.');
  snapshot.storage = (snapshot.storage ?? []).filter((file: { bucket_id: string }) => file.bucket_id !== 'security-uploads');
  const manifest = { version: 1, createdAt: new Date().toISOString(), snapshot, files: [] as { bucket: string; name: string; object: string; sha256: string; size: number }[] };
  for (const file of snapshot.storage ?? []) {
    const { data, error: downloadError } = await client.storage.from(file.bucket_id).download(file.name);
    if (downloadError || !data) throw new Error('No se pudo respaldar un archivo de Storage.');
    const bytes = Buffer.from(await data.arrayBuffer());
    const hash = createHash('sha256').update(bytes).digest('hex');
    const object = `files/${hash}.enc`;
    const { error: uploadError } = await client.storage.from('security-backups').upload(object, encryptBackup(bytes), { contentType: 'application/octet-stream', upsert: true });
    if (uploadError) throw new Error('No se pudo guardar un archivo cifrado del respaldo.');
    const { data: check } = await client.storage.from('security-backups').download(object);
    if (!check || !decryptBackup(Buffer.from(await check.arrayBuffer())).equals(bytes)) throw new Error('La verificación de archivos del respaldo falló.');
    manifest.files.push({ bucket: file.bucket_id, name: file.name, object, sha256: hash, size: bytes.length });
  }
  const encoded = encryptBackup(gzipSync(Buffer.from(JSON.stringify(manifest))));
  const decoded = JSON.parse(gunzipSync(decryptBackup(encoded)).toString('utf8'));
  const { data: restored, error: restoreError } = await client.rpc('security_backup_validate', { p_snapshot: decoded.snapshot });
  if (restoreError || !restored?.ok) throw new Error('La prueba de recuperación de datos falló.');
  const name = `snapshots/${manifest.createdAt.replace(/[:.]/g,'-')}.json.gz.enc`;
  const { error: saveError } = await client.storage.from('security-backups').upload(name, encoded, { contentType:'application/octet-stream',upsert:false });
  if (saveError) throw new Error('No se pudo guardar el respaldo cifrado.');
  const { data: older, error: listError } = await client.storage.from('security-backups').list('snapshots',{limit:1000});
  if (listError) throw new Error('No se pudo comprobar la retención de respaldos.');
  const expired = (older ?? []).filter(file => file.created_at && Date.parse(file.created_at) < Date.now()-7*24*60*60*1000).map(file => `snapshots/${file.name}`);
  if (expired.length) {
    const { error: retentionError } = await client.storage.from('security-backups').remove(expired);
    if (retentionError) throw new Error('No se pudo aplicar la retención de respaldos.');
  }
  return { name, tables: restored.tables, rows: restored.rows, files: manifest.files.length, bytes: encoded.length };
}
