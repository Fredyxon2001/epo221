import { PageHeader, Card } from '@/components/privado/ui';
import { CalendarioView } from '@/components/calendario/CalendarioView';

export default function AlumnoCalendario() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Agenda"
        title="📅 Calendario escolar"
        description="Eventos, exámenes, suspensiones y entregas."
        actions={
          <a href="/calendario/ics" download className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30">
            📥 Sincronizar con mi calendario
          </a>
        }
      />
      <Card>
        {/* @ts-expect-error async server component */}
        <CalendarioView />
      </Card>
    </div>
  );
}
