// Lista de avisos visibles para el usuario actual, con marcado automático de lectura.
import { createClient } from '@/lib/supabase/server';
import { MarcarLeidoClient } from './MarcarLeidoClient';

export async function AvisosList({ limit = 50 }: { limit?: number }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: avisos } = await supabase
    .from('avisos')
    .select('id, titulo, cuerpo, prioridad, alcance, grupo_ids, created_at, vence_at, adjunto_url, adjunto_nombre, autor_tipo')
    .or(`vence_at.is.null,vence_at.gte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  const ids = (avisos ?? []).map((a: any) => a.id);
  const { data: lecturas } = ids.length
    ? await supabase.from('avisos_lecturas').select('aviso_id').in('aviso_id', ids).eq('user_id', user.id)
    : { data: [] as any[] };
  const leidos = new Set((lecturas ?? []).map((l: any) => l.aviso_id));

  const priColor: Record<string, string> = {
    normal: 'border-gray-200 bg-white',
    importante: 'border-dorado bg-dorado/5',
    urgente: 'border-rose-400 bg-rose-50',
  };
  const priIcon: Record<string, string> = { normal: '📢', importante: '⭐', urgente: '🚨' };

  if (!avisos || avisos.length === 0) {
    return <div className="text-sm text-gray-500 py-8 text-center">Sin avisos vigentes.</div>;
  }

  return (
    <div className="space-y-3">
      {avisos.map((a: any) => {
        const leido = leidos.has(a.id);
        return (
          <div key={a.id} className={`border-2 rounded-xl p-4 ${priColor[a.prioridad]}`}>
            <MarcarLeidoClient avisoId={a.id} yaLeido={leido} />
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{priIcon[a.prioridad]}</span>
                <span className="font-serif text-lg text-verde-oscuro">{a.titulo}</span>
                {!leido && (
                  <span className="text-[10px] bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full uppercase">Nuevo</span>
                )}
                {a.prioridad === 'urgente' && (
                  <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">Urgente</span>
                )}
              </div>
              <div className="text-[11px] text-gray-500 whitespace-nowrap">
                {new Date(a.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{a.cuerpo}</div>
            {a.adjunto_nombre && (
              <div className="text-xs text-verde mt-2">📎 {a.adjunto_nombre}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
