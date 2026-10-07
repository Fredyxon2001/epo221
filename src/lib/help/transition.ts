import type { HelpLink, HelpRole } from './catalog';

type Transition = { role: HelpRole; orientador: boolean; identityKey?: string; links: HelpLink[]; moduleIndex: number; controlIndex: number; createdAt: number };
export type HelpViewer = { id: string; role: HelpRole };
// Browser-memory only: a refresh or another tab never reopens a tour. No account
// identifier, route, page content, or field value is written to persistent storage.
let pending: Transition | null = null;
const identities = new Map<string, string | undefined>();
export function rememberHelpTransition(value: Omit<Transition, 'createdAt'>) {
  if (typeof window !== 'undefined') pending = { ...value, createdAt: Date.now() };
}
export function hasHelpTransition(role: HelpRole) {
  return !!pending && pending.role === role && Date.now() - pending.createdAt < 30_000;
}
export function peekHelpTransition(viewer?: HelpViewer | null) {
  if (!pending || Date.now() - pending.createdAt >= 30_000) return null;
  if (pending.role !== 'publico' && (!viewer || pending.identityKey !== viewer.id || pending.role !== viewer.role)) return null;
  return pending;
}
export function takeHelpTransition(role: HelpRole, orientador: boolean, identityKey?: string) {
  if (!hasHelpTransition(role) || pending?.orientador !== orientador || pending.identityKey !== identityKey) return null;
  const value = pending; pending = null; return value;
}
export function resetHelpIdentity(role: HelpRole, orientador: boolean, identityKey?: string) {
  const key = `${role}:${orientador}`;
  const changed = identities.has(key) && identities.get(key) !== identityKey;
  identities.set(key, identityKey);
  if (changed) pending = null;
  return changed;
}
export function clearHelpTransition() { pending = null; }
