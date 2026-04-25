import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { RecalcularBtn } from './RecalcularBtn';

const NIVEL_STYLE: Record<string, string> = {
  critico: 'bg-rose-100 text-rose-700 border-rose-300',
  alto: 'bg-amber-100 text-amber-800 border-amber-300',
  medio: 'bg-sky-100 text-sky-800 border-sky-300',
  bajo: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default async function AdminRiesgoPage({ searchParams }: { searchParams?: { nivel?: string } }) {
  const supabase = createClient();
  const filtro = searchParams?.nivel ?? 'critico';

  // Último snapshot por alumno
  const { data: snaps } = await supabase
    .from('riesgo_snapshots')
    .select('*, alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula, tutor_email, tutor_nombre)')
    .order('created_at', { ascending: false })
    .limit(2000);

  const ultimoPorAlumno = new Map<string, any>();
  for (const s of snaps ?? []) {
    if (!ultimoPorAlumno.has(s.alumno_id)) ultimoPorAlumno.set(s.alumno_id, s);
  }
  const filas = Array.from(ultimoPorAlumno.values())
    .filter((s) => filtro === 'todos' || s.nivel === filtro)
    .sort((a, b) => b.score - a.score);

  const niveles = ['critico', 'alto', 'medio', 'bajo', 'todos'] as const;

  // Resumen agregado
  const dist = { critico: 0, alto: 0, medio: 0, bajo: 0 };
  for (const s of ultimoPorAlumno.values()) (dist as any)[s.nivel]++;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Detección temprana"
        title="🚨 Alumnos en riesgo"
        description="Snapshots calculados automáticamente combinando promedios, faltas, conducta, tareas y adeudos."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['critico', 'alto', 'medio', 'bajo'] as const).map((n) => (
          <Card key={n}>
            <div className="text-xs text-gray-500 uppercase">{n}</div>
            <div className="text-3xl font-bold text-verde-oscuro tabular-nums">{(dist as any)[n]}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            {niveles.map((n) => (
              <a key={n} href={`/admin/riesgo?nivel=${n}`}
                className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${filtro === n ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
                {n}
              </a>
            ))}
          </div>
          <RecalcularBtn />
        </div>

        {filas.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">Sin snapshots para este filtro. Recalcula para generar uno nuevo.</p>
        ) : (
          <div className="space-y-3">
            {filas.map((s: any) => {
              const a = s.alumno;
              const nombre = `${a?.nombre ?? ''} ${a?.apellido_paterno ?? ''} ${a?.apellido_materno ?? ''}`.trim();
              return (
                <div key={s.id} className={`border rounded-lg p-3 ${NIVEL_STYLE[s.nivel]}`}>
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{nombre}</div>
                      <div className="text-xs opacity-80">
                        Matrícula {a?.matricula ?? '—'}
                        {a?.tutor_nombre && <> · Tutor: {a.tutor_nombre}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-white/60">{s.nivel}</span>
                      <span className="text-2xl font-bold tabular-nums">{s.score}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(s.factores ?? []).map((f: any, i: number) => (
                      <span key={i} className="text-[10px] bg-white/60 rounded px-2 py-0.5" title={f.detalle}>
                        {f.etiqueta} (+{f.peso})
                      </span>
                    ))}
                  </div>
                  {s.recomendacion && <p className="mt-2 text-xs italic">{s.recomendacion}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
