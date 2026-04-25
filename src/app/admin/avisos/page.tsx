import Link from 'next/link';
import { PageHeader, Card } from '@/components/privado/ui';
import { createClient } from '@/lib/supabase/server';
import { AvisosList } from '@/components/avisos/AvisosList';
import { NuevoAvisoForm } from '@/app/profesor/avisos/nuevo/NuevoAvisoForm';

export default async function AdminAvisos() {
  const supabase = createClient();
  const { data: grupos } = await supabase.from('grupos').select('id, grado, semestre, grupo, turno').order('semestre').limit(200);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader eyebrow="Comunicación" title="📢 Avisos escolares" description="Crea comunicados oficiales con confirmación de lectura." />

      <Card eyebrow="Nuevo" title="Publicar aviso">
        <NuevoAvisoForm grupos={grupos ?? []} />
      </Card>

      <Card eyebrow="Historial" title="Avisos vigentes">
        {/* @ts-expect-error async server component */}
        <AvisosList />
      </Card>
    </div>
  );
}
