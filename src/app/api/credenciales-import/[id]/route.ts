import { apiAccess } from '@/lib/security/api-access';
// Descarga XLSX con las credenciales generadas en una importación masiva.
// Sirve para imprimirla y entregarla a los alumnos.
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/security/credentials';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const denied = await apiAccess(_req, ["admin","staff","director"]);
  if (denied) return denied;

  const params = await props.params;
  const auth = (await createClient());
  const supabase = adminClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!perfil || !['admin', 'staff', 'director'].includes(perfil.rol)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data: imp } = await supabase
    .from('imports_credenciales')
    .select('credentials_ciphertext, total, created_at, expires_at, downloaded_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!imp) return new Response('Not found', { status: 404 });

  if (!imp.credentials_ciphertext || imp.downloaded_at || !imp.expires_at || Date.parse(imp.expires_at) <= Date.now()) return new Response('La descarga venció o ya fue utilizada.', { status: 410 });
  const creds = decryptCredentials(imp.credentials_ciphertext);

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
    ['2) Captura tu EMAIL DE LOGIN (ej: diego.ramirez@epo221.edu.mx)'],
    ['3) Captura la contraseña individual de tu fila. No la compartas.'],
    ['4) El sistema te pedirá cambiarla antes de consultar tus datos.'],
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
  // Claim once atomically: concurrent requests cannot download the same secret.
  const { data: claimed, error: claimError } = await supabase.from('imports_credenciales').update({ credentials_ciphertext: null, downloaded_at: new Date().toISOString() }).eq('id', params.id).is('downloaded_at', null).gt('expires_at', new Date().toISOString()).select('id').maybeSingle();
  if (claimError || !claimed) return new Response('Descarga no disponible.', { status: 410 });
  const filename = `credenciales-alumnos-${new Date(imp.created_at).toISOString().slice(0, 10)}.xlsx`;

  return new Response(buf as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
