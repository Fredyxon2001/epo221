// Lista completa de grupos del profesor (todos los ciclos).
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { codigoGrupo } from '@/lib/grupos';

export default async function MisGrupos() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profesor } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  const { data: asignaciones } = await supabase
    .from('asignaciones')
    .select(`
      id,
      materia:materias(nombre, semestre, tipo),
      grupo:grupos(grado, semestre, grupo, turno),
      ciclo:ciclos_escolares(codigo, periodo, activo)
    `)
    .eq('profesor_id', profesor?.id ?? '')
    .order('id');

  const lista = (asignaciones ?? []) as any[];
  const grupos: Record<string, any[]> = {};
  for (const a of lista) {
    const key = `${a.ciclo?.codigo ?? '—'} ${a.ciclo?.periodo ?? ''} ${a.ciclo?.activo ? '●' : ''}`.trim();
    (grupos[key] ??= []).push(a);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Asignaciones"
        title="Mis grupos"
        description="Entra a cada grupo para capturar calificaciones y faltas."
      />

      {lista.length === 0 && (
        <Card><EmptyState icon="📭" title="Sin grupos asignados" description="Cuando Control Escolar te asigne un grupo aparecerá aquí." /></Card>
      )}

      {Object.entries(grupos).map(([ciclo, items]) => (
        <Card key={ciclo} eyebrow="Ciclo" title={ciclo}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((a: any) => (
              <Link
                key={a.id}
                href={`/profesor/grupo/${a.id}`}
                className="group relative block rounded-xl border border-gray-200 hover:border-verde hover:shadow-lg hover:shadow-verde/10 transition p-4 bg-white overflow-hidden"
              >
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-verde-claro/20 blur-2xl group-hover:bg-dorado/30 transition" aria-hidden />
                <div className="relative">
                  <div className="font-serif text-base text-verde-oscuro leading-tight">{a.materia?.nombre}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Grupo <strong>{codigoGrupo(a.grupo?.grado ?? Math.ceil((a.grupo?.semestre ?? 1) / 2), a.grupo?.grupo ?? 0)}</strong> · {a.grupo?.semestre}° · {a.grupo?.turno}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge tone="dorado" size="sm">{a.materia?.tipo ?? 'Materia'}</Badge>
                    <span className="text-[11px] text-verde font-semibold group-hover:translate-x-1 transition">Abrir →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
