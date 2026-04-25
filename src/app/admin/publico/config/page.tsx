import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { guardarConfig } from './actions';

export default async function AdminConfig() {
  const supabase = createClient();
  const { data: cfg } = await supabase.from('sitio_config').select('*').maybeSingle();

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <Link href="/admin/publico" className="text-xs text-gray-500 hover:underline">← Sitio público</Link>
        <h1 className="font-serif text-3xl text-verde mt-1">Configuración del sitio</h1>
        <p className="text-sm text-gray-500 mt-1">Todos los campos se reflejan automáticamente en el sitio público.</p>
      </div>

      <form action={guardarConfig} className="space-y-6">
        {/* Identidad */}
        <Section title="Identidad institucional" icon="🏫">
          <div className="grid md:grid-cols-2 gap-4">
            <Field name="nombre_escuela" label="Nombre de la escuela" defaultValue={cfg?.nombre_escuela ?? ''} />
            <Field name="cct" label="CCT" defaultValue={cfg?.cct ?? ''} />
          </div>
        </Section>

        {/* Contacto */}
        <Section title="Contacto" icon="📞">
          <div className="grid md:grid-cols-2 gap-4">
            <Field name="telefono" label="Teléfono" defaultValue={cfg?.telefono ?? ''} />
            <Field name="email" label="Email" type="email" defaultValue={cfg?.email ?? ''} />
            <Field name="horario" label="Horario" defaultValue={cfg?.horario ?? ''} className="md:col-span-2" placeholder="Ej. Lunes a viernes de 7:00 a 14:00" />
            <Field name="direccion" label="Dirección" defaultValue={cfg?.direccion ?? ''} className="md:col-span-2" />
            <Field name="mapa_embed_url" label="URL embed Google Maps" defaultValue={cfg?.mapa_embed_url ?? ''} className="md:col-span-2" placeholder="https://www.google.com/maps/embed?pb=..." />
            <Field name="whatsapp_url" label="WhatsApp (link)" defaultValue={cfg?.whatsapp_url ?? ''} placeholder="https://wa.me/5215555555555" />
            <Field name="youtube_url" label="YouTube" defaultValue={cfg?.youtube_url ?? ''} />
          </div>
        </Section>

        {/* Misión / Visión */}
        <Section title="Identidad · Misión, visión e historia" icon="🌟">
          <div className="grid gap-4">
            <FieldTA name="mision"   label="Misión"   defaultValue={cfg?.mision ?? ''} rows={3} />
            <FieldTA name="vision"   label="Visión"   defaultValue={cfg?.vision ?? ''} rows={3} />
            <FieldTA name="historia" label="Historia" defaultValue={cfg?.historia ?? ''} rows={4} />
          </div>
        </Section>

        {/* Estadísticas del hero */}
        <Section title="Estadísticas (portada)" icon="📊">
          <div className="grid md:grid-cols-4 gap-4">
            <Field name="total_alumnos"         label="Total de alumnos"     type="number" defaultValue={String(cfg?.total_alumnos ?? '')} />
            <Field name="total_generaciones"    label="Generaciones"         type="number" defaultValue={String(cfg?.total_generaciones ?? '')} />
            <Field name="aniversario"           label="Años de la escuela"   type="number" defaultValue={String(cfg?.aniversario ?? '')} />
            <Field name="porcentaje_aprobacion" label="% Aprobación"         type="number" defaultValue={String(cfg?.porcentaje_aprobacion ?? '')} />
          </div>
        </Section>

        {/* Cuenta bancaria institucional (uso interno para pagos de alumnos) */}
        <Section title="Cuenta bancaria institucional" icon="🏦" accent>
          <div className="grid md:grid-cols-2 gap-4">
            <Field name="banco"          label="Banco"              defaultValue={cfg?.banco ?? ''} placeholder="Ej. BBVA, Banorte, Santander..." />
            <Field name="titular_cuenta" label="Titular / Beneficiario" defaultValue={cfg?.titular_cuenta ?? ''} placeholder="Nombre como aparece en la cuenta" />
            <Field name="numero_cuenta"  label="Número de cuenta"   defaultValue={cfg?.numero_cuenta ?? ''} />
            <Field name="clabe"          label="CLABE interbancaria (18 dígitos)" defaultValue={cfg?.clabe ?? ''} />
            <Field name="referencia_donacion" label="Concepto / Referencia sugerida" defaultValue={cfg?.referencia_donacion ?? ''} className="md:col-span-2" placeholder='Ej. "Pago EPO221 + nombre del alumno"' />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Datos usados internamente para los pagos y aportaciones de los alumnos. No se muestran en el sitio público.
          </p>
        </Section>

        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-2">
          <button type="submit" className="w-full md:w-auto bg-verde text-white px-8 py-3 rounded-lg hover:bg-verde-medio font-semibold shadow-lg">
            💾 Guardar toda la configuración
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, icon, accent, children }: { title: string; icon: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-xl shadow-sm overflow-hidden border ${accent ? 'border-dorado/40' : 'border-transparent'}`}>
      <header className={`px-5 py-3 ${accent ? 'bg-gradient-to-r from-dorado/20 to-dorado/5' : 'bg-crema'} border-b border-dorado/10`}>
        <div className="flex items-center gap-2 text-verde font-serif text-lg">
          <span className="text-2xl">{icon}</span>
          {title}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({
  name, label, defaultValue, type = 'text', placeholder, className = '',
}: { name: string; label: string; defaultValue?: string; type?: string; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-verde focus:ring-1 focus:ring-verde outline-none transition"
      />
    </div>
  );
}

function FieldTA({
  name, label, defaultValue, rows = 3, className = '',
}: { name: string; label: string; defaultValue?: string; rows?: number; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-verde focus:ring-1 focus:ring-verde outline-none transition resize-none"
      />
    </div>
  );
}
