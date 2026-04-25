import { createClient } from '@/lib/supabase/server';
import { crearProfesor, toggleProfesor } from './actions';
import { AdminResetPasswordButton } from '@/components/AdminResetPasswordButton';

export default async function AdminProfesores() {
  const supabase = createClient();
  const { data: profes } = await supabase
    .from('profesores').select('*').order('apellido_paterno');

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Profesores</h1>

      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold text-verde mb-3">Nuevo profesor</h2>
        <form action={crearProfesor} className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
          <input name="nombre" placeholder="Nombre" required className="border rounded px-2 py-1" />
          <input name="apellido_paterno" placeholder="Ap. paterno" required className="border rounded px-2 py-1" />
          <input name="apellido_materno" placeholder="Ap. materno" className="border rounded px-2 py-1" />
          <input name="email" type="email" placeholder="Correo" required className="border rounded px-2 py-1" />
          <input name="rfc" placeholder="RFC" className="border rounded px-2 py-1" />
          <button className="bg-verde text-white rounded px-3 py-1 hover:bg-verde-medio">Crear</button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Se crea cuenta de acceso con contraseña temporal enviada al correo indicado.
        </p>
      </section>

      <section className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-xs uppercase text-gray-600">
            <tr>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">Correo</th>
              <th className="text-left p-2">RFC</th>
              <th className="text-center p-2">Activo</th>
              <th className="text-center p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(profes ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.apellido_paterno} {p.apellido_materno} {p.nombre}</td>
                <td className="p-2 text-xs">{p.email}</td>
                <td className="p-2 font-mono text-xs">{p.rfc ?? '—'}</td>
                <td className="p-2 text-center">{p.activo ? '✓' : '—'}</td>
                <td className="p-2 text-center space-x-2">
                  <form action={toggleProfesor} className="inline">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="activo" value={p.activo ? '0' : '1'} />
                    <button className="text-xs text-verde hover:underline">
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </form>
                  {p.perfil_id && (
                    <AdminResetPasswordButton perfilId={p.perfil_id} nombre={`${p.nombre} ${p.apellido_paterno}`} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
