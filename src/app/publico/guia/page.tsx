import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
export const metadata:Metadata={title:'Guía escolar · EPO 221',description:'Requisitos, fechas de admisión, trámites y preguntas frecuentes por ciclo escolar.',alternates:{canonical:'https://epo221.edu.mx/publico/guia'}};
export default async function Guia({searchParams}:{searchParams:Promise<{ciclo?:string}>}) {
  const client=await createClient();
  const query=await searchParams;
  const result=await client.from('guias_escolares').select('*').eq('publicada',true).order('ciclo_label',{ascending:false});
  if(result.error)throw new Error('No se pudo consultar la información escolar. Reintenta.');
  const guides=result.data??[];
  return <div className="max-w-4xl mx-auto px-6 pt-32 pb-16 space-y-6">
    <h1 className="font-serif text-4xl text-verde">Guía escolar</h1>
    <p>Información publicada por la escuela para cada ciclo.</p>
    {!guides.length && <p>La guía aún no está publicada. Consulta las convocatorias o comunícate con Control Escolar.</p>}
    <form className="flex gap-3 flex-wrap"><label>Ciclo<select name="ciclo" defaultValue={query.ciclo??''} className="block border rounded p-3"><option value="">Todos los ciclos</option>{guides.map(g=><option key={g.id} value={g.ciclo_id}>{g.ciclo_label}</option>)}</select></label><button className="rounded bg-verde text-white p-3 self-end">Consultar</button></form>
    {guides.filter(g=>!query.ciclo || g.ciclo_id===query.ciclo).map(g=><article key={g.id} className="rounded-xl border bg-white p-5 space-y-5">
      <h2 className="font-serif text-2xl">{g.titulo}</h2><p>Ciclo {g.ciclo_label} · Actualizado {new Date(g.updated_at).toLocaleDateString('es-MX',{timeZone:'America/Mexico_City'})}</p>
      {[['Requisitos y trámites',g.requisitos],['Fechas y admisión',g.fechas],['Preguntas frecuentes',g.preguntas]].map(([title,text])=><section key={title}><h3 className="font-semibold text-xl mb-2">{title}</h3><p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p></section>)}
    </article>)}
  </div>;
}
