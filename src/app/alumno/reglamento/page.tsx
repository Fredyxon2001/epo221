import { createClient } from '@/lib/supabase/server';
import { firmarReglamento } from './actions';

export default async function ReglamentoAlumno() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: vigente } = await supabase
    .from('reglamento_versiones')
    .select('*')
    .eq('vigente', true)
    .maybeSingle();

  if (!vigente) {
    return <div className="p-6 max-w-3xl"><h1 className="font-serif text-3xl text-verde mb-4">Reglamento</h1><p className="text-sm text-gray-500">No hay reglamento publicado todavía.</p></div>;
  }

  const { data: firma } = await supabase
    .from('reglamento_firmas')
    .select('firmado_at')
    .eq('reglamento_id', vigente.id)
    .eq('firmante_id', user.id)
    .maybeSingle();

  return (
    <div className="p-6 max-w-3xl space-y-4">
      <h1 className="font-serif text-3xl text-verde">📜 Reglamento institucional</h1>
      <div className="text-sm text-gray-500">{vigente.titulo} — v{vigente.version}</div>

      <article className="bg-white rounded-lg p-6 shadow-sm prose prose-sm max-w-none whitespace-pre-wrap">
        {vigente.contenido_md}
      </article>

      {firma ? (
        <div className="bg-verde-claro/20 border border-verde rounded-lg p-4">
          <div className="text-verde-oscuro font-semibold">✅ Firmado digitalmente</div>
          <div className="text-xs text-gray-600 mt-1">{new Date(firma.firmado_at).toLocaleString('es-MX')}</div>
        </div>
      ) : (
        <form action={firmarReglamento} className="bg-amber-50 border border-amber-300 rounded-lg p-4 space-y-3">
          <input type="hidden" name="reglamento_id" value={vigente.id} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required className="mt-1" />
            <span>He leído y acepto el reglamento institucional. Entiendo que esta firma digital tiene validez para fines internos.</span>
          </label>
          <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded text-sm">✍️ Firmar digitalmente</button>
        </form>
      )}
    </div>
  );
}
