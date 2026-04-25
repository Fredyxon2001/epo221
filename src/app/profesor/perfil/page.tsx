// Perfil del docente: foto de perfil + datos básicos (solo lectura por ahora).
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { AvatarUploader } from '@/components/AvatarUploader';

export default async function PerfilProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: p } = await supabase
    .from('profesores')
    .select('id, nombre, apellido_paterno, apellido_materno, rfc, email, telefono, foto_url')
    .eq('perfil_id', user!.id)
    .maybeSingle();

  if (!p) return <div className="p-6">Perfil no disponible.</div>;
  const iniciales = `${p.nombre?.[0] ?? ''}${p.apellido_paterno?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Mi cuenta"
        title="Mi perfil"
        description="Actualiza tu foto y revisa tus datos registrados."
      />

      <AvatarUploader fotoActual={p.foto_url} iniciales={iniciales} />

      <Card eyebrow="Datos" title="Información registrada">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info k="Nombre" v={`${p.nombre} ${p.apellido_paterno} ${p.apellido_materno ?? ''}`} />
          <Info k="RFC" v={p.rfc ?? '—'} mono />
          <Info k="Correo" v={p.email ?? '—'} />
          <Info k="Teléfono" v={p.telefono ?? '—'} />
        </dl>
        <p className="text-xs text-gray-400 mt-4">
          Si necesitas actualizar tus datos oficiales, contacta a la Dirección.
        </p>
      </Card>
    </div>
  );
}

function Info({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-gray-500">{k}</dt>
      <dd className={mono ? 'font-mono text-xs' : ''}>{v}</dd>
    </>
  );
}
