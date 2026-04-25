import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getHistorialAcademico, getEvaluacionGeneral } from '@/lib/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { alumnoId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  const isAdmin = perfil && ['admin', 'staff', 'director'].includes(perfil.rol);

  const { data: alumno } = await supabase.from('alumnos').select('*').eq('id', params.alumnoId).maybeSingle();
  if (!alumno) return new Response('Not found', { status: 404 });
  if (!isAdmin && alumno.perfil_id !== user.id) return new Response('Forbidden', { status: 403 });

  const [historial, evaluacion, cfgRes, reportesRes] = await Promise.all([
    getHistorialAcademico(params.alumnoId),
    getEvaluacionGeneral(params.alumnoId),
    supabase.from('sitio_config').select('nombre_escuela, cct').maybeSingle(),
    supabase.from('reportes_conducta').select('fecha, tipo, categoria, descripcion').eq('alumno_id', params.alumnoId).order('fecha', { ascending: false }),
  ]);

  const reportes = reportesRes.data ?? [];
  const conductaNeg = reportes.filter((r: any) => r.tipo === 'negativo').length;
  const reconocimientos = reportes.filter((r: any) => r.tipo === 'positivo').length;

  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { KardexPDF } = await import('@/lib/pdf/Kardex');
  const { createElement } = await import('react');

  const buffer = await renderToBuffer(
    createElement(KardexPDF as any, {
      alumno,
      historial: historial as any,
      evaluacion: evaluacion as any,
      escuela: {
        nombre: cfgRes.data?.nombre_escuela ?? 'EPO 221 "Nicolás Bravo"',
        cct: cfgRes.data?.cct ?? '15EBH0409B',
      },
      extras: {
        reportes,
        conductaNeg,
        reconocimientos,
      },
    }),
  );

  const filename = `kardex-${alumno.matricula ?? alumno.curp}.pdf`;
  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
