// Descarga XLSX con las credenciales generadas en una importación masiva.
// Sirve para imprimirla y entregarla a los alumnos.
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = createClient();
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data: imp } = await supabase
    .from('imports_credenciales')
    .select('credenciales, total, created_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!imp) return new Response('Not found', { status: 404 });

  const creds = (imp.credenciales as any[]) ?? [];

  const wb = XLSX.utils.book_new();

  // Hoja 1: Lista de credenciales
  const data = [
    ['CREDENCIALES DE ACCESO — EPO 221 "Nicolás Bravo"'],
    [`Generado: ${new Date(imp.created_at).toLocaleString('es-MX')}  ·  Total: ${imp.total} alumnos`],
    ['URL: https://epo221.edu.mx/login'],
    [],
    ['NOMBRE', 'MATRÍCULA', 'EMAIL DE LOGIN', 'CONTRASEÑA INICIAL'],
    ...creds.map((c) => [c.nombre, c.matricula, c.email, c.password]),
    [],
    ['INSTRUCCIONES PARA EL ALUMNO:'],
    ['1) Ingresa a https://epo221.edu.mx y haz clic en "Acceder al sistema"'],
    ['2) Captura tu EMAIL DE LOGIN (ej: diego.ramirez@epo221.local)'],
    ['3) Captura la CONTRASEÑA INICIAL: TEMPORALEPO221!'],
    ['4) Te recomendamos cambiarla por una propia desde "Cambiar mi contraseña"'],
    ['5) Si olvidas tu contraseña, acércate a Control Escolar.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 38 }, { wch: 22 }];

  // Merges para títulos
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Credenciales');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `credenciales-alumnos-${new Date(imp.created_at).toISOString().slice(0, 10)}.xlsx`;

  return new Response(buf as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
