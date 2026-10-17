import 'server-only';
import { createHash } from 'node:crypto';

export type BackupFile = { bucket: string; name: string; object: string; sha256: string; size: number };
export type BackupManifest = { version: 1; createdAt: string; snapshot: Record<string, unknown>; files: BackupFile[] };

// Never use a decrypted path before checking its content-addressed format.
export function validateBackupManifest(value: unknown, now = Date.now()): BackupManifest {
  if (!value || typeof value !== 'object') throw new Error('Manifiesto de respaldo inválido.');
  const manifest = value as BackupManifest;
  const date = Date.parse(manifest.createdAt);
  if (manifest.version !== 1 || !Number.isFinite(date) || new Date(date).toISOString() !== manifest.createdAt || date > now + 5 * 60_000 ||
      !manifest.snapshot || typeof manifest.snapshot !== 'object' || Array.isArray(manifest.snapshot) || !Array.isArray(manifest.files)) {
    throw new Error('Manifiesto de respaldo inválido.');
  }
  for (const file of manifest.files) {
    if (!file || typeof file.bucket !== 'string' || !file.bucket || typeof file.name !== 'string' || !file.name ||
        typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256) ||
        file.object !== `files/${file.sha256}.enc` || !Number.isSafeInteger(file.size) || file.size < 0) {
      throw new Error('Referencia de archivo cifrado inválida.');
    }
  }
  return manifest;
}

export function verifyBackupFile(bytes: Buffer, file: BackupFile) {
  if (bytes.length !== file.size || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
    throw new Error('La integridad de un archivo del respaldo falló.');
  }
}

export function backupAgeHours(manifest: BackupManifest, now = Date.now()) {
  return Math.max(0, (now - Date.parse(manifest.createdAt)) / 3_600_000);
}
