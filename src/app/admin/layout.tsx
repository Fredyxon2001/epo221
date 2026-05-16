import { redirect } from 'next/navigation';
import { PrivateShell } from '@/components/privado/PrivateShell';
import { Topbar } from '@/components/privado/Topbar';
import { PageTransition } from '@/components/privado/PageTransition';
import { createClient } from '@/lib/supabase/server';
import { getNotificaciones } from '@/lib/notificaciones';
import { saludoPorHora } from '@/lib/saludo';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles').select('nombre, email, rol').eq('id', user.id).single();
  // Acceso al panel admin: admin, staff, director, finanzas (vista limitada para finanzas)
  if (!perfil || !['admin', 'staff', 'director', 'finanzas'].includes(perfil.rol)) redirect('/');

  const esFinanzas = perfil.rol === 'finanzas';

  const { items: notiItems, noLeidas } = await getNotificaciones(user.id, 10);
  const { data: sitioCfg } = await supabase.from('sitio_config').select('logo_url').maybeSingle();

  // Para FINANZAS: solo ven módulos administrativos/financieros
  const groupsFinanzas = [
    {
      title: 'Resumen',
      items: [{ href: '/admin', label: 'Panel', icon: '🏠' }],
    },
    {
      title: '💰 Finanzas',
      items: [
        { href: '/admin/pagos', label: 'Pagos', icon: '💰' },
        { href: '/admin/conceptos', label: 'Conceptos', icon: '🏷️' },
        { href: '/admin/extraordinarios', label: 'Extraordinarios', icon: '📘' },
        { href: '/admin/alumnos', label: 'Buscar alumno', icon: '🎓' },
      ],
    },
    {
      title: 'Mi cuenta',
      items: [{ href: '/admin/perfil', label: 'Mi perfil', icon: '👤' }],
    },
  ];

  const groupsCompleto = [
    {
      title: 'Resumen',
      items: [{ href: '/admin', label: 'Panel', icon: '🏠' }],
    },
    {
      title: 'Personas',
      items: [
        { href: '/admin/alumnos', label: 'Alumnos', icon: '🎓' },
        { href: '/admin/profesores', label: 'Profesores', icon: '👨‍🏫' },
        { href: '/admin/usuarios', label: 'Usuarios y contraseñas', icon: '🔑' },
      ],
    },
    {
      title: 'Académico',
      items: [
        { href: '/admin/grupos', label: 'Grupos', icon: '🏫' },
        { href: '/admin/materias', label: 'Materias', icon: '📚' },
        { href: '/admin/asignaciones', label: 'Asignaciones', icon: '🔗' },
        { href: '/admin/horarios', label: 'Horarios', icon: '🗓️' },
        { href: '/admin/calificaciones', label: 'Calificaciones', icon: '📝' },
        { href: '/admin/ciclos', label: 'Ciclos', icon: '📅' },
        { href: '/admin/parciales', label: 'Parciales', icon: '⏱️' },
        { href: '/admin/planeaciones', label: 'Planeaciones', icon: '📝' },
        { href: '/admin/eval-docente', label: 'Evaluación docente', icon: '🧭' },
      ],
    },
    {
      title: 'Analítica',
      items: [
        { href: '/admin/generaciones', label: 'Generaciones', icon: '📊' },
        { href: '/admin/alertas', label: 'Alertas', icon: '🚨' },
        { href: '/admin/riesgo', label: 'Detección de riesgo', icon: '🧠' },
        { href: '/admin/correos', label: 'Correos a tutores', icon: '📧' },
      ],
    },
    {
      title: 'Finanzas',
      items: [
        { href: '/admin/pagos', label: 'Pagos', icon: '💰' },
        { href: '/admin/conceptos', label: 'Conceptos', icon: '🏷️' },
        { href: '/admin/extraordinarios', label: 'Extraordinarios', icon: '📘' },
      ],
    },
    {
      title: 'Difusión',
      items: [
        { href: '/admin/noticias', label: 'Noticias', icon: '📣' },
        { href: '/admin/convocatorias', label: 'Convocatorias', icon: '📢' },
        { href: '/admin/anuncios', label: 'Anuncios internos', icon: '🔔' },
        { href: '/admin/avisos', label: 'Avisos con lectura', icon: '✅' },
        { href: '/admin/calendario', label: 'Calendario', icon: '📅' },
        { href: '/admin/publico', label: 'Sitio público', icon: '🌐' },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { href: '/admin/auditoria', label: 'Auditoría', icon: '🔍' },
        { href: '/admin/perfil', label: 'Mi perfil', icon: '👤' },
      ],
    },
  ];

  const groups = esFinanzas ? groupsFinanzas : groupsCompleto;
  const saludo = saludoPorHora();
  const roleDisplay: 'admin' | 'staff' = esFinanzas ? 'staff' : (perfil.rol === 'staff' ? 'staff' : 'admin');

  return (
    <PrivateShell
      role={roleDisplay}
      groups={groups}
      userName={perfil.nombre ?? 'Usuario'}
      userSub={perfil.email ?? undefined}
      logoUrl={sitioCfg?.logo_url ?? null}
    >
      <Topbar
        greeting={saludo}
        userName={(perfil.nombre ?? 'Usuario').split(' ')[0]}
        userSub={perfil.email ?? undefined}
        role={roleDisplay}
        notiCount={noLeidas}
        notiItems={notiItems}
      />
      <main className="flex-1 p-5 md:p-8 max-w-[1600px] w-full mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </PrivateShell>
  );
}
