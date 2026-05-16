// Helpers de autenticación.
// Supabase Auth usa email+password. Para permitir login con CURP+matrícula,
// creamos un "email sintético" por alumno: {curp}@epo221.local
// El usuario NUNCA ve este email; solo escribe su CURP.

const DOMINIO_SINTETICO = 'epo221.local';

// IMPORTANTE: email SIEMPRE en minúsculas para evitar problemas de login case-sensitive
// (Supabase auth.users.email es case-sensitive en algunas configuraciones)
export const curpAEmail = (curp: string) =>
  `${curp.trim().toLowerCase()}@${DOMINIO_SINTETICO}`;

export const esCurpValida = (curp: string) =>
  /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i.test(curp.trim());

// Password inicial = matrícula. Forzamos cambio al primer login.
// (La matrícula en texto plano se usa SOLO una vez, al crear la cuenta.)
export const passwordInicialDesdeMatricula = (matricula: string) =>
  matricula.trim();
