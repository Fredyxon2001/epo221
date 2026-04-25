// Vista agenda del calendario escolar (server component).
import { createClient } from '@/lib/supabase/server';

const tipoIcon: Record<string, string> = {
  examen: '📝', junta: '🤝', suspension: '🚫', evento: '🎉',
  entrega: '📦', ceremonia: '🎓', capacitacion: '🧠', otro: '📌',
};
const tipoColor: Record<string, string> = {
  examen: 'bg-rose-100 border-rose-300 text-rose-800',
  junta: 'bg-sky-100 border-sky-300 text-sky-800',
  suspension: 'bg-gray-100 border-gray-300 text-gray-700',
  evento: 'bg-verde-claro/30 border-verde text-verde-oscuro',
  entrega: 'bg-amber-100 border-amber-300 text-amber-800',
  ceremonia: 'bg-purple-100 border-purple-300 text-purple-800',
  capacitacion: 'bg-indigo-100 border-indigo-300 text-indigo-800',
  otro: 'bg-gray-50 border-gray-200 text-gray-700',
};

export async function CalendarioView({ limit = 100 }: { limit?: number }) {
  const supabase = createClient();
  const { data: eventos } = await supabase
    .from('eventos_calendario')
    .select('id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, lugar')
    .gte('fecha_inicio', new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString())
    .order('fecha_inicio')
    .limit(limit);

  if (!eventos?.length) {
    return <div className="text-sm text-gray-500 py-8 text-center">Sin eventos próximos.</div>;
  }

  // Agrupar por mes
  const porMes = new Map<string, any[]>();
  for (const e of eventos) {
    const d = new Date(e.fecha_inicio);
    const key = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
    if (!porMes.has(key)) porMes.set(key, []);
    porMes.get(key)!.push(e);
  }

  return (
    <div className="space-y-6">
      {Array.from(porMes.entries()).map(([mes, evs]) => (
        <div key={mes}>
          <h3 className="text-xs uppercase tracking-[0.3em] text-verde font-semibold mb-3">{mes}</h3>
          <div className="space-y-2">
            {evs.map((e) => {
              const d = new Date(e.fecha_inicio);
              const fin = e.fecha_fin ? new Date(e.fecha_fin) : null;
              return (
                <div key={e.id} className={`flex gap-3 border-2 rounded-xl p-3 ${tipoColor[e.tipo] ?? tipoColor.otro}`}>
                  <div className="text-center min-w-[3.5rem]">
                    <div className="text-2xl font-serif font-bold leading-none">{d.getDate()}</div>
                    <div className="text-[10px] uppercase tracking-wider">{d.toLocaleDateString('es-MX', { weekday: 'short' })}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{tipoIcon[e.tipo] ?? '📌'}</span>
                      <span className="font-semibold">{e.titulo}</span>
                    </div>
                    {e.descripcion && <div className="text-xs mt-1 opacity-90 whitespace-pre-wrap">{e.descripcion}</div>}
                    <div className="text-[11px] mt-1 opacity-70">
                      {e.todo_el_dia
                        ? 'Todo el día'
                        : `${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}${fin ? ' – ' + fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}`}
                      {e.lugar && ` · 📍 ${e.lugar}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
