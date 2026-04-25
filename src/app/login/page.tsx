import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = createClient();
  const { data: cfg } = await supabase
    .from('sitio_config')
    .select('logo_url, lema, cct, nombre_escuela')
    .maybeSingle();

  return (
    <LoginForm
      logoUrl={cfg?.logo_url ?? null}
      lema={cfg?.lema ?? null}
      cct={cfg?.cct ?? null}
      nombreEscuela={cfg?.nombre_escuela ?? null}
    />
  );
}
