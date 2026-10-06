import { requireIdentity } from "@/lib/security/access";
import { scopedClient } from '@/lib/security/resources';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card } from '@/components/privado/ui';
import { ChatGrupal } from '@/components/chat/ChatGrupal';

export default async function ChatAsignacionAlumno(props: { params: Promise<{ asignacionId: string }> }) {
  await requireIdentity(["alumno"]);

  const params = await props.params;
  const auth = (await createClient());
  const supabase = (await scopedClient());
  const { data: asig } = await supabase.from('asignaciones')
    .select('id, materia:materias(nombre), profesor:profesores(perfil:perfiles(nombre))')
    .eq('id', params.asignacionId).maybeSingle();
  if (!asig) return <div className="p-5">Asignación no encontrada.</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow={`Prof. ${(asig as any).profesor?.perfil?.nombre ?? '—'}`}
        title={`💬 ${(asig as any).materia?.nombre}`}
        actions={<Link href="/alumno/chat" className="text-xs text-verde font-semibold hover:underline">← Volver</Link>}
      />
      <Card>
        <ChatGrupal asignacionId={params.asignacionId} title="Mensajes" />
      </Card>
    </div>
  );
}
