// Ficha personal editable (datos de contacto y tutor).
import { getAlumnoActual } from '@/lib/queries';
import { actualizarFicha } from './actions';
import { AvatarUploader } from '@/components/AvatarUploader';

export default async function FichaAlumno() {
  const a = (await getAlumnoActual())!;
  const iniciales = `${a.nombre?.[0] ?? ''}${a.apellido_paterno?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-serif text-3xl text-verde">Mi ficha</h1>

      <AvatarUploader fotoActual={(a as any).foto_url} iniciales={iniciales} />

      {/* ── Datos fijos (solo lectura) ───────────────────────── */}
      <section className="bg-white rounded-lg p-5 shadow-sm">
        <h2 className="text-sm uppercase text-gray-500 mb-3">Datos escolares</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info k="Nombre completo" v={`${a.nombre} ${a.apellido_paterno} ${a.apellido_materno ?? ''}`} />
          <Info k="CURP" v={a.curp} mono />
          <Info k="Matrícula" v={a.matricula ?? '—'} mono />
          <Info k="Generación" v={a.generacion ?? '—'} />
          <Info k="Sexo" v={a.sexo === 'H' ? 'Hombre' : a.sexo === 'M' ? 'Mujer' : '—'} />
          <Info k="Fecha nac." v={a.fecha_nacimiento ?? '—'} />
          <Info k="Estatus" v={a.estatus} />
          <Info k="Escuela de procedencia" v={a.escuela_procedencia ?? '—'} />
        </dl>
        <p className="text-xs text-gray-400 mt-4">
          Si detectas un error en estos datos, acude a Control Escolar.
        </p>
      </section>

      {/* ── Datos editables ──────────────────────────────────── */}
      <form action={actualizarFicha} className="bg-white rounded-lg p-5 shadow-sm space-y-4">
        <h2 className="text-sm uppercase text-gray-500">Datos de contacto</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field name="email" label="Correo electrónico" type="email" defaultValue={a.email ?? ''} />
          <Field name="telefono" label="Teléfono" defaultValue={a.telefono ?? ''} />
          <Field name="direccion" label="Dirección" defaultValue={a.direccion ?? ''} full />
          <Field name="codigo_postal" label="Código postal" defaultValue={a.codigo_postal ?? ''} />
          <Field name="municipio" label="Municipio" defaultValue={a.municipio ?? ''} />
        </div>

        <h2 className="text-sm uppercase text-gray-500 pt-4 border-t">Tutor / responsable</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field name="tutor_nombre" label="Nombre del tutor" defaultValue={a.tutor_nombre ?? ''} />
          <Field name="tutor_parentesco" label="Parentesco" defaultValue={a.tutor_parentesco ?? ''} />
          <Field name="tutor_telefono" label="Teléfono del tutor" defaultValue={a.tutor_telefono ?? ''} />
          <Field name="tutor_email" label="Correo del tutor" type="email" defaultValue={a.tutor_email ?? ''} />
        </div>

        <button
          type="submit"
          className="bg-verde hover:bg-verde-medio text-white font-semibold px-6 py-2 rounded-md transition"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}

function Info({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-gray-500">{k}</dt>
      <dd className={mono ? 'font-mono text-xs' : ''}>{v}</dd>
    </>
  );
}

function Field({ name, label, type = 'text', defaultValue, full = false }: any) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-xs text-gray-600">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:border-verde focus:ring-1 focus:ring-verde outline-none"
      />
    </label>
  );
}
