import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/privado/ui';

export default async function ConstanciaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase.from('profesores').select('id, nombre, apellido_paterno, rfc').eq('perfil_id', user!.id).maybeSingle();

  if (!prof) return <div className="p-5">No eres docente.</div>;

  const { data: ciclos } = await supabase.from('ciclos_escolares').select('id, codigo, periodo, activo').order('created_at', { ascending: false });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Documentos oficiales"
        title="📄 Constancia de servicio"
        description="Descarga una constancia con tu carga horaria por ciclo escolar."
      />

      <Card>
        <div className="space-y-3 text-sm">
          <p className="text-gray-600">
            Docente: <strong>{prof.nombre} {prof.apellido_paterno}</strong>
            {prof.rfc && <> · RFC <strong>{prof.rfc}</strong></>}
          </p>

          <div className="divide-y">
            {(ciclos ?? []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-semibold">{c.codigo}</div>
                  <div className="text-xs text-gray-500">
                    {c.periodo ?? '—'} {c.activo && <span className="ml-2 bg-verde-claro/30 text-verde-oscuro px-2 py-0.5 rounded text-[10px]">Ciclo activo</span>}
                  </div>
                </div>
                <a
                  href={`/api/constancia/${prof.id}?ciclo_id=${c.id}`}
                  target="_blank"
                  className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-3 py-1.5 rounded text-xs"
                >
                  📄 Descargar PDF
                </a>
              </div>
            ))}
            {(ciclos ?? []).length === 0 && (
              <p className="py-6 text-center text-gray-500">No hay ciclos registrados.</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
