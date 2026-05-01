// Gestión universal de usuarios y reset de contraseñas (5 roles)
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Badge, EmptyState } from '@/components/privado/ui';
import { ResetPasswordRow } from './ResetPasswordRow';

const ROL_TONO: Record<string, any> = {
  alumno: 'azul', profesor: 'verde', orientador: 'dorado',
  director: 'rosa', admin: 'gray', staff: 'gray',
};

const ROL_ICON: Record<string, string> = {
  alumno: '🎓', profesor: '👨‍🏫', orientador: '🧭',
  director: '🏛️', admin: '⚙️', staff: '🛠️',
};

export default async function UsuariosPage({ searchParams }: { searchParams?: { rol?: string; q?: string } }) {
  const supabase = createClient();
  const filtroRol = searchParams?.rol ?? 'todos';
  const q = (searchParams?.q ?? '').trim();

  let query = supabase
    .from('perfiles')
    .select('id, nombre, email, rol, password_reset_at, debe_cambiar_password, created_at')
    .order('rol')
    .order('nombre');
  if (filtroRol !== 'todos') query = query.eq('rol', filtroRol as any);
  if (q) query = query.or(`nombre.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: perfiles } = await query.limit(500);

  // Conteo por rol (sin filtros)
  const { data: todos } = await supabase.from('perfiles').select('rol');
  const counts: Record<string, number> = {};
  for (const r of todos ?? []) counts[(r as any).rol] = (counts[(r as any).rol] ?? 0) + 1;

  // Detectar orientadores (profesores con grupos a su cargo)
  const { data: profsConGrupo } = await supabase
    .from('grupos').select('orientador:profesores(perfil_id)').is('deleted_at', null).not('orientador_id', 'is', null);
  const orientadorPerfiles = new Set((profsConGrupo ?? []).map((g: any) => g.orientador?.perfil_id).filter(Boolean));

  const roles = [
    { key: 'todos', label: 'Todos', count: todos?.length ?? 0 },
    { key: 'alumno', label: '🎓 Alumnos', count: counts.alumno ?? 0 },
    { key: 'profesor', label: '👨‍🏫 Profesores', count: counts.profesor ?? 0 },
    { key: 'director', label: '🏛️ Director', count: counts.director ?? 0 },
    { key: 'admin', label: '⚙️ Admin', count: counts.admin ?? 0 },
    { key: 'staff', label: '🛠️ Staff', count: counts.staff ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cuentas y accesos"
        title="🔑 Gestión de usuarios y contraseñas"
        description="Resetea contraseñas para cualquier rol. Genera password temporal o envía un magic link al correo del usuario."
      />

      <Card>
        <form method="get" className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-sm">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o email…"
            className="border rounded-lg px-3 py-2 md:col-span-2"
          />
          <button className="bg-verde hover:bg-verde-oscuro text-white font-semibold rounded-lg px-3 py-2">
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap gap-2 mb-4">
          {roles.map((r) => (
            <a key={r.key} href={`/admin/usuarios?rol=${r.key}${q ? `&q=${q}` : ''}`}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${filtroRol === r.key ? 'bg-verde text-white' : 'bg-gray-100 text-gray-700'}`}>
              {r.label} <span className="opacity-70">({r.count})</span>
            </a>
          ))}
        </div>

        {(perfiles ?? []).length === 0 ? (
          <EmptyState icon="🔍" title="Sin resultados" description="Ajusta los filtros para encontrar al usuario." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Reset reciente</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {perfiles!.map((u: any) => {
                  const isOrient = u.rol === 'profesor' && orientadorPerfiles.has(u.id);
                  const rolDisplay = isOrient ? 'orientador' : u.rol;
                  return (
                    <tr key={u.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <div className="font-semibold">{u.nombre ?? '—'}</div>
                        {u.debe_cambiar_password && <div className="text-[10px] text-amber-700">⚠️ Debe cambiar password</div>}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-600">{u.email}</td>
                      <td className="px-3 py-2">
                        <Badge tone={ROL_TONO[rolDisplay] ?? 'gray'} size="sm">
                          <span className="mr-1">{ROL_ICON[rolDisplay] ?? '👤'}</span>
                          {rolDisplay}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {u.password_reset_at ? new Date(u.password_reset_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ResetPasswordRow perfilId={u.id} email={u.email} nombre={u.nombre ?? ''} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>📌 Modos de reset:</strong></p>
          <p>• <strong>Temporal</strong>: genera una password aleatoria de 12 caracteres. Se muestra UNA SOLA VEZ aquí en pantalla. Cópiala y compártela con el usuario por canal seguro. Al iniciar sesión deberá cambiarla.</p>
          <p>• <strong>Magic link</strong>: envía un correo de recuperación al email del usuario (con enlace de 1 hora). Recomendado cuando el usuario tiene acceso al correo y solo lo olvidó.</p>
        </div>
      </Card>
    </div>
  );
}
