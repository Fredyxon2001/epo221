import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { NuevaTareaForm } from './NuevaTareaForm';

export default async function NuevaTareaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { data: asigs } = await supabase.from('asignaciones')
    .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('profesor_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');

  const { data: rubricas } = await supabase.from('rubricas')
    .select('id, nombre').eq('profesor_id', prof?.id ?? '').order('created_at', { ascending: false });

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Tareas"
        title="Nueva tarea"
        actions={<Link href="/profesor/tareas" className="text-xs text-verde font-semibold hover:underline">← Volver</Link>}
      />
      <Card>
        <NuevaTareaForm asignaciones={asigs ?? []} rubricas={rubricas ?? []} />
      </Card>
    </div>
  );
}
