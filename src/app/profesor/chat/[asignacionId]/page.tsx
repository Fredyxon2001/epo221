import { requireIdentity } from "@/lib/security/access";
import { scopedClient } from '@/lib/security/resources';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card } from '@/components/privado/ui';
import { ChatGrupal } from '@/components/chat/ChatGrupal';

export default async function ChatAsignacionProfesor(props: { params: Promise<{ asignacionId: string }> }) {
  await requireIdentity(["profesor","admin","staff","director"]);

  const params = await props.params;
  const auth = (await createClient());
  const supabase = (await scopedClient());
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
        <ChatGrupal asignacionId={params.asignacionId} title="Mensajes" />
      </Card>
    </div>
  );
}
