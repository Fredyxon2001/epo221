// Búsqueda global cross-entidad para Cmd+K del admin.
// Solo accesible para admin/staff/director. Devuelve alumnos, profesores, grupos, materias.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'no-auth' }, { status: 401 });
  // Verificar rol con adminClient (bypass RLS) para evitar falsos negativos
  const admin = adminClient();
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).maybeSingle();
  if (!['admin', 'staff', 'director'].includes((perfil as any)?.rol ?? '')) {
    return NextResponse.json({ error: 'sin-permiso', rol: (perfil as any)?.rol ?? null }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ alumnos: [], profesores: [], grupos: [], materias: [] });

  const like = `%${q}%`;

  const [alumnosRes, profesoresRes, gruposRes, materiasRes] = await Promise.all([
    // Alumnos: busca en nombre, apellidos, matrícula, curp, email
    admin
      .from('alumnos')
      .select('id, matricula, curp, nombre, apellido_paterno, apellido_materno, email')
      .or(`nombre.ilike.${like},apellido_paterno.ilike.${like},apellido_materno.ilike.${like},matricula.ilike.${like},curp.ilike.${like},email.ilike.${like}`)
      .limit(8),
    // Profesores: por nombre del perfil
    admin
      .from('profesores')
      .select('id, perfil:perfiles!inner(nombre, email)')
      .or(`nombre.ilike.${like},email.ilike.${like}`, { foreignTable: 'perfil' })
      .limit(6),
    // Grupos: por nombre
    admin
      .from('grupos')
      .select('id, nombre, ciclo:ciclos_escolares(nombre)')
      .ilike('nombre', like)
      .limit(5),
    // Materias: por nombre
    admin
      .from('materias')
      .select('id, nombre, semestre')
      .ilike('nombre', like)
      .limit(5),
  ]);

  return NextResponse.json({
    alumnos: (alumnosRes.data ?? []).map((a: any) => ({
      id: a.id,
      matricula: a.matricula,
      nombre: `${a.nombre} ${a.apellido_paterno ?? ''} ${a.apellido_materno ?? ''}`.trim(),
      grupo: null,
      href: `/admin/alumnos/${a.id}`,
    })),
    profesores: (profesoresRes.data ?? []).map((p: any) => ({
      id: p.id,
      nombre: p.perfil?.nombre ?? '—',
      email: p.perfil?.email ?? '',
      href: `/admin/profesores`,
    })),
    grupos: (gruposRes.data ?? []).map((g: any) => ({
      id: g.id, nombre: g.nombre, ciclo: g.ciclo?.nombre ?? '',
      href: `/admin/grupos/${g.id}`,
    })),
    materias: (materiasRes.data ?? []).map((m: any) => ({
      id: m.id, nombre: m.nombre, semestre: m.semestre,
      href: `/admin/materias`,
    })),
  });
}
