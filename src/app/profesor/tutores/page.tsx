import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function DirectorioTutores({ searchParams }: { searchParams: { q?: string; grupo?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id').eq('perfil_id', user!.id).maybeSingle();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id').eq('activo', true).maybeSingle();

  // Grupos del profe (asignaciones + orientaciones)
  const { data: asigs } = await supabase.from('asignaciones')
    .select('grupo_id').eq('profesor_id', prof?.id ?? '').eq('ciclo_id', ciclo?.id ?? '');
  const { data: orient } = await supabase.from('grupos').select('id').eq('orientador_id', prof?.id ?? '');
  const gids = Array.from(new Set([...(asigs ?? []).map((a: any) => a.grupo_id), ...(orient ?? []).map((g: any) => g.id)]));

  const { data: grupos } = gids.length
    ? await supabase.from('grupos').select('id, grado, semestre, grupo, turno').in('id', gids).order('semestre')
    : { data: [] as any[] };

  const grupoFilter = searchParams.grupo && gids.includes(searchParams.grupo) ? searchParams.grupo : null;
  const q = (searchParams.q ?? '').toLowerCase().trim();

  const activeGids = grupoFilter ? [grupoFilter] : gids;
  const { data: insc } = activeGids.length
    ? await supabase.from('inscripciones')
        .select('grupo_id, alumno:alumnos(id, nombre, apellido_paterno, apellido_materno, matricula, telefono, email, tutor_nombre, tutor_parentesco, tutor_telefono, tutor_email)')
        .in('grupo_id', activeGids)
    : { data: [] as any[] };

  const filas = (insc ?? [])
    .map((i: any) => ({ grupo_id: i.grupo_id, a: i.alumno }))
    .filter(({ a }) => {
      if (!q) return true;
      const hay = `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno ?? ''} ${a.tutor_nombre ?? ''} ${a.matricula ?? ''}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((x, y) => `${x.a.apellido_paterno}${x.a.nombre}`.localeCompare(`${y.a.apellido_paterno}${y.a.nombre}`));

  const grupoMap = new Map((grupos ?? []).map((g: any) => [g.id, g]));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Contacto familiar"
        title="📞 Directorio de tutores"
        description="Contacta a los tutores por WhatsApp, teléfono o correo directamente desde aquí."
      />

      <Card>
        <form className="flex flex-wrap gap-2 items-end mb-4">
          <label className="flex-1 min-w-[200px]">
            <span className="text-xs text-gray-600">Buscar</span>
            <input name="q" defaultValue={searchParams.q ?? ''}
              placeholder="Nombre del alumno, tutor o matrícula…"
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="w-48">
            <span className="text-xs text-gray-600">Grupo</span>
            <select name="grupo" defaultValue={searchParams.grupo ?? ''}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              {(grupos ?? []).map((g: any) => (
                <option key={g.id} value={g.id}>{g.semestre}° {g.grupo} {g.turno ?? ''}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-4 py-2 rounded-lg text-sm">
            Filtrar
          </button>
        </form>

        {filas.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Sin resultados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-2">Alumno</th>
                  <th className="text-left p-2">Grupo</th>
                  <th className="text-left p-2">Tutor</th>
                  <th className="text-left p-2">Contacto tutor</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ a, grupo_id }) => {
                  const g: any = grupoMap.get(grupo_id);
                  const telWA = a.tutor_telefono?.replace(/\D/g, '');
                  const telWA10 = telWA && telWA.length === 10 ? `52${telWA}` : telWA;
                  return (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="font-semibold">{a.apellido_paterno} {a.apellido_materno ?? ''} {a.nombre}</div>
                        <div className="text-gray-500">{a.matricula ?? '—'}</div>
                      </td>
                      <td className="p-2">{g ? `${g.semestre}° ${g.grupo}` : '—'}</td>
                      <td className="p-2">
                        <div>{a.tutor_nombre ?? <span className="text-gray-400 italic">Sin registro</span>}</div>
                        <div className="text-gray-500">{a.tutor_parentesco ?? ''}</div>
                      </td>
                      <td className="p-2">
                        {a.tutor_telefono && <div>📱 {a.tutor_telefono}</div>}
                        {a.tutor_email && <div>✉️ {a.tutor_email}</div>}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {telWA10 && (
                            <a href={`https://wa.me/${telWA10}`} target="_blank"
                              className="bg-[#25D366] hover:brightness-95 text-white px-2 py-1 rounded font-semibold">WhatsApp</a>
                          )}
                          {a.tutor_telefono && (
                            <a href={`tel:${a.tutor_telefono}`} className="bg-sky-600 hover:bg-sky-700 text-white px-2 py-1 rounded font-semibold">Llamar</a>
                          )}
                          {a.tutor_email && (
                            <a href={`mailto:${a.tutor_email}`} className="bg-gray-700 hover:bg-gray-900 text-white px-2 py-1 rounded font-semibold">Correo</a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
