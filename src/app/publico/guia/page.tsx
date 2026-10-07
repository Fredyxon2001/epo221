import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
export const metadata:Metadata={title:'Guía escolar · EPO 221',description:'Requisitos, fechas de admisión, trámites y preguntas frecuentes por ciclo escolar.',alternates:{canonical:'https://epo221.edu.mx/publico/guia'}};
export default async function Guia({searchParams}:{searchParams:Promise<{ciclo?:string}>}) {
  const client=await createClient();
  const query=await searchParams;
  const result=await client.from('guias_escolares').select('*').eq('publicada',true).order('ciclo_label',{ascending:false});
  if(result.error)throw new Error('No se pudo consultar la información escolar. Reintenta.');
  const guides=result.data??[];
  return <div className="max-w-4xl mx-auto px-6 pt-32 pb-16 space-y-6">
    <h1 className="font-serif text-4xl text-verde">Guía escolar</h1>
    <p>Información publicada por la escuela para cada ciclo. Comprueba las convocatorias y confirma los datos de tu trámite con Control Escolar; una guía no anuncia por sí sola inscripciones abiertas.</p>
    <nav aria-label="Información escolar" className="flex gap-4 flex-wrap"><Link href="/publico/convocatorias" className="text-verde underline">Convocatorias</Link><Link href="/publico/descargas" className="text-verde underline">Documentos por ciclo y versión</Link><Link href="/publico/contacto" className="text-verde underline">Control Escolar</Link></nav>
    <section className="border rounded-xl p-5 bg-white space-y-3" aria-labelledby="usar-sitio"><h2 id="usar-sitio" className="font-serif text-2xl text-verde">Cómo usar el sitio público</h2><p>Elige lo que necesitas para ver la explicación y abrir la sección correspondiente.</p>
      {[
        ['Conocer la escuela','Oferta explica la formación académica; Conoce muestra información institucional.','/publico/oferta','Ver oferta educativa'],
        ['Consultar un trámite','Convocatorias identifica procesos y fechas. La guía reúne la información publicada del ciclo; si falta un dato, confírmalo con Control Escolar.','/publico/convocatorias','Consultar convocatorias'],
        ['Descargar un formato','Descargas distingue archivos vigentes e históricos y permite elegir PDF para leer o DOCX para editar. Confirma ciclo y versión antes de entregarlo.','/publico/descargas','Abrir descargas'],
        ['Contactar a la escuela','Contacto muestra los medios institucionales. El mapa opcional solo se carga si autorizas sus cookies; puedes retirar ese permiso desde Preferencias de cookies.','/publico/contacto','Abrir contacto'],
        ['Entrar a mi cuenta','El sistema interno requiere la cuenta entregada por la escuela. Allí se muestran las funciones autorizadas para tu rol y su guía de uso.','/login','Iniciar sesión'],
        ['Usar la app móvil','La página App móvil ofrece el instalador Android oficial. La guía y los datos privados se consultan con las mismas reglas de acceso de tu cuenta.','/app-movil','Ver app móvil'],
      ].map(([title,text,href,label])=><details key={href} className="border rounded-lg p-4"><summary className="cursor-pointer font-semibold">{title}</summary><p className="mt-3 mb-3 leading-relaxed">{text}</p><Link href={href} className="text-verde underline">{label} →</Link></details>)}
    </section>
    {!guides.length && <p>La guía aún no está publicada. Consulta las convocatorias o comunícate con Control Escolar.</p>}
    <form className="flex gap-3 flex-wrap"><label>Ciclo<select name="ciclo" defaultValue={query.ciclo??''} className="block border rounded p-3"><option value="">Todos los ciclos</option>{guides.map(g=><option key={g.id} value={g.ciclo_id}>{g.ciclo_label}</option>)}</select></label><button className="rounded bg-verde text-white p-3 self-end">Consultar</button></form>
    {guides.length>0 && query.ciclo && !guides.some(g=>g.ciclo_id===query.ciclo) && <p>No hay guía publicada para el ciclo seleccionado.</p>}
    {guides.filter(g=>!query.ciclo || g.ciclo_id===query.ciclo).map(g=><article key={g.id} className="rounded-xl border bg-white p-5 space-y-5">
      <h2 className="font-serif text-2xl">{g.titulo}</h2><p>Ciclo {g.ciclo_label} · Actualizado {new Date(g.updated_at).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'})}</p>
      {[['Requisitos y trámites',g.requisitos],['Fechas y admisión',g.fechas],['Preguntas frecuentes',g.preguntas]].map(([title,text])=><section key={title}><h3 className="font-semibold text-xl mb-2">{title}</h3><p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p></section>)}
    </article>)}
  </div>;
}
