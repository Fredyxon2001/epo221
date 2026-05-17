// Reporte SEIEM: alumnos de un grupo con datos requeridos en formato XLSX.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no-auth' }, { status: 401 });

  const url = new URL(req.url);
  const grupo_id = url.searchParams.get('grupo_id');
  if (!grupo_id) return NextResponse.json({ error: 'falta-grupo' }, { status: 400 });

  const { data: grupo } = await supabase
    .from('grupos')
    .select('id, nombre, ciclo:ciclos_escolares(nombre)')
    .eq('id', grupo_id).single();

  const { data: inscripciones } = await supabase
    .from('inscripciones')
    .select(`
      alumno:alumnos(matricula, curp, nombre, apellido_paterno, apellido_materno, sexo, fecha_nacimiento, telefono, email, direccion, codigo_postal, municipio, tutor_nombre, tutor_telefono, escuela_procedencia)
    `)
    .eq('grupo_id', grupo_id)
    .eq('activa', true);

  const rows = (inscripciones ?? []).map((i: any, idx: number) => {
    const a = i.alumno ?? {};
    return [
      idx + 1, a.matricula ?? '', a.curp ?? '',
      a.apellido_paterno ?? '', a.apellido_materno ?? '', a.nombre ?? '',
      a.sexo === 'H' ? 'HOMBRE' : a.sexo === 'M' ? 'MUJER' : '',
      a.fecha_nacimiento ?? '', a.telefono ?? '', a.email ?? '',
      a.direccion ?? '', a.codigo_postal ?? '', a.municipio ?? '',
      a.tutor_nombre ?? '', a.tutor_telefono ?? '',
      a.escuela_procedencia ?? '',
    ];
  });

  const header = ['#', 'MATRICULA', 'CURP', 'AP. PATERNO', 'AP. MATERNO', 'NOMBRE(S)', 'SEXO', 'FEC. NAC.', 'TELÉFONO', 'EMAIL', 'DIRECCIÓN', 'CP', 'MUNICIPIO', 'TUTOR', 'TEL. TUTOR', 'ESC. PROCEDENCIA'];
  const info = [
    ['REPORTE SEIEM – PLANTILLA DE GRUPO'],
    ['Grupo:', grupo?.nombre ?? ''],
    ['Ciclo:', (grupo as any)?.ciclo?.nombre ?? ''],
    ['Generado:', new Date().toLocaleString('es-MX')],
    ['Total alumnos:', rows.length],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...info, header, ...rows]);
  ws['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 30 }, { wch: 8 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'SEIEM-Grupo');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="SEIEM_${(grupo?.nombre ?? 'grupo').replace(/[^A-Za-z0-9]/g, '_')}.xlsx"`,
    },
  });
}
