// Lista de alumnos + importador masivo (XLSX/CSV con plantilla descargable).
import { createClient } from '@/lib/supabase/server';
import { AdminResetPasswordButton } from '@/components/AdminResetPasswordButton';
import { ImportadorMasivo, ResultadoImportacion } from './ImportadorMasivo';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function AdminAlumnos({ searchParams }: {
  searchParams?: { creados?: string; actualizados?: string; errores?: string; detalle?: string; motivo?: string; import_id?: string };
}) {
  const supabase = createClient();
  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, curp, matricula, nombre, apellido_paterno, apellido_materno, estatus, generacion, perfil_id')
    .is('deleted_at', null)
    .order('apellido_paterno').limit(500);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Personas"
        title="🎓 Alumnos"
        description="Gestión de alumnos. Puedes registrarlos manualmente o importar masivamente desde XLSX/CSV con la plantilla."
      />

      {/* Resultado de importación previa (si viene en querystring) */}
      <ResultadoImportacion
        creados={searchParams?.creados}
        actualizados={searchParams?.actualizados}
        errores={searchParams?.errores}
        detalle={searchParams?.detalle}
        importId={searchParams?.import_id}
      />

      {searchParams?.motivo && (
        <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-sm text-rose-800">
          ⚠️ <strong>Error:</strong> {decodeURIComponent(searchParams.motivo)}
        </div>
      )}

      <Card eyebrow="Importación masiva" title="Subir alumnos desde XLSX o CSV">
        <ImportadorMasivo />
      </Card>

      <Card eyebrow={`Total: ${alumnos?.length ?? 0}`} title="Listado de alumnos">
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Matrícula</th>
                <th className="text-left px-3 py-2">CURP</th>
                <th className="text-left px-3 py-2">Nombre</th>
                <th className="text-left px-3 py-2">Generación</th>
                <th className="text-left px-3 py-2">Estatus</th>
                <th className="text-center px-3 py-2">Historial</th>
                <th className="text-center px-3 py-2">Acceso</th>
              </tr>
            </thead>
            <tbody>
              {(alumnos ?? []).map((a: any) => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{a.matricula ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{a.curp}</td>
                  <td className="px-3 py-2">{a.apellido_paterno} {a.apellido_materno ?? ''} {a.nombre}</td>
                  <td className="px-3 py-2">{a.generacion ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                      a.estatus === 'activo' ? 'bg-verde-claro/30 text-verde-oscuro' : 'bg-gray-200 text-gray-700'
                    }`}>{a.estatus}</span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a href={`/admin/alumnos/${a.id}/historial`} className="text-xs text-verde hover:underline">Timeline →</a>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {a.perfil_id ? (
                      <AdminResetPasswordButton perfilId={a.perfil_id} nombre={`${a.nombre} ${a.apellido_paterno}`} />
                    ) : (
                      <span className="text-[10px] text-gray-400">Sin login</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
