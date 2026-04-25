import Link from 'next/link';
import { PageHeader } from '@/components/privado/ui';
import { AvisosList } from '@/components/avisos/AvisosList';

export default function ProfesorAvisos() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Comunicación"
        title="📢 Avisos"
        description="Publica comunicados y ve los tuyos con seguimiento de lectura."
        actions={
          <Link href="/profesor/avisos/nuevo" className="text-sm font-semibold bg-verde hover:bg-verde-oscuro text-white px-4 py-2 rounded-xl shadow-md shadow-verde/30">
            + Nuevo aviso
          </Link>
        }
      />
      {/* @ts-expect-error async server component */}
      <AvisosList />
    </div>
  );
}
