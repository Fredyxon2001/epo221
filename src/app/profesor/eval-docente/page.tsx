import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function EvalDocenteResultados() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();

  if (!prof) return <div className="p-5">No eres docente.</div>;

  const { data: rows, error } = await supabase.rpc('eval_docente_agregado', {
    p_profesor_id: prof.id, p_periodo_id: null,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Retroalimentación"
        title="🧭 Mi evaluación como docente"
        description="Promedios y comentarios anónimos de tus alumnos por materia/grupo. Agregado protege la identidad."
      />

      <Card>
        {error && <div className="text-xs text-rose-700">{error.message}</div>}
        {(rows ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Aún no hay resultados.</p>
        ) : (
          <div className="space-y-4">
            {rows!.map((r: any) => (
              <div key={r.asignacion_id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <div className="font-semibold text-sm">{r.materia}</div>
                    <div className="text-xs text-gray-500">{r.grupo} · {r.total} respuestas</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(r.promedios ?? {}).map(([k, v]: any) => (
                    <div key={k} className="flex justify-between items-center bg-gray-50 rounded p-2 text-xs">
                      <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                      <strong className="text-verde-oscuro tabular-nums">{Number(v).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                {(r.comentarios ?? []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Comentarios anónimos</div>
                    {(r.comentarios as string[]).map((c, i) => (
                      <div key={i} className="text-xs bg-verde-claro/20 border-l-2 border-verde p-2 italic">"{c}"</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
