// Perfil editable del docente / orientador.
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { PerfilEditor } from '@/components/perfil/PerfilEditor';

export default async function PerfilProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Datos del perfil base
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, email, telefono, cargo, bio, avatar_url, apellido_paterno, apellido_materno, rol')
    .eq('id', user.id)
    .maybeSingle();

  // Datos del profesor (si existe)
  const { data: prof } = await supabase
    .from('profesores')
    .select('id, nombre, apellido_paterno, apellido_materno, rfc, email, telefono, foto_url')
    .eq('perfil_id', user.id)
    .maybeSingle();

  if (!perfil) return <div className="p-6">Perfil no disponible.</div>;

  // Si hay datos en profesores, los preferimos para mostrar
  const data = {
    nombre: prof?.nombre || perfil.nombre?.split(' ')[0] || '',
    apellido_paterno: prof?.apellido_paterno ?? perfil.apellido_paterno ?? '',
    apellido_materno: prof?.apellido_materno ?? perfil.apellido_materno ?? '',
    email: perfil.email ?? prof?.email ?? '',
    telefono: prof?.telefono ?? perfil.telefono ?? '',
    cargo: perfil.cargo ?? '',
    bio: perfil.bio ?? '',
    avatar_url: perfil.avatar_url ?? prof?.foto_url ?? null,
    rfc: prof?.rfc ?? '',
    rol: perfil.rol,
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Mi cuenta"
        title="👤 Mi perfil"
        description="Edita tu foto, datos de contacto y configura cómo apareces en el sistema."
      />

      <PerfilEditor data={data} esProfesor={true} />

      <Card>
        <div className="text-xs text-gray-500 space-y-1">
          <p>📌 <strong>¿Quieres cambiar tu contraseña?</strong> Pídele al administrador que te resetée el password desde <code>/admin/usuarios</code>.</p>
          <p>📌 <strong>¿Datos oficiales incorrectos?</strong> (CURP, RFC, fecha de nacimiento) — contacta a Control Escolar para corrección documentada.</p>
        </div>
      </Card>
    </div>
  );
}
