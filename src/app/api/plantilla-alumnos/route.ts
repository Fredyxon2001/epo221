// Genera y descarga la plantilla XLSX para importación masiva de alumnos.
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEADERS = [
  'CURP',
  'NOMBRE',
  'APELLIDO PATERNO',
  'APELLIDO MATERNO',
  'MATRICULA',
  'SEXO',
  'FECHA NACIMIENTO',
  'GENERACION',
  'ESCUELA PROCEDENCIA',
  'EMAIL CONTACTO',
  'TELEFONO',
  'DIRECCION',
  'CODIGO POSTAL',
  'MUNICIPIO',
  'ESTADO',
  'TUTOR NOMBRE',
  'TUTOR PARENTESCO',
  'TUTOR TELEFONO',
  'TUTOR EMAIL',
];

const EJEMPLOS = [
  {
    'CURP': 'GARM050312HDFRZR01',
    'NOMBRE': 'Mario',
    'APELLIDO PATERNO': 'García',
    'APELLIDO MATERNO': 'Ramírez',
    'MATRICULA': '20260001',
    'SEXO': 'H',
    'FECHA NACIMIENTO': '2005-03-12',
    'GENERACION': '2026-2029',
    'ESCUELA PROCEDENCIA': 'Esc. Sec. Federal No. 5',
    'EMAIL CONTACTO': 'mario.garcia@correo.mx',
    'TELEFONO': '5512345678',
    'DIRECCION': 'Calle Independencia #123, Col. Centro',
    'CODIGO POSTAL': '75480',
    'MUNICIPIO': 'Tecamachalco',
    'ESTADO': 'Puebla',
    'TUTOR NOMBRE': 'Juan García López',
    'TUTOR PARENTESCO': 'Padre',
    'TUTOR TELEFONO': '5598765432',
    'TUTOR EMAIL': 'juan.garcia@correo.mx',
  },
  {
    'CURP': 'HRCA071203MDFRST11',
    'NOMBRE': 'Camila',
    'APELLIDO PATERNO': 'Hernández',
    'APELLIDO MATERNO': 'Romero',
    'MATRICULA': '20260002',
    'SEXO': 'M',
    'FECHA NACIMIENTO': '2007-12-03',
    'GENERACION': '2026-2029',
    'ESCUELA PROCEDENCIA': 'Esc. Sec. Técnica No. 12',
    'EMAIL CONTACTO': 'camila.h@correo.mx',
    'TELEFONO': '5511223344',
    'DIRECCION': 'Av. Reforma #456, Col. Reforma',
    'CODIGO POSTAL': '75481',
    'MUNICIPIO': 'Tecamachalco',
    'ESTADO': 'Puebla',
    'TUTOR NOMBRE': 'María Romero Vega',
    'TUTOR PARENTESCO': 'Madre',
    'TUTOR TELEFONO': '5544556677',
    'TUTOR EMAIL': 'maria.romero@correo.mx',
  },
  {
    'CURP': 'LLSA070921HDFRST11',
    'NOMBRE': 'Santiago',
    'APELLIDO PATERNO': 'López',
    'APELLIDO MATERNO': 'Luna',
    'MATRICULA': '20260003',
    'SEXO': 'H',
    'FECHA NACIMIENTO': '2007-09-21',
    'GENERACION': '2026-2029',
    'ESCUELA PROCEDENCIA': 'Esc. Sec. Particular Cervantes',
    'EMAIL CONTACTO': '',
    'TELEFONO': '',
    'DIRECCION': 'Calle 5 de Mayo #789',
    'CODIGO POSTAL': '75482',
    'MUNICIPIO': 'Tecamachalco',
    'ESTADO': 'Puebla',
    'TUTOR NOMBRE': 'Jorge López Hernández',
    'TUTOR PARENTESCO': 'Padre',
    'TUTOR TELEFONO': '5599887766',
    'TUTOR EMAIL': '',
  },
];

const INSTRUCCIONES = [
  ['CAMPO', 'OBLIGATORIO', 'FORMATO / EJEMPLO', 'NOTAS'],
  ['CURP', 'SÍ', '18 caracteres alfanuméricos', 'Único por alumno. Si ya existe, se ACTUALIZA su ficha.'],
  ['NOMBRE', 'SÍ', 'Texto sin acentos opcional', 'Usado para generar email de login: NOMBRE.APELLIDO@epo221.mx'],
  ['APELLIDO PATERNO', 'SÍ', 'Texto', 'Usado para generar email de login.'],
  ['APELLIDO MATERNO', 'No', 'Texto', 'Opcional pero recomendado para identificación.'],
  ['MATRICULA', 'SÍ', 'Numérica o alfanumérica', 'OBLIGATORIA. Si dos alumnos tienen mismo nombre+apellido, se usa como diferenciador del email.'],
  ['SEXO', 'No', 'H o M', 'Hombre / Mujer (un solo carácter).'],
  ['FECHA NACIMIENTO', 'No', 'YYYY-MM-DD', 'Ej. 2007-09-21'],
  ['GENERACION', 'No', 'AAAA-AAAA', 'Si se omite, se calcula automáticamente del ciclo activo.'],
  ['ESCUELA PROCEDENCIA', 'No', 'Texto', 'Nombre de la secundaria de procedencia.'],
  ['EMAIL CONTACTO', 'No', 'correo@dominio.com', 'CORREO PERSONAL del alumno (informativo). NO es el login.'],
  ['TELEFONO', 'No', 'Numérico (10 dígitos)', ''],
  ['DIRECCION', 'No', 'Texto libre', ''],
  ['CODIGO POSTAL', 'No', '5 dígitos', ''],
  ['MUNICIPIO', 'No', 'Texto', ''],
  ['ESTADO', 'No', 'Texto', 'Estado de la república.'],
  ['TUTOR NOMBRE', 'No', 'Texto', 'Nombre completo del padre/madre/tutor.'],
  ['TUTOR PARENTESCO', 'No', 'Padre / Madre / Tutor', ''],
  ['TUTOR TELEFONO', 'No', 'Numérico', 'Para WhatsApp y llamadas.'],
  ['TUTOR EMAIL', 'No', 'correo@dominio.com', 'Para resumen semanal automático por correo.'],
  [],
  ['============= REGLAS DE LOGIN AUTOMÁTICO =============', '', '', ''],
  ['Al importar, el sistema crea/actualiza la cuenta de acceso del alumno así:', '', '', ''],
  [''],
  ['EMAIL DE LOGIN:', '', '', ''],
  [' Patrón base:  nombre.apellido@epo221.mx', '', '', ''],
  [' Ej. "Diego Ramírez" → diego.ramirez@epo221.mx', '', '', ''],
  [' Acentos y mayúsculas se ignoran automáticamente.', '', '', ''],
  [' Si dos alumnos tienen el MISMO nombre+apellido, al segundo se le agrega la matrícula:', '', '', ''],
  ['   diego.ramirez.20260005@epo221.mx', '', '', ''],
  [''],
  ['CONTRASEÑA INICIAL:', '', '', ''],
  [' Todas las cuentas se crean con: TEMPORALEPO221!', '', '', ''],
  [' (con T mayúscula al inicio, signo de admiración al final)', '', '', ''],
  [' El alumno puede cambiarla cuando quiera desde "Cambiar mi contraseña".', '', '', ''],
  [' NO se le obliga a cambiarla al primer ingreso.', '', '', ''],
  [''],
  ['VINCULACIÓN AUTOMÁTICA:', '', '', ''],
  [' Si el CURP ya existe en el sistema, se actualizan sus datos.', '', '', ''],
  [' Si el alumno tenía un email viejo, se le ACTUALIZA al nuevo patrón.', '', '', ''],
  [' La cuenta de login siempre queda correctamente vinculada a la ficha.', '', '', ''],
  [''],
  ['============= NOTAS GENERALES =============', '', '', ''],
  ['1) Las columnas pueden estar en cualquier orden, el sistema las detecta por nombre.', '', '', ''],
  ['2) Mayúsculas/minúsculas y acentos NO importan en los headers (CURP = curp = Curp).', '', '', ''],
  ['3) Las filas con CURP inválida o sin nombre/apellido se ignoran.', '', '', ''],
  ['4) Acepta archivos .xlsx, .xls o .csv (UTF-8).', '', '', ''],
  ['5) Tamaño máximo: 5 MB (~ 5,000 alumnos por carga).', '', '', ''],
  ['6) Al terminar la importación verás un resumen con la LISTA DE CREDENCIALES generadas.', '', '', ''],
  ['7) Puedes descargar esa lista para imprimirla y entregarla a los alumnos.', '', '', ''],
];

// Hoja 3: vista previa del email que generarían los ejemplos
const PREVIEW_LOGIN = [
  ['NOMBRE COMPLETO', 'MATRÍCULA', 'EMAIL DE LOGIN GENERADO', 'PASSWORD INICIAL'],
  ['Mario García Ramírez', '20260001', 'mario.garcia@epo221.mx', 'TEMPORALEPO221!'],
  ['Camila Hernández Romero', '20260002', 'camila.hernandez@epo221.mx', 'TEMPORALEPO221!'],
  ['Santiago López Luna', '20260003', 'santiago.lopez@epo221.mx', 'TEMPORALEPO221!'],
  [],
  ['EJEMPLO DE DUPLICADO:', '', '', ''],
  ['Diego Ramírez', '20260010', 'diego.ramirez@epo221.mx', 'TEMPORALEPO221!'],
  ['Diego Ramírez', '20260011', 'diego.ramirez.20260011@epo221.mx', 'TEMPORALEPO221!'],
  ['', '', '(segundo Diego Ramírez recibe sufijo)', ''],
];

export async function GET(_req: NextRequest) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: ALUMNOS (datos a llenar)
  const wsData = XLSX.utils.json_to_sheet(EJEMPLOS, { header: HEADERS });
  wsData['!cols'] = HEADERS.map((h) => ({ wch: Math.max(h.length, 18) }));
  XLSX.utils.book_append_sheet(wb, wsData, 'ALUMNOS');

  // Hoja 2: INSTRUCCIONES
  const wsInstr = XLSX.utils.aoa_to_sheet(INSTRUCCIONES);
  wsInstr['!cols'] = [{ wch: 60 }, { wch: 14 }, { wch: 36 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, 'INSTRUCCIONES');

  // Hoja 3: PREVIEW DE LOGIN
  const wsPrev = XLSX.utils.aoa_to_sheet(PREVIEW_LOGIN);
  wsPrev['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 42 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsPrev, 'VISTA PREVIA LOGIN');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `plantilla-alumnos-EPO221-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buf as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
