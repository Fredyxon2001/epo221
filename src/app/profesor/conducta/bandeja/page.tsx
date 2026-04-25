// Bandeja del orientador: reportes de conducta de los alumnos de sus grupos orientados.
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { AtenderForm } from './AtenderForm';

export default async function BandejaConducta({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = (searchParams.tab ?? 'enviado') as string;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Alumnos de grupos orientados
  const { data: orient } = await supabase.from('grupos')
    .select('id').eq('orientador_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');
  const gruposIds = (orient ?? []).map((g: any) => g.id);

  let alumnoIds: string[] = [];
  if (gruposIds.length) {
    const { data: insc } = await supabase.from('inscripciones')
      .select('alumno_id').in('grupo_id', gruposIds).eq('ciclo_id', ciclo?.id ?? '');
    alumnoIds = Array.from(new Set((insc ?? []).map((i: any) => i.alumno_id)));
  }

  let items: any[] = [];
  if (alumnoIds.length) {
    let q = supabase.from('reportes_conducta')
      .select(`id, tipo, categoria, descripcion, fecha, estado, acciones_tomadas, notas_orientador,
               alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula),
               profesor:profesores(nombre, apellido_paterno)`)
      .in('alumno_id', alumnoIds)
      .order('created_at', { ascending: false });
    if (tab !== 'todos') q = q.eq('estado', tab);
    const { data } = await q;
    items = data ?? [];
  }

  const tabs = [
    { k: 'enviado', l: 'Nuevos', icon: '📥' },
    { k: 'revisado', l: 'Revisados', icon: '👀' },
    { k: 'atendido', l: 'Atendidos', icon: '✅' },
    { k: 'archivado', l: 'Archivados', icon: '📦' },
    { k: 'todos', l: 'Todos', icon: '📂' },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Orientación"
        title="📥 Bandeja de conducta"
        description="Reportes de los alumnos de tus grupos orientados. Recuerda dar seguimiento y registrar notas."
        actions={<Link href="/profesor/conducta" className="text-xs text-verde font-semibold hover:underline">+ Nuevo reporte</Link>}
      />

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.k}
            href={`/profesor/conducta/bandeja?tab=${t.k}`}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap ${tab === t.k ? 'text-verde-oscuro border-b-2 border-verde' : 'text-gray-500 hover:text-verde-oscuro'}`}
          >
            {t.icon} {t.l}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card><EmptyState icon="🎉" title="Nada por atender" description="No hay reportes en esta bandeja." /></Card>
      ) : (
        <div className="space-y-3">
          {items.map((r: any) => (
            <Card key={r.id} padding="none">
              <div className="p-4 border-b flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={r.tipo === 'positivo' ? 'verde' : 'rosa'} size="sm">
                      {r.tipo === 'positivo' ? '⭐ Positivo' : '⚠️ Negativo'}
                    </Badge>
                    <Badge tone="ambar" size="sm">{r.estado}</Badge>
                    <span className="text-xs text-gray-500">{r.fecha}</span>
                  </div>
                  <div className="font-serif text-lg text-verde-oscuro mt-1">
                    {r.alumno?.apellido_paterno} {r.alumno?.apellido_materno ?? ''} {r.alumno?.nombre}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.categoria} · Reportado por {r.profesor?.apellido_paterno} {r.profesor?.nombre}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-crema/30 space-y-2">
                <div className="text-sm bg-white border rounded p-3 whitespace-pre-wrap">{r.descripcion}</div>
                {r.acciones_tomadas && (
                  <div className="text-xs text-gray-600">
                    <strong>Acciones del docente:</strong> {r.acciones_tomadas}
                  </div>
                )}
                {r.notas_orientador && (
                  <div className="bg-verde-claro/20 border-l-4 border-verde p-2 text-xs">
                    <strong>Nota del orientador:</strong> {r.notas_orientador}
                  </div>
                )}
                {r.estado !== 'archivado' && <AtenderForm id={r.id} estadoActual={r.estado} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
