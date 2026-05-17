import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no-auth' }, { status: 401 });
  const url = new URL(req.url);
  const ciclo_id = url.searchParams.get('ciclo_id');
  if (!ciclo_id) return NextResponse.json({ error: 'falta-ciclo' }, { status: 400 });

  const { data: califs } = await supabase
    .from('calificaciones')
    .select(`
      parcial, calificacion, estado,
      asignacion:asignaciones(grupo:grupos(nombre, ciclo_id), materia:materias(nombre), profesor:profesores(perfil:perfiles(nombre))),
      alumno:alumnos(matricula, curp, nombre, apellido_paterno, apellido_materno)
    `)
    .eq('estado', 'validada')
    .limit(5000);

  const filtered = (califs ?? []).filter((c: any) => c.asignacion?.grupo?.ciclo_id === ciclo_id);

  const rows = filtered.map((c: any, idx: number) => [
    idx + 1,
    c.alumno?.matricula ?? '',
    c.alumno?.curp ?? '',
    `${c.alumno?.apellido_paterno ?? ''} ${c.alumno?.apellido_materno ?? ''} ${c.alumno?.nombre ?? ''}`.trim(),
    c.asignacion?.grupo?.nombre ?? '',
    c.asignacion?.materia?.nombre ?? '',
    c.asignacion?.profesor?.perfil?.nombre ?? '',
    c.parcial,
    c.calificacion,
  ]);

  const header = ['#', 'MATRICULA', 'CURP', 'NOMBRE COMPLETO', 'GRUPO', 'MATERIA', 'DOCENTE', 'PARCIAL', 'CALIF.'];
  const ws = XLSX.utils.aoa_to_sheet([
    ['REPORTE SEIEM – CONCENTRADO DE CALIFICACIONES'],
    ['Generado:', new Date().toLocaleString('es-MX')],
    ['Total registros:', rows.length],
    [],
    header,
    ...rows,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="SEIEM_calificaciones.xlsx"`,
    },
  });
}
