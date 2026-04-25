import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { profesorId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  const isAdmin = perfil && ['admin', 'staff', 'director'].includes(perfil.rol);

  const { data: profesor } = await supabase.from('profesores').select('*').eq('id', params.profesorId).maybeSingle();
  if (!profesor) return new Response('Not found', { status: 404 });
  if (!isAdmin && profesor.perfil_id !== user.id) return new Response('Forbidden', { status: 403 });

  // Ciclo activo (o el solicitado por query)
  const url = new URL(req.url);
  const cicloId = url.searchParams.get('ciclo_id');
  const { data: ciclo } = cicloId
    ? await supabase.from('ciclos_escolares').select('*').eq('id', cicloId).maybeSingle()
    : await supabase.from('ciclos_escolares').select('*').eq('activo', true).order('created_at', { ascending: false }).limit(1).maybeSingle();

  const { data: asigs } = await supabase
    .from('asignaciones')
    .select('id, materia:materias(nombre, horas_semestrales), grupo:grupos(grado, semestre, grupo, turno)')
    .eq('profesor_id', params.profesorId)
    .eq('ciclo_id', ciclo?.id ?? '00000000-0000-0000-0000-000000000000');

  const cargas = (asigs ?? []).map((a: any) => {
    // horas_semestrales es por semestre (≈18 sem). horas/semana = Math.round(horas_sem / 18)
    const hsem = Number(a.materia?.horas_semestrales ?? 0);
    const horas = Math.max(1, Math.round(hsem / 18));
    const g = a.grupo;
    const grupoTxt = g ? `${g.grado}°${String.fromCharCode(64 + (g.grupo ?? 1))} (${g.turno ?? ''})` : '—';
    return { materia: a.materia?.nombre ?? '—', grupo: grupoTxt, horas };
  });

  const { data: cfg } = await supabase.from('sitio_config').select('*').maybeSingle();

  const escuela = {
    nombre: (cfg as any)?.nombre_escuela ?? 'EPO 221 "Nicolás Bravo"',
    cct: (cfg as any)?.cct ?? '15EBH0409B',
    ciudad: (cfg as any)?.ciudad ?? 'Tecamachalco, Puebla',
    director: (cfg as any)?.director_nombre ?? null,
  };

  const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const folio = `CS-${(profesor.rfc ?? profesor.id.slice(0, 6)).toUpperCase()}-${new Date().getFullYear()}`;

  const { renderToBuffer } = await import('@react-pdf/renderer');
  const { ConstanciaServicioPDF } = await import('@/lib/pdf/ConstanciaServicio');
  const { createElement } = await import('react');

  const buffer = await renderToBuffer(
    createElement(ConstanciaServicioPDF as any, { profesor, ciclo, cargas, escuela, folio, fecha }),
  );

  const filename = `constancia-${(profesor.rfc ?? profesor.id).toLowerCase()}.pdf`;
  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
