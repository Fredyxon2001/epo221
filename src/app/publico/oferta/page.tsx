import { createClient } from '@/lib/supabase/server';
import { Reveal } from '@/components/publico/Reveal';
import { SectionHeader } from '@/components/publico/SectionHeader';
import { AuroraBg } from '@/components/publico/AuroraBg';

export const revalidate = 60;

const SEMESTRE_COLORS = [
  'from-verde-oscuro to-verde',
  'from-verde to-verde-medio',
  'from-verde-medio to-verde-claro',
  'from-verde-claro to-verde-medio',
  'from-verde-medio to-verde',
  'from-verde to-verde-oscuro',
];

const SEMESTRE_GLOW = [
  'rgba(15,118,110,0.25)',
  'rgba(13,148,136,0.25)',
  'rgba(94,234,212,0.25)',
  'rgba(94,234,212,0.25)',
  'rgba(13,148,136,0.25)',
  'rgba(15,118,110,0.25)',
];

const TIPO_ICON: Record<string, string> = {
  obligatoria: '📘',
  optativa: '🔬',
  paraescolar: '🎨',
  capacitacion: '🛠️',
};

export default async function Oferta() {
  const supabase = createClient();
  const [{ data: materias }, { data: campos }] = await Promise.all([
    supabase.from('materias').select('*, campo:campos_disciplinares(nombre)')
      .eq('activo', true).is('deleted_at', null)
      .order('semestre').order('nombre'),
    supabase.from('campos_disciplinares').select('*').order('nombre'),
  ]);

  const porSemestre = (materias ?? []).reduce<Record<number, any[]>>((acc, m: any) => {
    (acc[m.semestre] ??= []).push(m); return acc;
  }, {});

  return (
    <AuroraBg className="pt-32 pb-28 px-6">
      <div className="relative max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Plan de estudios"
          ghost="BGE"
          title="Oferta educativa"
          titleAccent="educativa"
          subtitle="Bachillerato General Estatal — plan SEIEM. Seis semestres de formación propedéutica que te preparan para la universidad y la vida."
        />

        {/* Campos disciplinares chips */}
        {campos && campos.length > 0 && (
          <Reveal delay={0.1} className="flex flex-wrap gap-2 justify-center mb-16">
            {campos.map((c: any) => (
              <span
                key={c.id}
                className="gradient-border bg-white/90 backdrop-blur text-verde px-4 py-2 rounded-full text-sm font-medium hover:bg-verde hover:text-white transition cursor-default"
              >
                {c.nombre}
              </span>
            ))}
          </Reveal>
        )}

        <div className="space-y-8">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <Reveal key={s} delay={(s - 1) * 0.05} y={20}>
              <div className="lift relative bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-verde/10 overflow-hidden">
                <div
                  className={`relative bg-gradient-to-r ${SEMESTRE_COLORS[s - 1]} px-8 py-6 flex items-center justify-between overflow-hidden`}
                  style={{ boxShadow: `inset 0 -1px 0 rgba(255,255,255,0.2), 0 10px 30px -15px ${SEMESTRE_GLOW[s - 1]}` }}
                >
                  <div className="relative">
                    <div className="text-[10px] uppercase tracking-[0.4em] text-white/70">Semestre</div>
                    <div className="font-serif text-4xl text-white leading-none mt-1">{s}°</div>
                  </div>
                  <div className="relative text-right">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/60">Asignaturas</div>
                    <div className="text-white text-2xl font-serif font-bold tabular-nums">
                      {(porSemestre[s] ?? []).length}
                    </div>
                  </div>
                </div>
                <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(porSemestre[s] ?? []).map((m: any) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-crema border border-transparent hover:border-verde/20 transition group"
                    >
                      <div className="text-xl flex-shrink-0 mt-0.5">{TIPO_ICON[m.tipo] ?? '📗'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-verde group-hover:text-verde-medio text-sm leading-tight">{m.nombre}</div>
                        <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wide">
                          {m.tipo}{m.campo?.nombre ? ` · ${m.campo.nombre}` : ''}
                        </div>
                      </div>
                      {m.horas_semestrales && (
                        <span className="text-[10px] bg-verde/10 text-verde font-bold px-2 py-1 rounded-full whitespace-nowrap">
                          {m.horas_semestrales}h
                        </span>
                      )}
                    </div>
                  ))}
                  {(porSemestre[s] ?? []).length === 0 && (
                    <div className="col-span-full text-gray-400 text-sm text-center py-6">Sin asignaturas registradas.</div>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </AuroraBg>
  );
}
