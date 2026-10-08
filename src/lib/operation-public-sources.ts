import 'server-only';
import { createHash } from 'node:crypto';
import type { OperationTopic } from './operation-governance';
export function publicPolicyFingerprint(): string {
  // The digest is produced by next.config during build. Runtime never reads source files,
  // evaluates JSX or exposes the environment. Include the public official notice link too.
  if (!/^[0-9a-f]{64}$/.test(process.env.EPO_NOTICE_DIGEST ?? '')) throw new Error('Falta la huella de las páginas informativas. Reinicia o reconstruye la aplicación.');
  return createHash('sha256').update(JSON.stringify([process.env.EPO_NOTICE_DIGEST, process.env.PRIVACY_NOTICE_URL ?? ''])).digest('hex');
}
export function policySourcesFor(topic: OperationTopic, hash: string): string | null {
  return ['publicaciones', 'privacidad', 'fotografias'].includes(topic) ? hash : null;
}
