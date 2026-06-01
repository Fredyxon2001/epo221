import { redirect } from 'next/navigation';
import { PrivateShell } from '@/components/privado/PrivateShell';
import { Topbar } from '@/components/privado/Topbar';
import { PageTransition } from '@/components/privado/PageTransition';
import { getAlumnoActual } from '@/lib/queries';
import { getNotificaciones } from '@/lib/notificaciones';
import { saludoPorHora } from '@/lib/saludo';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export default async function AlumnoLayout({ children }: { children: React.ReactNode }) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/login');

  let alumno = await getAlumnoActual();

  // AUTO-VINCULACIÓN: si no hay match por perfil_id, intentar por email (case-insensitive)
  // y vincular automáticamente. Esto cubre el caso de cookies/sessions viejos.
  if (!alumno && user.email) {
    const admin = adminClient();
    // Intentar match por email del usuario contra cualquier ficha sin perfil_id o con perfil_id viejo
    // 1) Buscar alumno por email del propio user (que puede ser nombre.apellido@epo221.local)
    //    cruzando contra el email que tengamos en perfiles.
    const { data: alumnoPorEmail } = await admin
      .from('alumnos')
      .select('*, perfiles!inner(email)')
      .ilike('perfiles.email', user.email)
      .is('deleted_at', null)
      .maybeSingle();
    if (alumnoPorEmail) {
      // Re-vincular
      await admin.from('alumnos').update({ perfil_id: user.id }).eq('id', alumnoPorEmail.id);
      alumno = alumnoPorEmail as any;
    } else {
      // 2) Match por nombre.apellido en el email del user (ej. raul.flores@epo221.local)
      const localPart = user.email.split('@')[0].toLowerCase();
      const partes = localPart.split('.');
      if (partes.length >= 2) {
        const nombre = partes[0];
        const apellido = partes[1];
        const { data: byName } = await admin
          .from('alumnos')
          .select('*')
          .ilike('nombre', `%${nombre}%`)
          .ilike('apellido_paterno', `%${apellido}%`)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();
        if (byName) {
          await admin.from('alumnos').update({ perfil_id: user.id }).eq('id', byName.id);
          alumno = byName as any;
        }
      }
    }
  }

  // Si AÚN no hay alumno, mostrar mensaje (con info diagnóstica)
  if (!alumno) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-crema p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="font-serif text-2xl text-verde-oscuro mb-3">Tu cuenta no está vinculada</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tu sesión está activa pero no encontramos tu ficha de alumno en el sistema.
            Acércate a <strong>Control Escolar</strong> y muéstrales esta información:
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-left mb-4 font-mono">
            <div><strong>Email:</strong> {user.email}</div>
            <div className="break-all"><strong>ID:</strong> {user.id}</div>
          </div>
          <a href="/cambiar-password" className="block text-xs text-verde hover:underline mb-3">Cambiar mi contraseña</a>
          <a
            href="/api/logout"
            className="inline-block text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded"
          >
            Cerrar sesión
          </a>
        </div>
      </div>
    );
  }

  // Contador de solicitudes abiertas del alumno (badge)
  const { count: solicitudesAbiertas } = await supabase
    .from('solicitudes_revision')
    .select('id', { count: 'exact', head: true })
    .eq('alumno_id', alumno.id)
    .in('estado', ['abierta', 'respondida']);

  // Mensajes no leídos del alumno
  let mensajesNL = 0;
  const { data: hilos } = await supabase.from('mensajes_hilos').select('id').eq('alumno_id', alumno.id);
  const hIds = (hilos ?? []).map((h: any) => h.id);
  if (hIds.length) {
    const { count } = await supabase.from('mensajes').select('id', { count: 'exact', head: true })
      .in('hilo_id', hIds).is('leido_at', null).eq('autor_tipo', 'profesor');
    mensajesNL = count ?? 0;
  }

  const { items: notiItems, noLeidas } = await getNotificaciones(user!.id, 10);
  const { data: sitioCfg } = await supabase.from('sitio_config').select('logo_url').maybeSingle();

  const groups = [
    {
      title: 'Académico',
      items: [
        { href: '/alumno', label: 'Inicio', icon: '🏠' },
        { href: '/alumno/horario', label: 'Mi horario', icon: '📅' },
        { href: '/alumno/calificaciones', label: 'Calificaciones', icon: '📊' },
        { href: '/alumno/boleta', label: 'Boleta', icon: '📄' },
        { href: `/api/kardex/${alumno.id}`, label: 'Kardex (PDF)', icon: '📑' },
        { href: '/alumno/tareas', label: 'Tareas', icon: '📝' },
        { href: '/alumno/examenes', label: 'Exámenes', icon: '🧪' },
        { href: '/alumno/portafolio', label: 'Portafolio', icon: '🗂️' },
        { href: '/alumno/extraordinarios', label: 'Extraordinarios', icon: '📘' },
        { href: '/alumno/chat', label: 'Chat de clase', icon: '💬' },
        { href: '/alumno/tutorias', label: 'Tutorías', icon: '🗓️' },
        { href: '/alumno/eval-docente', label: 'Evaluar docentes', icon: '🧭' },
        { href: '/alumno/solicitudes', label: 'Mis solicitudes', icon: '💬', badge: solicitudesAbiertas || undefined },
        { href: '/alumno/mensajes', label: 'Mensajes', icon: '💌', badge: mensajesNL || undefined },
        { href: '/alumno/avisos', label: 'Avisos', icon: '📢' },
        { href: '/alumno/calendario', label: 'Calendario', icon: '📅' },
      ],
    },
    {
      title: 'Administrativo',
      items: [
        { href: '/alumno/estado-cuenta', label: 'Estado de cuenta', icon: '💳' },
        { href: '/alumno/ficha', label: 'Mi ficha', icon: '👤' },
        { href: '/cambiar-password', label: 'Cambiar contraseña', icon: '🔒' },
        { href: '/alumno/reglamento', label: 'Reglamento', icon: '📜' },
        { href: '/app-movil', label: '📱 Descargar app móvil', icon: '📲' },
      ],
    },
  ];

  const saludo = saludoPorHora();

  return (
    <PrivateShell
      role="alumno"
      groups={groups}
      userName={alumno.nombre}
      userSub={alumno.matricula ?? alumno.curp}
      logoUrl={sitioCfg?.logo_url ?? null}
    >
      <Topbar
        greeting={saludo}
        userName={alumno.nombre.split(' ')[0]}
        userSub={alumno.matricula ?? alumno.curp}
        role="alumno"
        notiCount={noLeidas}
        notiItems={notiItems}
      />
      <main className="flex-1 p-5 md:p-8 max-w-[1500px] w-full mx-auto">
        <PageTransition>{children}</PageTransition>
      </main>
    </PrivateShell>
  );
}
