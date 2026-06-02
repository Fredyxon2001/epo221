import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { firmarReglamento } from './actions';
import { ReglamentoView } from '@/components/ReglamentoView';
import { FirmarReglamentoForm } from './FirmarReglamentoForm';

export default async function ReglamentoAlumno() {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const { data: vigente } = await supabase
    .from('reglamento_versiones')
    .select('*')
    .eq('vigente', true)
    .maybeSingle();

  if (!vigente) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <div className="text-5xl mb-3">📜</div>
          <h1 className="font-serif text-2xl text-verde-oscuro">Reglamento</h1>
          <p className="text-sm text-gray-500 mt-2">No hay reglamento publicado todavía.</p>
        </div>
      </div>
    );
  }

  const { data: firma } = await supabase
    .from('reglamento_firmas')
    .select('firmado_at')
    .eq('reglamento_id', vigente.id)
    .eq('firmante_id', user.id)
    .maybeSingle();

  // Contar capítulos para el índice
  const capitulos = (vigente.contenido_md.match(/^##\s+(.+)$/gm) || [])
    .map((l: string) => l.replace(/^##\s+/, ''));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* ── Portada institucional ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio text-white shadow-xl shadow-verde/20">
        <div className="aurora absolute inset-0 opacity-30" aria-hidden />
        <div
          className="absolute -right-10 -top-10 w-56 h-56 opacity-[0.08] font-serif text-[200px] leading-none select-none"
          aria-hidden
        >§</div>
        <div className="relative p-8 md:p-10">
          <div className="text-[11px] uppercase tracking-[0.3em] text-verde-claro mb-3">Documento oficial</div>
          <div className="text-5xl mb-3">📜</div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold leading-tight">{vigente.titulo}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
            <span className="bg-white/15 backdrop-blur rounded-full px-3 py-1">Versión {vigente.version}</span>
            <span className="bg-white/15 backdrop-blur rounded-full px-3 py-1">
              📅 {new Date(vigente.publicado_at).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
            {firma && (
              <span className="bg-emerald-400/25 border border-emerald-200/40 rounded-full px-3 py-1 font-semibold">
                ✅ Firmado por ti
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Índice de capítulos ── */}
      {capitulos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <h2 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Contenido</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {capitulos.map((c: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-md bg-verde/10 text-verde-oscuro flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                <span className="truncate">{c.replace(/\*\*/g, '')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cuerpo del reglamento ── */}
      <article className="bg-white rounded-2xl shadow-sm p-6 md:p-10 border border-gray-100">
        <ReglamentoView md={vigente.contenido_md} />
      </article>

      {/* ── Firma ── */}
      {firma ? (
        <div className="bg-gradient-to-r from-verde-claro/20 to-emerald-50 border border-verde rounded-2xl p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-verde text-white flex items-center justify-center text-2xl shadow-lg shrink-0">✓</div>
          <div>
            <div className="text-verde-oscuro font-bold text-lg">Reglamento firmado digitalmente</div>
            <div className="text-sm text-gray-600 mt-0.5">
              Firmaste el {new Date(firma.firmado_at).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Esta firma queda registrada con validez para fines internos institucionales.</div>
          </div>
        </div>
      ) : (
        <FirmarReglamentoForm reglamentoId={vigente.id} firmar={firmarReglamento} />
      )}
    </div>
  );
}
