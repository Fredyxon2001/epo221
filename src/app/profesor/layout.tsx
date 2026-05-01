import { redirect } from 'next/navigation';
import { PrivateShell } from '@/components/privado/PrivateShell';
import { Topbar } from '@/components/privado/Topbar';
import { PageTransition } from '@/components/privado/PageTransition';
import { createClient } from '@/lib/supabase/server';
import { getNotificaciones } from '@/lib/notificaciones';
import { saludoPorHora } from '@/lib/saludo';

export default async function ProfesorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles').select('*').eq('id', user.id).single();
  if (!perfil || !['profesor', 'admin', 'staff'].includes(perfil.rol)) redirect('/');

  const { data: profesor } = await supabase
    .from('profesores').select('id').eq('perfil_id', user.id).maybeSingle();

  // Solicitudes abiertas/respondidas para badge
  let pendientes = 0;
  let mensajesNL = 0;
  let orientaCount = 0;
  if (profesor?.id) {
    const { data: asigs } = await supabase
      .from('asignaciones').select('id').eq('profesor_id', profesor.id);
    const ids = (asigs ?? []).map((a: any) => a.id);
    if (ids.length) {
      const { count } = await supabase
        .from('solicitudes_revision')
        .select('id', { count: 'exact', head: true })
        .in('asignacion_id', ids)
        .eq('estado', 'abierta');
      pendientes = count ?? 0;
    }
    const { data: hilos } = await supabase.from('mensajes_hilos').select('id').eq('profesor_id', profesor.id);
    const hIds = (hilos ?? []).map((h: any) => h.id);
    if (hIds.length) {
      const { count } = await supabase.from('mensajes').select('id', { count: 'exact', head: true })
        .in('hilo_id', hIds).is('leido_at', null).eq('autor_tipo', 'alumno');
      mensajesNL = count ?? 0;
    }
    const { count: og } = await supabase.from('grupos')
      .select('id', { count: 'exact', head: true }).eq('orientador_id', profesor.id);
    orientaCount = og ?? 0;
  }

  const { items: notiItems, noLeidas } = await getNotificaciones(user.id, 10);
  const { data: sitioCfg } = await supabase.from('sitio_config').select('logo_url').maybeSingle();

  // Conteos del orientador (solo si tiene grupos a cargo)
  let propPendientes = 0;
  let solOrient = 0;
  if (orientaCount > 0 && profesor?.id) {
    const { data: misGrupos } = await supabase
      .from('grupos').select('id').eq('orientador_id', profesor.id).is('deleted_at', null);
    const gIds = (misGrupos ?? []).map((g: any) => g.id);
    if (gIds.length) {
      const { data: asigOrient } = await supabase.from('asignaciones').select('id').in('grupo_id', gIds);
      const aIds = (asigOrient ?? []).map((a: any) => a.id);
      if (aIds.length) {
        const { count: cp } = await supabase.from('calificaciones_propuestas')
          .select('id', { count: 'exact', head: true }).in('asignacion_id', aIds).eq('estado', 'pendiente');
        propPendientes = cp ?? 0;
      }
    }
    const { count: so } = await supabase.from('solicitudes_revision')
      .select('id', { count: 'exact', head: true }).eq('orientador_id', profesor.id).eq('estado', 'abierta');
    solOrient = so ?? 0;
  }

  const groups = [
    {
      title: 'Docencia',
      items: [
        { href: '/profesor', label: 'Inicio', icon: '🏠' },
        { href: '/profesor/grupos', label: 'Mis grupos', icon: '📚' },
        { href: '/profesor/horario', label: 'Mi horario', icon: '📅' },
        { href: '/profesor/calificaciones-proponer', label: 'Enviar calificaciones', icon: '📤' },
        { href: '/profesor/riesgo', label: 'Alumnos en riesgo', icon: '⚠️' },
        { href: '/profesor/conducta', label: 'Reportar conducta', icon: '📣' },
        { href: '/profesor/conducta/bandeja', label: 'Bandeja conducta', icon: '📥' },
      ],
    },
    ...(orientaCount > 0 ? [{
      title: '🧭 Orientación',
      items: [
        { href: '/profesor/orientacion', label: 'Mis grupos orientados', icon: '🎒', badge: orientaCount || undefined },
        { href: '/profesor/orientacion/calificaciones', label: 'Validar calificaciones', icon: '✅', badge: propPendientes || undefined },
        { href: '/profesor/orientacion/solicitudes', label: 'Acompañar solicitudes', icon: '🧭', badge: solOrient || undefined },
      ],
    }] : []),
    {
      title: 'Herramientas',
      items: [
        { href: '/profesor/tareas', label: 'Tareas', icon: '📝' },
        { href: '/profesor/examenes', label: 'Exámenes en línea', icon: '🧪' },
        { href: '/profesor/portafolio', label: 'Portafolio', icon: '🗂️' },
        { href: '/profesor/rubricas', label: 'Rúbricas', icon: '📋' },
        { href: '/profesor/chat', label: 'Chat de clase', icon: '💬' },
        { href: '/profesor/tutores', label: 'Directorio tutores', icon: '📞' },
        { href: '/profesor/tutorias', label: 'Mis tutorías', icon: '🗓️' },
        { href: '/profesor/planeaciones', label: 'Planeaciones', icon: '📝' },
        { href: '/profesor/eval-docente', label: 'Mi evaluación', icon: '🧭' },
        { href: '/profesor/constancia', label: 'Constancia de servicio', icon: '📄' },
        { href: '/profesor/mensajes', label: 'Mensajes', icon: '💌', badge: mensajesNL || undefined },
        { href: '/profesor/avisos', label: 'Avisos', icon: '📢' },
        { href: '/profesor/calendario', label: 'Calendario', icon: '📅' },
        { href: '/profesor/solicitudes', label: 'Solicitudes', icon: '💬', badge: pendientes || undefined },
        { href: '/profesor/perfil', label: 'Mi perfil', icon: '👤' },
      ],
    },
  ];

  const saludo = saludoPorHora();

  return (
    <PrivateShell
      role="profesor"
      groups={groups}
      userName={perfil.nombre ?? 'Docente'}
      userSub={perfil.email ?? undefined}
      logoUrl={sitioCfg?.logo_url ?? null}
    >
      <Topbar
        greeting={saludo}
        userName={(perfil.nombre ?? 'Docente').split(' ')[0]}
        userSub={perfil.email ?? undefined}
        role="profesor"
        notiCount={noLeidas}
        notiItems={notiItems}
      />
      <main className="flex-1 p-5 md:p-8 max-w-[1500px] w-full mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </PrivateShell>
  );
}
