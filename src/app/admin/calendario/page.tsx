import { PageHeader, Card } from '@/components/privado/ui';
import { CalendarioView } from '@/components/calendario/CalendarioView';
import { NuevoEventoForm } from './NuevoEventoForm';
import { createClient } from '@/lib/supabase/server';

export default async function AdminCalendario() {
  const supabase = createClient();
  const { data: grupos } = await supabase.from('grupos').select('id, grado, semestre, grupo, turno').order('semestre').limit(200);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Agenda escolar"
        title="📅 Calendario"
        description="Publica eventos, exámenes, suspensiones y entregas. Los usuarios pueden sincronizarlos con Google/Apple/Outlook."
        actions={
          <a href="/calendario/ics" download className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30">
            📥 Descargar .ics
          </a>
        }
      />

      <Card eyebrow="Nuevo" title="Agregar evento">
        <NuevoEventoForm grupos={grupos ?? []} />
      </Card>

      <Card eyebrow="Agenda" title="Eventos próximos">
        {/* @ts-expect-error async server component */}
        <CalendarioView />
      </Card>
    </div>
  );
}
