'use server';

import { adminClient } from '@/lib/supabase/admin';
import { esCurpValida, nombreApellidoAEmail, PASSWORD_TEMPORAL } from '@/lib/auth';
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
  credenciales: Array<{ nombre: string; matricula: string; email: string; password: string }>;
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
  const resumen: ResumenImport = { creados: 0, actualizados: 0, errores: 0, detalles: [], credenciales: [] };

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

    // Crear o ACTUALIZAR cuenta de acceso
    if (alumnoId && matricula) {
      // Generar email tipo nombre.apellido@epo221.local
      let emailLogin = nombreApellidoAEmail(nombre, apellidoPaterno);
      try {
        // ¿Ya existe ese email en auth?
        const { data: { users: existentes } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = (existentes ?? []).find((u: any) => u.email === emailLogin);

        // Si existe pero es de OTRO alumno (no este), agregar matrícula al email
        if (existing && existing.id !== existente?.perfil_id) {
          emailLogin = nombreApellidoAEmail(nombre, apellidoPaterno, matricula);
        }

        let perfilIdParaVincular: string | null = existente?.perfil_id ?? null;

        if (perfilIdParaVincular) {
          // Actualizar email y password del usuario existente
          await admin.auth.admin.updateUserById(perfilIdParaVincular, {
            email: emailLogin, password: PASSWORD_TEMPORAL,
          });
          await admin.from('perfiles').update({
            email: emailLogin, nombre: `${nombre} ${apellidoPaterno}`,
            debe_cambiar_password: false,
          }).eq('id', perfilIdParaVincular);
        } else {
          // Crear nuevo
          const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
            email: emailLogin, password: PASSWORD_TEMPORAL, email_confirm: true,
            user_metadata: { curp, rol: 'alumno' },
          });
          if (authErr) throw authErr;
          perfilIdParaVincular = authUser?.user?.id ?? null;

          if (perfilIdParaVincular) {
            await admin.from('perfiles').insert({
              id: perfilIdParaVincular,
              rol: 'alumno',
              nombre: `${nombre} ${apellidoPaterno}`,
              email: emailLogin,
              debe_cambiar_password: false,
            });
          }
        }

        // VINCULAR alumno con su perfil (clave para evitar el bug de "cuenta no vinculada")
        if (perfilIdParaVincular) {
          await admin.from('alumnos').update({ perfil_id: perfilIdParaVincular }).eq('id', alumnoId);
          // Registrar credencial generada para mostrar al admin
          resumen.credenciales.push({
            nombre: `${nombre} ${apellidoPaterno}${apellidoMaterno ? ' ' + apellidoMaterno : ''}`,
            matricula: matricula ?? '',
            email: emailLogin,
            password: PASSWORD_TEMPORAL,
          });
        }
      } catch (e: any) {
        resumen.detalles.push({
          fila: filaIdx, curp,
          razon: `Alumno OK pero cuenta de login falló: ${e.message}`,
        });
      }
    }
  }

  // Persistir credenciales en BD para descarga posterior
  let importId: string | null = null;
  if (resumen.credenciales.length) {
    const { data: { user } } = await (await import('@/lib/supabase/server')).createClient().auth.getUser();
    const { data: imp } = await admin.from('imports_credenciales').insert({
      creado_por: user?.id ?? null,
      total: resumen.credenciales.length,
      credenciales: resumen.credenciales,
    }).select('id').single();
    importId = imp?.id ?? null;
  }

  revalidatePath('/admin/alumnos');

  // Pasar resumen via querystring
  const params = new URLSearchParams({
    creados: String(resumen.creados),
    actualizados: String(resumen.actualizados),
    errores: String(resumen.errores),
  });
  if (resumen.detalles.length) {
    params.set('detalle', JSON.stringify(resumen.detalles.slice(0, 10)));
  }
  if (importId) params.set('import_id', importId);
  redirect(`/admin/alumnos?${params.toString()}`);
}
