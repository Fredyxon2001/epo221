'use server';

import { adminClient } from '@/lib/supabase/admin';
import { curpAEmail, esCurpValida } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as XLSX from 'xlsx';
import { generacionPorIngreso } from '@/lib/grupos';

// Lee una columna por nombre normalizado (sin espacios/acentos/case)
const norm = (s: string) =>
  s.toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');

const getCol = (row: any, ...nombres: string[]) => {
  for (const n of nombres) {
    const want = norm(n);
    const k = Object.keys(row).find((x) => norm(x) === want);
    if (k && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  return null;
};

type ResumenImport = {
  creados: number;
  actualizados: number;
  errores: number;
  detalles: Array<{ fila: number; curp?: string; razon: string }>;
};

export async function importarAlumnosExcel(formData: FormData) {
  const archivo = formData.get('archivo') as File;
  if (!archivo || archivo.size === 0) {
    redirect('/admin/alumnos?errores=1&motivo=sin_archivo');
  }

  // Detectar tipo de archivo
  const nombreLower = archivo.name.toLowerCase();
  const buf = await archivo.arrayBuffer();
  let filas: any[] = [];

  try {
    if (nombreLower.endsWith('.csv')) {
      // Leer como CSV (UTF-8 con BOM)
      const text = new TextDecoder('utf-8').decode(buf);
      const wb = XLSX.read(text, { type: 'string', raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json<any>(ws, { defval: null });
    } else {
      // XLSX/XLS — buscar la hoja "ALUMNOS" si existe, si no la primera
      const wb = XLSX.read(buf, { type: 'array' });
      const sheetName = wb.SheetNames.find((n) => norm(n) === 'ALUMNOS') || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      filas = XLSX.utils.sheet_to_json<any>(ws, { defval: null });
    }
  } catch (e: any) {
    redirect(`/admin/alumnos?errores=1&motivo=${encodeURIComponent('archivo_corrupto: ' + e.message)}`);
  }

  if (!filas.length) {
    redirect('/admin/alumnos?errores=1&motivo=archivo_vacio');
  }

  const admin = adminClient();
  const resumen: ResumenImport = { creados: 0, actualizados: 0, errores: 0, detalles: [] };

  // Ciclo activo para auto-calcular generación
  const { data: cicloActivo } = await admin
    .from('ciclos_escolares').select('fecha_inicio').eq('activo', true).maybeSingle();
  const genAuto = cicloActivo?.fecha_inicio
    ? generacionPorIngreso(new Date(cicloActivo.fecha_inicio), 1)
    : null;

  let filaIdx = 1; // 1-indexed (excel)
  for (const row of filas) {
    filaIdx++;
    const curp = (getCol(row, 'CURP') ?? '').toUpperCase();

    if (!esCurpValida(curp)) {
      resumen.errores++;
      resumen.detalles.push({ fila: filaIdx, razon: `CURP inválida: "${curp || '(vacía)'}"` });
      continue;
    }

    const nombre          = getCol(row, 'NOMBRE', 'NOMBRES', 'NOMBRE(S)');
    const apellidoPaterno = getCol(row, 'APELLIDO PATERNO', 'APELLIDOPATERNO', 'PATERNO');
    const apellidoMaterno = getCol(row, 'APELLIDO MATERNO', 'APELLIDOMATERNO', 'MATERNO');

    if (!nombre || !apellidoPaterno) {
      resumen.errores++;
      resumen.detalles.push({ fila: filaIdx, curp, razon: 'Falta nombre o apellido paterno' });
      continue;
    }

    const matricula       = getCol(row, 'MATRICULA', 'MATRÍCULA');
    const sexoRaw         = getCol(row, 'SEXO', 'GENERO', 'GÉNERO');
    const sexo            = sexoRaw ? sexoRaw.charAt(0).toUpperCase() : null;
    const fechaNac        = getCol(row, 'FECHA NACIMIENTO', 'FECHANACIMIENTO', 'NACIMIENTO', 'FECHA_NACIMIENTO');
    const generacion      = getCol(row, 'GENERACION', 'GENERACIÓN');
    const procedencia     = getCol(row, 'ESCUELA PROCEDENCIA', 'PROCEDENCIA', 'ESCUELA DE PROCEDENCIA');
    const email           = getCol(row, 'EMAIL', 'CORREO', 'CORREO ELECTRONICO', 'CORREO ELECTRÓNICO');
    const telefono        = getCol(row, 'TELEFONO', 'TELÉFONO', 'TEL', 'CELULAR');
    const direccion       = getCol(row, 'DIRECCION', 'DIRECCIÓN', 'DOMICILIO');
    const cp              = getCol(row, 'CODIGO POSTAL', 'CÓDIGO POSTAL', 'CP', 'C.P.');
    const municipio       = getCol(row, 'MUNICIPIO');
    const estado          = getCol(row, 'ESTADO');
    const tutorNombre     = getCol(row, 'TUTOR NOMBRE', 'NOMBRE TUTOR', 'TUTOR');
    const tutorParent     = getCol(row, 'TUTOR PARENTESCO', 'PARENTESCO');
    const tutorTel        = getCol(row, 'TUTOR TELEFONO', 'TUTOR TELÉFONO', 'TELEFONO TUTOR');
    const tutorEmail      = getCol(row, 'TUTOR EMAIL', 'EMAIL TUTOR', 'CORREO TUTOR');

    // Upsert alumno por CURP
    const { data: existente } = await admin
      .from('alumnos')
      .select('id, perfil_id')
      .eq('curp', curp)
      .maybeSingle();

    const payload: any = {
      curp,
      matricula,
      nombre,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
      sexo: (sexo === 'H' || sexo === 'M') ? sexo : null,
      fecha_nacimiento: fechaNac || null,
      generacion: generacion || genAuto,
      escuela_procedencia: procedencia,
      email, telefono, direccion,
      codigo_postal: cp, municipio, estado,
      tutor_nombre: tutorNombre,
      tutor_parentesco: tutorParent,
      tutor_telefono: tutorTel,
      tutor_email: tutorEmail,
    };
    // Limpiar nulls innecesarios para no sobreescribir con null si la columna no venía
    Object.keys(payload).forEach((k) => { if (payload[k] === null || payload[k] === undefined) delete payload[k]; });
    payload.curp = curp;
    payload.nombre = nombre;
    payload.apellido_paterno = apellidoPaterno;

    let alumnoId = existente?.id;
    try {
      if (existente) {
        await admin.from('alumnos').update(payload).eq('id', existente.id);
        resumen.actualizados++;
      } else {
        const { data: ins, error: insErr } = await admin.from('alumnos').insert(payload).select('id').single();
        if (insErr) throw insErr;
        alumnoId = ins?.id;
        resumen.creados++;
      }
    } catch (e: any) {
      resumen.errores++;
      resumen.detalles.push({ fila: filaIdx, curp, razon: `BD: ${e.message}` });
      continue;
    }

    // Crear cuenta de acceso (si aún no tiene perfil y hay matrícula)
    if (alumnoId && !existente?.perfil_id && matricula) {
      const emailLogin = curpAEmail(curp);
      try {
        const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
          email: emailLogin, password: matricula, email_confirm: true,
          user_metadata: { curp, rol: 'alumno' },
        });
        if (authErr) throw authErr;
        if (authUser?.user) {
          await admin.from('perfiles').insert({
            id: authUser.user.id,
            rol: 'alumno',
            nombre: `${nombre} ${apellidoPaterno}`,
            email: emailLogin,
            debe_cambiar_password: true,
          });
          await admin.from('alumnos').update({ perfil_id: authUser.user.id }).eq('id', alumnoId);
        }
      } catch (e: any) {
        // Si la cuenta ya existía (alumno reimportado en otra ocasión), no es un error fatal
        if (!String(e.message ?? '').includes('already')) {
          resumen.detalles.push({
            fila: filaIdx, curp,
            razon: `Alumno OK pero cuenta de login falló: ${e.message}`,
          });
        }
      }
    }
  }

  revalidatePath('/admin/alumnos');

  // Pasar resumen via querystring (truncado para no exceder URL)
  const params = new URLSearchParams({
    creados: String(resumen.creados),
    actualizados: String(resumen.actualizados),
    errores: String(resumen.errores),
  });
  if (resumen.detalles.length) {
    // Pasar primeros 10 detalles
    params.set('detalle', JSON.stringify(resumen.detalles.slice(0, 10)));
  }
  redirect(`/admin/alumnos?${params.toString()}`);
}
