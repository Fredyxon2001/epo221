// Cliente de Supabase para el navegador (componentes "use client").
import { createBrowserClient } from '@supabase/ssr';
import { authCookieOptions } from './cookie-options';
import { resilientAuthFetch } from './auth-resilience';

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: authCookieOptions, global: { fetch: resilientAuthFetch(process.env.NEXT_PUBLIC_SUPABASE_URL!) } }
  );
