// Perfil editable del director
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { PerfilEditor } from '@/components/perfil/PerfilEditor';

export default async function PerfilDirector() {
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
    cargo: perfil.cargo ?? 'Dirección Escolar',
    bio: perfil.bio ?? '',
    avatar_url: perfil.avatar_url ?? null,
    rol: perfil.rol,
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Mi cuenta"
        title="🏛️ Mi perfil — Dirección"
        description="Edita tu foto, datos de contacto y cómo apareces en comunicaciones institucionales."
      />

      <PerfilEditor data={data} esProfesor={false} />

      <Card>
        <div className="text-xs text-gray-500 space-y-1">
          <p>📌 Tu nombre aparece como firma en avisos institucionales y constancias.</p>
          <p>📌 Tu foto aparece en el Topbar y en las notificaciones que envías.</p>
        </div>
      </Card>
    </div>
  );
}
