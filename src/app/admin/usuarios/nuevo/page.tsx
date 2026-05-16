// Alta unificada de usuarios (cualquier rol)
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';
import { NuevoUsuarioForm } from './NuevoUsuarioForm';
import Link from 'next/link';

export default async function NuevoUsuarioPage() {
  const supabase = createClient();

  // Grupos disponibles para asignar como orientador
  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, grado, semestre, grupo, turno, orientador_id, orientador:profesores(nombre, apellido_paterno)')
    .is('deleted_at', null)
    .order('grado').order('grupo');

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Personas"
        title="➕ Nuevo usuario"
        description="Crea cuentas para cualquier rol: alumno, profesor, orientador (combo), director, admin, staff o finanzas."
        actions={
          <Link href="/admin/usuarios" className="text-sm text-verde hover:underline">
            ← Volver a usuarios
          </Link>
        }
      />

      <Card eyebrow="📥 Carga masiva de alumnos" title="¿Vas a dar de alta varios alumnos?">
        <p className="text-sm text-gray-600 mb-3">
          Si vas a dar de alta más de 5 alumnos a la vez, es más rápido usar la importación masiva con plantilla XLSX.
        </p>
        <Link href="/admin/alumnos" className="inline-block bg-verde hover:bg-verde-oscuro text-white text-sm font-semibold px-4 py-2 rounded-lg">
          📥 Ir a importación masiva
        </Link>
      </Card>

      <Card eyebrow="Crear cuenta individual" title="Datos del nuevo usuario">
        <NuevoUsuarioForm grupos={(grupos ?? []) as any} />
      </Card>
    </div>
  );
}
