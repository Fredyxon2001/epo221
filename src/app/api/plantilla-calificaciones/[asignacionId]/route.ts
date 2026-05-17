// Genera plantilla XLSX precargada con los alumnos del grupo de una asignación,
// lista para que el maestro capture calificaciones y la suba.
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { asignacionId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const parcial = Number(url.searchParams.get('parcial') ?? '1');
  if (![1, 2, 3].includes(parcial)) return new Response('Parcial inválido', { status: 400 });

  // Verificar que el user es maestro de esta asignación o admin
  const { data: asig } = await supabase
    .from('asignaciones')
    .select('id, profesor_id, materia:materias(nombre), grupo:grupos(id, grado, semestre, grupo, turno), profesor:profesores(perfil_id)')
    .eq('id', params.asignacionId)
    .maybeSingle();
  if (!asig) return new Response('Asignación no encontrada', { status: 404 });

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  const isAdmin = perfil && ['admin', 'staff', 'director'].includes(perfil.rol);
  const isProfesor = (asig as any).profesor?.perfil_id === user.id;
  if (!isAdmin && !isProfesor) return new Response('Forbidden', { status: 403 });

  // Cargar alumnos inscritos al grupo
  const grupoId = (asig as any).grupo?.id;
  const { data: insc } = await supabase
    .from('inscripciones')
    .select('alumno:alumnos(id, matricula, nombre, apellido_paterno, apellido_materno)')
    .eq('grupo_id', grupoId)
    .eq('estatus', 'activa')
    .order('alumno(apellido_paterno)');

  const alumnos = ((insc ?? []) as any[]).map((i) => i.alumno).filter(Boolean);

  // Calificaciones previas (validadas) para mostrar en la plantilla
  const { data: previas } = await supabase
    .from('calificaciones_propuestas')
    .select('alumno_id, calificacion, faltas')
    .eq('asignacion_id', params.asignacionId)
    .eq('parcial', parcial)
    .eq('estado', 'validada');
  const mapPrev = new Map<string, any>();
  for (const p of previas ?? []) mapPrev.set((p as any).alumno_id, p);

  // Construir hojas
  const grupo = (asig as any).grupo;
  const grupoTxt = grupo ? `${grupo.grado}°${String.fromCharCode(64 + (grupo.grupo ?? 1))} ${grupo.turno ?? ''}` : '—';

  // Hoja 1: CALIFICACIONES
  const dataHeaders = ['MATRICULA', 'NOMBRE COMPLETO', 'CALIFICACION (0-10)', 'FALTAS', 'OBSERVACIONES'];
  const dataRows = alumnos.map((a: any) => {
    const prev = mapPrev.get(a.id);
    return {
      'MATRICULA': a.matricula ?? '',
      'NOMBRE COMPLETO': `${a.apellido_paterno ?? ''} ${a.apellido_materno ?? ''} ${a.nombre ?? ''}`.trim(),
      'CALIFICACION (0-10)': prev?.calificacion ?? '',
      'FALTAS': prev?.faltas ?? '',
      'OBSERVACIONES': '',
    };
  });
  const ws = XLSX.utils.json_to_sheet(dataRows, { header: dataHeaders });
  ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 20 }, { wch: 10 }, { wch: 36 }];

  // Hoja 2: INFO
  const info = [
    ['CAPTURA DE CALIFICACIONES — EPO 221 "Nicolás Bravo"'],
    [],
    ['Asignación:', (asig as any).materia?.nombre ?? '—'],
    ['Grupo:', grupoTxt],
    ['Parcial:', String(parcial)],
    ['Total alumnos:', String(alumnos.length)],
    ['Generada:', new Date().toLocaleString('es-MX')],
    [],
    ['INSTRUCCIONES'],
    ['1) NO cambies la matrícula ni el nombre — son la llave de identificación.'],
    ['2) Captura la CALIFICACIÓN (de 0 a 10, decimales permitidos: 7.5).'],
    ['3) Captura las FALTAS (número entero, 0 si no tuvo).'],
    ['4) Las OBSERVACIONES son opcionales.'],
    ['5) Si dejas la CALIFICACIÓN vacía, ese alumno NO se enviará.'],
    ['6) Guarda el archivo y súbelo desde "Enviar calificaciones".'],
    [],
    ['REGLAS DEL FLUJO'],
    ['• Las calificaciones se ENVÍAN al ORIENTADOR del grupo para su validación.'],
    ['• El orientador puede VALIDAR (se aplican al expediente) o RECHAZAR (con motivo).'],
    ['• Si una calificación ya está VALIDADA y quieres modificarla:'],
    ['  → al subir el nuevo valor, se crea una solicitud de MODIFICACIÓN.'],
    ['  → el orientador debe aprobarla explícitamente.'],
    [],
    ['SOPORTE'],
    ['Si tienes dudas, contacta a Control Escolar o al administrador del sistema.'],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols'] = [{ wch: 80 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CALIFICACIONES');
  XLSX.utils.book_append_sheet(wb, wsInfo, 'INFO');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const safe = ((asig as any).materia?.nombre ?? 'materia').toString().replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  const filename = `calificaciones-${safe}-P${parcial}-${grupoTxt.replace(/[^a-z0-9]/gi, '')}.xlsx`;

  return new Response(buf as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
