// Cliente con service_role — SOLO usar en Server Actions protegidas.
// Tiene acceso total, salta RLS. No exponer NUNCA al cliente.
import { createClient } from '@supabase/supabase-js';

export const adminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
