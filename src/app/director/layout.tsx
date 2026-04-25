import { redirect } from 'next/navigation';
import { PrivateShell } from '@/components/privado/PrivateShell';
import { Topbar } from '@/components/privado/Topbar';
import { PageTransition } from '@/components/privado/PageTransition';
import { createClient } from '@/lib/supabase/server';
import { getNotificaciones } from '@/lib/notificaciones';
import { saludoPorHora } from '@/lib/saludo';

export default async function DirectorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles').select('nombre, email, rol').eq('id', user.id).single();
  if (!perfil || !['director', 'admin'].includes(perfil.rol)) redirect('/');

  const { items: notiItems, noLeidas } = await getNotificaciones(user.id, 10);
  const { data: sitioCfg } = await supabase.from('sitio_config').select('logo_url').maybeSingle();

  // Badge: solicitudes abiertas institucionales
  const { count: solic } = await supabase
    .from('solicitudes_revision')
    .select('id', { count: 'exact', head: true })
    .eq('estado', 'abierta');

  const groups = [
    {
      title: 'Dirección',
      items: [
        { href: '/director', label: 'Panorama', icon: '🏛️' },
        { href: '/director/academico', label: 'Académico', icon: '📊' },
        { href: '/director/solicitudes', label: 'Solicitudes', icon: '💬', badge: solic || undefined },
      ],
    },
    {
      title: 'Comunicación',
      items: [
        { href: '/director/anuncios', label: 'Comunicados', icon: '📣' },
      ],
    },
    {
      title: 'Gestión',
      items: [
        { href: '/admin', label: 'Panel admin', icon: '⚙️' },
        { href: '/admin/publico', label: 'Sitio público', icon: '🌐' },
      ],
    },
  ];

  const saludo = saludoPorHora();

  return (
    <PrivateShell
      role="director"
      groups={groups}
      userName={perfil.nombre ?? 'Dirección'}
      userSub={perfil.email ?? 'EPO 221'}
      logoUrl={sitioCfg?.logo_url ?? null}
    >
      <Topbar
        greeting={saludo}
        userName={(perfil.nombre ?? 'Director').split(' ')[0]}
        userSub="Dirección EPO 221"
        role="director"
        notiCount={noLeidas}
        notiItems={notiItems}
      />
      <main className="flex-1 p-5 md:p-8 max-w-[1600px] w-full mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </PrivateShell>
  );
}
