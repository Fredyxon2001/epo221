import { createClient } from '@/lib/supabase/server';
import { toCSV, csvResponse } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = createClient();

  // Verifica rol admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
  if (!perfil || (perfil.rol !== 'admin' && perfil.rol !== 'staff')) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(req.url);
  const semestre = url.searchParams.get('semestre');
  const campo    = url.searchParams.get('campo');
  const q        = url.searchParams.get('q');

  let query = supabase
    .from('materias')
    .select('id, nombre, semestre, tipo, horas_semestrales, campo:campos_disciplinares(nombre)')
    .is('deleted_at', null)
    .order('semestre')
    .order('nombre');
  if (semestre) query = query.eq('semestre', Number(semestre));
  if (campo)    query = query.eq('campo_disciplinar_id', Number(campo));
  if (q)        query = query.ilike('nombre', `%${q}%`);

  const { data } = await query;

  const rows = (data ?? []).map((m: any) => ({
    id: m.id,
    nombre: m.nombre,
    semestre: m.semestre,
    campo: m.campo?.nombre ?? '',
    tipo: m.tipo,
    horas_semestrales: m.horas_semestrales ?? '',
  }));

  const csv = toCSV(rows, [
    { key: 'id',                label: 'ID' },
    { key: 'nombre',            label: 'Materia' },
    { key: 'semestre',          label: 'Semestre' },
    { key: 'campo',             label: 'Campo disciplinar' },
    { key: 'tipo',              label: 'Tipo' },
    { key: 'horas_semestrales', label: 'Horas semestrales' },
  ]);

  return csvResponse(csv, `materias-${new Date().toISOString().slice(0, 10)}.csv`);
}
