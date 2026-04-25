// Lista de alumnos + importador masivo (XLSX oficial de inscripción).
import { createClient } from '@/lib/supabase/server';
import { importarAlumnosExcel } from './actions';
import { AdminResetPasswordButton } from '@/components/AdminResetPasswordButton';

export default async function AdminAlumnos() {
  const supabase = createClient();
  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, curp, matricula, nombre, apellido_paterno, apellido_materno, estatus, generacion, perfil_id')
    .order('apellido_paterno').limit(500);

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Alumnos</h1>

      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-verde mb-2">Importar desde Excel</h2>
        <p className="text-sm text-gray-600 mb-3">
          Sube el archivo <code>LIBRO INSCRIPCION.xlsx</code> oficial. El sistema detecta las columnas
          automáticamente y crea/actualiza alumnos por CURP. También crea sus cuentas de acceso
          (usuario = CURP, contraseña inicial = matrícula).
        </p>
        <form action={importarAlumnosExcel} className="flex gap-3 items-center">
          <input name="archivo" type="file" accept=".xlsx,.xls" required className="text-sm" />
          <button className="bg-verde text-white px-4 py-2 rounded text-sm hover:bg-verde-medio">
            Importar
          </button>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow-sm overflow-hidden">
        <header className="px-4 py-2 bg-gray-50 text-sm font-semibold flex justify-between">
          <span>Total: {alumnos?.length ?? 0}</span>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left p-2">Matrícula</th>
              <th className="text-left p-2">CURP</th>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">Generación</th>
              <th className="text-left p-2">Estatus</th>
              <th className="text-center p-2">Historial</th>
              <th className="text-center p-2">Acceso</th>
            </tr>
          </thead>
          <tbody>
            {(alumnos ?? []).map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="p-2 font-mono text-xs">{a.matricula ?? '—'}</td>
                <td className="p-2 font-mono text-xs">{a.curp}</td>
                <td className="p-2">{a.apellido_paterno} {a.apellido_materno} {a.nombre}</td>
                <td className="p-2">{a.generacion ?? '—'}</td>
                <td className="p-2"><span className="text-xs">{a.estatus}</span></td>
                <td className="p-2 text-center">
                  <a href={`/admin/alumnos/${a.id}/historial`} className="text-xs text-verde hover:underline">Timeline →</a>
                </td>
                <td className="p-2 text-center">
                  {a.perfil_id && (
                    <AdminResetPasswordButton perfilId={a.perfil_id} nombre={`${a.nombre} ${a.apellido_paterno}`} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
