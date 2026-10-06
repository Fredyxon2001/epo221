import { requireIdentity } from "@/lib/security/access";
import { PageHeader } from '@/components/privado/ui';
import { AvisosList } from '@/components/avisos/AvisosList';

export default async function AlumnoAvisos() {
  await requireIdentity(["alumno"]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="📢 Avisos"
        description="Comunicados oficiales de la escuela y de tus docentes. Los leídos se marcan automáticamente."
      />
      <AvisosList />
    </div>
  );
}
