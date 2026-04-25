'use server';

import { adminClient } from '@/lib/supabase/admin';
import { curpAEmail, esCurpValida } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as XLSX from 'xlsx';
import { generacionPorIngreso } from '@/lib/grupos';

// Normaliza una fila del XLSX al esquema `alumnos`. Las columnas típicas de SEIEM:
// CURP, NOMBRE(S), APELLIDO PATERNO, APELLIDO MATERNO, MATRICULA, SEXO, FECHA NACIMIENTO,
// GRADO, GRUPO, SEMESTRE, TURNO, CICLO, GENERACION, etc.
const getCol = (row: any, ...nombres: string[]) => {
  for (const n of nombres) {
    const k = Object.keys(row).find((x) => x.toUpperCase().replace(/\s+/g, '') === n.toUpperCase().replace(/\s+/g, ''));
    if (k && row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
  }
  return null;
};

export async function importarAlumnosExcel(formData: FormData) {
  const archivo = formData.get('archivo') as File;
  if (!archivo || archivo.size === 0) return;

  const buf = await archivo.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<any>(ws, { defval: null });

  const admin = adminClient();
  let creados = 0, actualizados = 0, errores = 0;

  // Ciclo activo para auto-calcular generación si no viene en el Excel
  const { data: cicloActivo } = await admin
    .from('ciclos_escolares').select('fecha_inicio').eq('activo', true).maybeSingle();
  const genAuto = cicloActivo?.fecha_inicio
    ? generacionPorIngreso(new Date(cicloActivo.fecha_inicio), 1)
    : null;

  for (const row of filas) {
    const curp = (getCol(row, 'CURP') ?? '').toUpperCase();
    if (!esCurpValida(curp)) { errores++; continue; }

    const matricula       = getCol(row, 'MATRICULA', 'MATRÍCULA');
    const nombre          = getCol(row, 'NOMBRE', 'NOMBRES', 'NOMBRE(S)');
    const apellidoPaterno = getCol(row, 'APELLIDO PATERNO', 'APELLIDOPATERNO', 'PATERNO');
    const apellidoMaterno = getCol(row, 'APELLIDO MATERNO', 'APELLIDOMATERNO', 'MATERNO');
    const sexo            = getCol(row, 'SEXO', 'GENERO')?.charAt(0).toUpperCase();
    const fechaNac        = getCol(row, 'FECHA NACIMIENTO', 'FECHANACIMIENTO', 'NACIMIENTO');
    const generacion      = getCol(row, 'GENERACION', 'GENERACIÓN');
    const procedencia     = getCol(row, 'ESCUELA PROCEDENCIA', 'PROCEDENCIA');

    if (!nombre || !apellidoPaterno) { errores++; continue; }

    // Upsert alumno por CURP
    const { data: existente } = await admin.from('alumnos').select('id, perfil_id').eq('curp', curp).single();

    const payload = {
      curp, matricula, nombre, apellido_paterno: apellidoPaterno, apellido_materno: apellidoMaterno,
      sexo: (sexo === 'H' || sexo === 'M') ? sexo : null,
      fecha_nacimiento: fechaNac || null,
      generacion: generacion || genAuto, escuela_procedencia: procedencia,
    };

    let alumnoId = existente?.id;
    if (existente) {
      await admin.from('alumnos').update(payload).eq('id', existente.id);
      actualizados++;
    } else {
      const { data: ins } = await admin.from('alumnos').insert(payload).select('id').single();
      alumnoId = ins?.id;
      creados++;
    }

    // Crear cuenta de acceso (si aún no tiene perfil y hay matrícula)
    if (alumnoId && !existente?.perfil_id && matricula) {
      const email = curpAEmail(curp);
      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email, password: matricula, email_confirm: true,
        user_metadata: { curp, rol: 'alumno' },
      });
      if (!authErr && authUser.user) {
        await admin.from('perfiles').insert({
          id: authUser.user.id, rol: 'alumno',
          nombre: `${nombre} ${apellidoPaterno}`,
        });
        await admin.from('alumnos').update({ perfil_id: authUser.user.id }).eq('id', alumnoId);
      }
    }
  }

  revalidatePath('/admin/alumnos');
  redirect(`/admin/alumnos?creados=${creados}&actualizados=${actualizados}&errores=${errores}`);
}
