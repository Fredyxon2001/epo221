// Perfil editable del docente / orientador.
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card, Badge } from '@/components/privado/ui';
import { PerfilEditor } from '@/components/perfil/PerfilEditor';

export default async function PerfilProfesor() {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const supabase = adminClient();

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, email, telefono, cargo, bio, avatar_url, apellido_paterno, apellido_materno, rol')
    .eq('id', user.id)
    .maybeSingle();

  const { data: prof } = await supabase
    .from('profesores')
    .select('id, nombre, apellido_paterno, apellido_materno, rfc, email, telefono, foto_url')
    .eq('perfil_id', user.id)
    .maybeSingle();

  if (!perfil) return <div className="p-6">Perfil no disponible.</div>;

  // Cargar grupos orientados y asignaciones impartidas
  let gruposOrientados: any[] = [];
  let asignaciones: any[] = [];
  if ((prof as any)?.id) {
    const pid = (prof as any).id;
    const [orient, asigs] = await Promise.all([
      supabase.from('grupos')
        .select('id, grado, semestre, grupo, turno, ciclo:ciclos_escolares(codigo)')
        .eq('orientador_id', pid)
        .is('deleted_at', null)
        .order('grado').order('grupo'),
      supabase.from('asignaciones')
        .select('id, materia:materias(nombre), grupo:grupos(grado, semestre, grupo, turno), ciclo:ciclos_escolares(codigo, activo)')
        .eq('profesor_id', pid)
        .order('created_at', { ascending: false }),
    ]);
    gruposOrientados = orient.data ?? [];
    asignaciones = (asigs.data ?? []).filter((a: any) => a.ciclo?.activo);
  }

  const esOrientador = gruposOrientados.length > 0;
  const daClases = asignaciones.length > 0;

  // Sub-tipo de profesor visible al usuario
  const subTipo = esOrientador && daClases ? '🧭 + 👨‍🏫 Maestro y Orientador'
    : esOrientador ? '🧭 Solo Orientador'
    : daClases ? '👨‍🏫 Solo Maestro'
    : '👤 Profesor (sin asignaciones aún)';

  const data = {
    nombre: prof?.nombre || perfil.nombre?.split(' ')[0] || '',
    apellido_paterno: prof?.apellido_paterno ?? perfil.apellido_paterno ?? '',
    apellido_materno: prof?.apellido_materno ?? perfil.apellido_materno ?? '',
    email: perfil.email ?? prof?.email ?? '',
    telefono: prof?.telefono ?? perfil.telefono ?? '',
    cargo: perfil.cargo ?? '',
    bio: perfil.bio ?? '',
    avatar_url: perfil.avatar_url ?? prof?.foto_url ?? null,
    rfc: prof?.rfc ?? '',
    rol: perfil.rol,
  };

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        eyebrow="Mi cuenta"
        title="👤 Mi perfil"
        description="Edita tu foto, datos de contacto y configura cómo apareces en el sistema."
      />

      {/* Resumen del rol funcional */}
      <Card eyebrow="Tu rol en el plantel" title={subTipo}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Grupos orientados */}
          {esOrientador && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold mb-2">
                🧭 Grupos que orientas ({gruposOrientados.length}/4)
              </div>
              <div className="space-y-1">
                {gruposOrientados.map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-sm">
                    <span className="font-semibold">
                      {g.grado}°{String.fromCharCode(64 + (g.grupo ?? 1))}
                    </span>
                    <span className="text-xs text-gray-500">{g.turno} · {g.ciclo?.codigo}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-amber-700 mt-2">
                Como orientador validas calificaciones y acompañas solicitudes de revisión de estos grupos.
              </p>
            </div>
          )}

          {/* Asignaciones (materias que enseña) */}
          {daClases && (
            <div className="bg-verde-claro/10 border border-verde/20 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-verde-oscuro font-bold mb-2">
                👨‍🏫 Materias que impartes ({asignaciones.length})
              </div>
              <div className="space-y-1">
                {asignaciones.slice(0, 6).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-sm">
                    <span className="truncate flex-1 mr-2" title={a.materia?.nombre}>
                      {a.materia?.nombre?.split(' - ')[0] ?? '—'}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {a.grupo?.grado}°{String.fromCharCode(64 + (a.grupo?.grupo ?? 1))}
                    </span>
                  </div>
                ))}
                {asignaciones.length > 6 && (
                  <div className="text-[11px] text-gray-500 text-center pt-1">
                    +{asignaciones.length - 6} asignaciones más
                  </div>
                )}
              </div>
            </div>
          )}

          {!esOrientador && !daClases && (
            <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600 text-center">
              No tienes grupos ni materias asignadas todavía. Contacta al administrador para que te asigne carga académica.
            </div>
          )}
        </div>

        <div className="mt-3 text-[11px] text-gray-500">
          La asignación de grupos y materias la realiza el área administrativa. Si necesitas un cambio, contacta a Control Escolar.
        </div>
      </Card>

      <PerfilEditor data={data} esProfesor={true} />

      <Card>
        <div className="text-xs text-gray-500 space-y-1">
          <p>📌 <strong>¿Quieres cambiar tu contraseña?</strong> Pídele al administrador que te resetée el password desde <code>/admin/usuarios</code>.</p>
          <p>📌 <strong>¿Datos oficiales incorrectos?</strong> (CURP, RFC, fecha de nacimiento) — contacta a Control Escolar para corrección documentada.</p>
        </div>
      </Card>
    </div>
  );
}
