// Boleta imprimible. El alumno usa "Imprimir → Guardar como PDF".
import { getAlumnoActual, getHistorialAcademico, getEvaluacionGeneral } from '@/lib/queries';
import { PrintButton } from '@/components/PrintButton';

export default async function Boleta() {
  const alumno = (await getAlumnoActual())!;
  const [historial, eval_] = await Promise.all([
    getHistorialAcademico(alumno.id),
    getEvaluacionGeneral(alumno.id),
  ]);

  const grupos = historial.reduce<Record<string, typeof historial>>((acc, row) => {
    const key = `${row.ciclo} · Semestre ${row.semestre}°`;
    (acc[key] ??= []).push(row);
    return acc;
  }, {});

  return (
    <>
      <div className="print:hidden flex justify-between items-center mb-4 max-w-5xl">
        <h1 className="font-serif text-3xl text-verde">Boleta</h1>
        <div className="flex gap-2">
          <a
            href={`/api/boleta/${alumno.id}`}
            target="_blank"
            rel="noopener"
            className="bg-verde text-white px-4 py-2 rounded hover:bg-verde-medio text-sm inline-flex items-center gap-2"
          >
            ⬇ Descargar PDF
          </a>
          <PrintButton />
        </div>
      </div>

      <article className="bg-white shadow-sm mx-auto max-w-4xl p-10 print:shadow-none print:p-0">
        {/* Encabezado oficial */}
        <header className="flex items-center justify-between border-b-2 border-verde pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-dorado flex items-center justify-center">
              <span className="font-serif font-black text-verde">221</span>
            </div>
            <div>
              <h2 className="font-serif text-xl text-verde">EPO 221 "Nicolás Bravo"</h2>
              <div className="text-xs text-gray-600">Escuela Preparatoria Oficial · CCT 15EBH0409B</div>
              <div className="text-xs text-gray-600">Bachillerato General Estatal</div>
            </div>
          </div>
          <div className="text-right text-xs text-gray-600">
            <div>Boleta de calificaciones</div>
            <div>Emitida: {new Date().toLocaleDateString('es-MX')}</div>
          </div>
        </header>

        {/* Datos del alumno */}
        <section className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-6">
          <Dato k="Alumno" v={`${alumno.nombre} ${alumno.apellido_paterno} ${alumno.apellido_materno ?? ''}`} />
          <Dato k="CURP" v={alumno.curp} />
          <Dato k="Matrícula" v={alumno.matricula ?? '—'} />
          <Dato k="Generación" v={alumno.generacion ?? '—'} />
        </section>

        {/* Tablas por semestre */}
        {Object.entries(grupos).map(([titulo, materias]) => (
          <section key={titulo} className="mb-5 break-inside-avoid">
            <h3 className="bg-verde text-white px-3 py-1 text-sm font-semibold">{titulo}</h3>
            <table className="w-full text-xs border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 border-r">Asignatura</th>
                  <th className="p-2 border-r w-10">P1</th>
                  <th className="p-2 border-r w-10">P2</th>
                  <th className="p-2 border-r w-10">P3</th>
                  <th className="p-2 border-r w-12">Ext.</th>
                  <th className="p-2 w-14">Final</th>
                </tr>
              </thead>
              <tbody>
                {materias.map((m, i) => {
                  const extra = [m.e1, m.e2, m.e3, m.e4].filter((x) => x && x > 0);
                  return (
                    <tr key={i} className="border-t border-gray-300">
                      <td className="p-2 border-r">{m.materia}</td>
                      <td className="p-2 border-r text-center">{m.p1 ?? '—'}</td>
                      <td className="p-2 border-r text-center">{m.p2 ?? '—'}</td>
                      <td className="p-2 border-r text-center">{m.p3 ?? '—'}</td>
                      <td className="p-2 border-r text-center">{extra.length ? Math.max(...extra) : '—'}</td>
                      <td className="p-2 text-center font-semibold">{m.promedio_final?.toFixed(2) ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}

        {/* Resumen final */}
        <section className="mt-8 border-t-2 border-verde pt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500">Promedio general</div>
            <div className="text-2xl font-semibold text-verde">{eval_?.promedio_general?.toFixed(2) ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Materias aprobadas</div>
            <div className="text-2xl font-semibold">{eval_?.total_aprobadas ?? 0} / {eval_?.total_materias ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Avance</div>
            <div className="text-2xl font-semibold text-verde">{eval_?.porcentaje_avance ?? 0}%</div>
          </div>
        </section>

        <footer className="mt-12 pt-4 border-t text-xs text-gray-500 flex justify-between">
          <span>Documento informativo. No sustituye documento oficial emitido por Control Escolar.</span>
          <span>Emitido electrónicamente</span>
        </footer>
      </article>
    </>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 min-w-[90px]">{k}:</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
