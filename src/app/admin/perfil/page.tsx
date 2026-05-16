// Perfil editable del administrador / staff / finanzas
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { PerfilEditor } from '@/components/perfil/PerfilEditor';

export default async function PerfilAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, email, telefono, cargo, bio, avatar_url, apellido_paterno, apellido_materno, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) return <div className="p-6">Perfil no disponible.</div>;

  const data = {
    nombre: perfil.nombre?.split(' ')[0] || '',
    apellido_paterno: perfil.apellido_paterno ?? '',
    apellido_materno: perfil.apellido_materno ?? '',
    email: perfil.email ?? '',
    telefono: perfil.telefono ?? '',
    cargo: perfil.cargo ?? '',
    bio: perfil.bio ?? '',
    avatar_url: perfil.avatar_url ?? null,
    rol: perfil.rol,
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Mi cuenta"
        title="👤 Mi perfil"
        description="Edita tu foto, datos de contacto y cómo apareces en el sistema."
      />

      <PerfilEditor data={data} esProfesor={false} />

      <Card>
        <div className="text-xs text-gray-500 space-y-1">
          <p>📌 <strong>Rol actual:</strong> {perfil.rol}</p>
          <p>📌 Para cambiar tu contraseña, otro administrador puede resetearla desde <a href="/admin/usuarios" className="text-verde underline">usuarios</a>.</p>
        </div>
      </Card>
    </div>
  );
}
