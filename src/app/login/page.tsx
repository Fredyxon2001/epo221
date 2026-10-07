import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';
import { PublicGuideEntry } from '@/components/help/PublicGuideEntry';
import { getPublicHelpLinks } from '@/lib/help/public-links.server';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const supabase = (await createClient());
  const [{ data: cfg }, helpLinks] = await Promise.all([supabase
    .from('sitio_config')
    .select('logo_url, lema, cct, nombre_escuela')
    .maybeSingle(), getPublicHelpLinks()]);

  return (
    <><PublicGuideEntry links={helpLinks} /><LoginForm
      logoUrl={cfg?.logo_url ?? null}
      lema={cfg?.lema ?? null}
      cct={cfg?.cct ?? null}
      nombreEscuela={cfg?.nombre_escuela ?? null}
    /></>
  );
}
