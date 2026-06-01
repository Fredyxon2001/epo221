// Formato 911 SEIEM simplificado: estadística básica.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import * as XLSX from 'xlsx';

export async function GET() {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no-auth' }, { status: 401 });

  const { data: grupos } = await supabase
    .from('grupos')
    .select(`id, nombre, ciclo:ciclos_escolares(nombre),
      inscripciones(activa, alumno:alumnos(sexo))`)
    .eq('activo', true);

  const rows = (grupos ?? []).map((g: any, i: number) => {
    const ins = (g.inscripciones ?? []).filter((x: any) => x.activa);
    const h = ins.filter((x: any) => x.alumno?.sexo === 'H').length;
    const m = ins.filter((x: any) => x.alumno?.sexo === 'M').length;
    return [i + 1, g.nombre, g.ciclo?.nombre ?? '', h, m, h + m];
  });
  const totH = rows.reduce((s, r) => s + (r[3] as number), 0);
  const totM = rows.reduce((s, r) => s + (r[4] as number), 0);

  const { count: profesoresCount } = await supabase.from('profesores').select('id', { count: 'exact', head: true });

  const ws = XLSX.utils.aoa_to_sheet([
    ['FORMATO 911 SEIEM – ESTADÍSTICA BÁSICA'],
    ['Generado:', new Date().toLocaleString('es-MX')],
    [],
    ['MATRÍCULA POR GRUPO'],
    ['#', 'GRUPO', 'CICLO', 'HOMBRES', 'MUJERES', 'TOTAL'],
    ...rows,
    [],
    ['TOTALES', '', '', totH, totM, totH + totM],
    [],
    ['DOCENTES TOTALES', profesoresCount ?? 0],
  ]);
  ws['!cols'] = [{ wch: 4 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estadística');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="SEIEM_911_estadistica.xlsx"`,
    },
  });
}
