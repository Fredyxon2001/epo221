// Ficha personal editable (datos de contacto y tutor) con límite de 2 modificaciones libres.
import { createClient } from '@/lib/supabase/server';
import { getAlumnoActual } from '@/lib/queries';
import { AvatarUploader } from '@/components/AvatarUploader';
import { FichaForm } from './FichaForm';

export default async function FichaAlumno() {
  const a = await getAlumnoActual();
  if (!a) return null;
  const supabase = createClient();
  const iniciales = `${a.nombre?.[0] ?? ''}${a.apellido_paterno?.[0] ?? ''}`.toUpperCase();

  // Solicitud pendiente
  const { data: solPendiente } = await supabase
    .from('solicitudes_modificacion_ficha')
    .select('id')
    .eq('alumno_id', a.id)
    .eq('estado', 'pendiente')
    .maybeSingle();

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

      {/* ── Datos editables con límite de modificaciones ──── */}
      <FichaForm
        a={a}
        modificacionesUsadas={(a as any).modificaciones_libres_usadas ?? 0}
        solicitudPendiente={!!solPendiente}
      />
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
