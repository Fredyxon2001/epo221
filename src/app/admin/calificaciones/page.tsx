// Importar CSV oficial de calificaciones (formato SEIEM).
import { importarCalificacionesCSV } from './actions';

export default function AdminCalificaciones() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Calificaciones — importar</h1>

      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-verde mb-2">Importar CSV oficial</h2>
        <p className="text-sm text-gray-600 mb-3">
          Sube un archivo como{' '}
          <code>15EBH0409B_2025-2026_1_6_ACTIVIDADES FÍSICAS... CALIFICACIONES.csv</code>.
          El sistema detecta CURP, materia, grupo, ciclo y actualiza calificaciones existentes.
        </p>
        <ul className="text-xs text-gray-500 list-disc ml-5 mb-4">
          <li>Los alumnos que no existan se ignoran (importa primero el XLSX de inscripción).</li>
          <li>Si la asignación no existe, se crea automáticamente.</li>
          <li>Las calificaciones previas se sobreescriben.</li>
        </ul>
        <form action={importarCalificacionesCSV} className="flex gap-3 items-center">
          <input name="archivo" type="file" accept=".csv" required className="text-sm" />
          <button className="bg-verde text-white px-4 py-2 rounded text-sm hover:bg-verde-medio">
            Importar
          </button>
        </form>
      </section>
    </div>
  );
}
