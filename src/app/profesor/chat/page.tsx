import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function ChatProfesorIndex() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { data: asigs } = await supabase.from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('profesor_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Comunicación" title="💬 Chat de clase" description="Un chat grupal por materia para avisos, dudas y archivos." />
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(asigs ?? []).map((a: any) => (
            <Link key={a.id} href={`/profesor/chat/${a.id}`}
              className="border border-gray-200 rounded-xl p-4 hover:border-verde hover:bg-verde-claro/10 transition">
              <div className="font-semibold text-sm">{a.materia?.nombre}</div>
              <div className="text-xs text-gray-500">{a.grupo?.semestre}° {a.grupo?.grupo} {a.grupo?.turno ?? ''}</div>
            </Link>
          ))}
          {(asigs ?? []).length === 0 && <p className="text-sm text-gray-500 py-6 text-center">No tienes asignaciones activas.</p>}
        </div>
      </Card>
    </div>
  );
}
