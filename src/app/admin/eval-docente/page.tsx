import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { NuevoPeriodoForm } from './NuevoPeriodoForm';
import { CerrarPeriodoBtn } from './CerrarPeriodoBtn';

export default async function AdminEvalDocente() {
  const supabase = createClient();
  const { data: periodos } = await supabase.from('eval_docente_periodos')
    .select('*').order('created_at', { ascending: false });

  // Conteo de respuestas por periodo
  const counts: Record<string, number> = {};
  for (const p of periodos ?? []) {
    const { count } = await supabase.from('eval_docente_respuestas')
      .select('id', { count: 'exact', head: true }).eq('periodo_id', (p as any).id);
    counts[(p as any).id] = count ?? 0;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Retroalimentación institucional"
        title="🧭 Evaluación docente"
        description="Abre periodos donde los alumnos evalúan anónimamente a sus docentes en diversas dimensiones."
      />

      <Card eyebrow="Nuevo periodo" title="Abrir evaluación">
        <NuevoPeriodoForm />
      </Card>

      <Card eyebrow={`Periodos (${periodos?.length ?? 0})`} title="Historial">
        {(periodos ?? []).length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Aún no hay periodos.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {periodos!.map((p: any) => (
              <div key={p.id} className="py-3 flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{p.nombre}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(p.abierta_desde).toLocaleDateString('es-MX')} → {new Date(p.abierta_hasta).toLocaleDateString('es-MX')} · Escala 1–{p.escala_max}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {(p.dimensiones as any[])?.length ?? 0} dimensiones · <strong>{counts[p.id]}</strong> respuestas
                  </div>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.activa ? 'bg-verde-claro/40 text-verde-oscuro' : 'bg-gray-200 text-gray-600'}`}>
                    {p.activa ? 'Activa' : 'Cerrada'}
                  </span>
                  {p.activa && <CerrarPeriodoBtn id={p.id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
