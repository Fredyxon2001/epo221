import { randomInt } from 'node:crypto';

export function temporaryPassword(length = 18) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%';
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}
export function passwordError(value: string): string | null {
  return value.length < 12 ? 'La contraseña debe tener al menos 12 caracteres.'
    : value.length > 128 ? 'La contraseña es demasiado larga.' : null;
}
