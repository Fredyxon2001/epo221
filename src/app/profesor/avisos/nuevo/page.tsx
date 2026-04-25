import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { NuevoAvisoForm } from './NuevoAvisoForm';

export default async function NuevoAvisoProfesor() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  const { data: asigs } = await supabase.from('asignaciones')
    .select('grupo:grupos(id, grado, semestre, grupo, turno)')
    .eq('profesor_id', profesor?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');
  const { data: orient } = await supabase.from('grupos')
    .select('id, grado, semestre, grupo, turno').eq('orientador_id', profesor?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');

  const map = new Map<string, any>();
  for (const a of asigs ?? []) { const g: any = (a as any).grupo; if (g?.id) map.set(g.id, g); }
  for (const g of orient ?? []) map.set(g.id, g);
  const grupos = Array.from(map.values());

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Avisos"
        title="Nuevo aviso"
        actions={<Link href="/profesor/avisos" className="text-xs text-verde font-semibold hover:underline">← Volver</Link>}
      />
      <Card>
        <NuevoAvisoForm grupos={grupos} />
      </Card>
    </div>
  );
}
