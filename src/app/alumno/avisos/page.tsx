import { PageHeader } from '@/components/privado/ui';
import { AvisosList } from '@/components/avisos/AvisosList';

export default function AlumnoAvisos() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="📢 Avisos"
        description="Comunicados oficiales de la escuela y de tus docentes. Los leídos se marcan automáticamente."
      />
      {/* @ts-expect-error async server component */}
      <AvisosList />
    </div>
  );
}
