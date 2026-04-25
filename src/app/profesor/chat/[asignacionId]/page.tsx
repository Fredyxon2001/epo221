import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { ChatGrupal } from '@/components/chat/ChatGrupal';

export default async function ChatAsignacionProfesor({ params }: { params: { asignacionId: string } }) {
  const supabase = createClient();
  const { data: asig } = await supabase.from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('id', params.asignacionId).maybeSingle();
  if (!asig) return <div className="p-5">Asignación no encontrada.</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow={`${(asig as any).grupo?.semestre}° ${(asig as any).grupo?.grupo}`}
        title={`💬 ${(asig as any).materia?.nombre}`}
        actions={<Link href="/profesor/chat" className="text-xs text-verde font-semibold hover:underline">← Volver</Link>}
      />
      <Card>
        {/* @ts-expect-error async server component */}
        <ChatGrupal asignacionId={params.asignacionId} title="Mensajes" />
      </Card>
    </div>
  );
}
