import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function SEIEMPage() {
  const auth = createClient();
  const supabase = adminClient();
  const { data: grupos } = await supabase.from('grupos').select('id, nombre, ciclo:ciclos_escolares(nombre)').eq('activo', true).order('nombre');
  const { data: ciclos } = await supabase.from('ciclos_escolares').select('id, nombre').order('inicio', { ascending: false });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sistema · Reportes oficiales"
        title="📑 Reportes SEIEM"
        description="Genera reportes en formato XLSX con la estructura solicitada por el SEIEM (Servicios Educativos Integrados al Estado de México)."
      />

      <Card>
        <h2 className="font-semibold mb-3">📊 Plantilla de grupo (alumnos + datos requeridos)</h2>
        <form action="/api/seiem/grupo" method="GET" className="flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[200px]">
            <span className="text-xs text-gray-600">Grupo</span>
            <select name="grupo_id" required className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">— Seleccionar —</option>
              {(grupos ?? []).map((g: any) => <option key={g.id} value={g.id}>{g.nombre} · {g.ciclo?.nombre}</option>)}
            </select>
          </label>
          <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold text-sm px-4 py-2 rounded">⬇️ Descargar XLSX</button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">📈 Concentrado de calificaciones por ciclo</h2>
        <form action="/api/seiem/calificaciones" method="GET" className="flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[200px]">
            <span className="text-xs text-gray-600">Ciclo escolar</span>
            <select name="ciclo_id" required className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">— Seleccionar —</option>
              {(ciclos ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold text-sm px-4 py-2 rounded">⬇️ Descargar XLSX</button>
        </form>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">📋 Estadística básica (formato 911 SEIEM)</h2>
        <p className="text-xs text-gray-500 mb-2">Total de alumnos por grupo y sexo, profesores, asistencia promedio.</p>
        <a href="/api/seiem/estadistica" className="inline-block bg-verde hover:bg-verde-oscuro text-white font-semibold text-sm px-4 py-2 rounded">⬇️ Descargar XLSX</a>
      </Card>

      <Card>
        <div className="text-xs text-gray-600 space-y-2">
          <p>📌 <strong>Nota:</strong> Los formatos están alineados con la estructura común del SEIEM (matrícula, CURP, nombre, sexo, fecha nac., etc.).</p>
          <p>Si SEIEM solicita un formato adicional, comparte el ejemplo y se agrega aquí.</p>
        </div>
      </Card>
    </div>
  );
}
