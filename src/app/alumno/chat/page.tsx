import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function ChatAlumnoIndex() {
  const alumno = await getAlumnoActual();
  if (!alumno) return null;
  const supabase = createClient();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { data: insc } = await supabase.from('inscripciones').select('grupo_id').eq('alumno_id', alumno.id);
  const gids = (insc ?? []).map((i: any) => i.grupo_id);
  const { data: asigs } = gids.length
    ? await supabase.from('asignaciones')
        .select('id, materia:materias(nombre), profesor:profesores(perfil:perfiles(nombre))')
        .in('grupo_id', gids).eq('ciclo_id', ciclo?.id ?? '')
    : { data: [] as any[] };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Comunicación" title="💬 Chat de mis clases" description="Un chat por materia para comunicarte con tu docente y compañeros." />
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(asigs ?? []).map((a: any) => (
            <Link key={a.id} href={`/alumno/chat/${a.id}`}
              className="border border-gray-200 rounded-xl p-4 hover:border-verde hover:bg-verde-claro/10 transition">
              <div className="font-semibold text-sm">{a.materia?.nombre}</div>
              <div className="text-xs text-gray-500">Prof. {a.profesor?.perfil?.nombre ?? '—'}</div>
            </Link>
          ))}
          {(asigs ?? []).length === 0 && <p className="text-sm text-gray-500 py-6 text-center">No hay materias activas.</p>}
        </div>
      </Card>
    </div>
  );
}
