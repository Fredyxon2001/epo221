import { requireIdentity } from '@/lib/security/access';
import { guardarGuia } from './actions';
import Link from 'next/link';
import { GUIDANCE_ORIENTATION } from '@/lib/public-guidance';
export default async function Guias({searchParams}:{searchParams:Promise<{ciclo?:string;error?:string;ok?:string}>}) {
  const {client}=await requireIdentity(['admin','staff','director']);
  const query=await searchParams;
  const [cycles,guides]=await Promise.all([client.from('ciclos_escolares').select('id,codigo').order('codigo',{ascending:false}),client.from('guias_escolares').select('*')]);
  if(cycles.error || guides.error)throw new Error('No se pudo cargar la guía.');
  const selected=cycles.data.find(c=>c.id===query.ciclo)??cycles.data[0];
  const guide=guides.data.find(g=>g.ciclo_id===selected?.id);
  return <section className="max-w-3xl space-y-5">
    <h1 className="font-serif text-3xl">Información escolar por ciclo</h1>
    <p>Edita los requisitos, fechas de admisión, trámites y preguntas frecuentes. Publica únicamente información confirmada por la escuela. El texto se muestra igual en web y app móvil.</p>
    <p className="rounded border bg-amber-50 p-4">El texto inicial es orientación para usar el sitio y confirmar información con Control Escolar. No establece fechas, montos ni requisitos obligatorios. Sustitúyelo por información aprobada cuando la escuela la confirme. El ciclo registrado no anuncia un proceso de admisión abierto.</p>
    {query.error && <p role="alert">No se guardó. Revisa los datos; para publicar completa las tres secciones.</p>}
    {query.ok && <p role="status">Guía guardada.</p>}
    <nav aria-label="Ciclo de la guía" className="flex flex-wrap gap-3">{cycles.data.map(c=><Link key={c.id} href={'?ciclo='+c.id} aria-current={c.id===selected?.id?'page':undefined} className="border rounded p-3">{c.codigo}</Link>)}</nav>
    {selected ? <form action={guardarGuia} key={selected.id} className="space-y-4 bg-white rounded p-5">
      <input type="hidden" name="ciclo_id" value={selected.id}/>
      <label className="block">Título<input name="titulo" required maxLength={200} defaultValue={guide?.titulo??'Guía escolar · '+selected.codigo} className="block border rounded p-3 w-full"/></label>
      {(['requisitos','fechas','preguntas'] as const).map(name=><label key={name} className="block">{name==='requisitos'?'Requisitos y trámites':name==='fechas'?'Fechas y proceso de admisión':'Preguntas frecuentes'}<textarea name={name} maxLength={10000} rows={7} defaultValue={guide?.[name]??GUIDANCE_ORIENTATION[name]} className="block border rounded p-3 w-full"/></label>)}
      <p className="text-sm">Usa párrafos y saltos de línea. Incluye cada pregunta seguida de su respuesta; no se ejecuta HTML.</p>
      <label className="flex gap-3"><input type="checkbox" name="publicada" defaultChecked={guide?.publicada??false}/>Publicar esta guía del ciclo</label>
      <button className="bg-verde text-white rounded p-3">Guardar guía</button>
    </form>:<p>Crea un ciclo para preparar su guía.</p>}
    <Link href="/publico/guia" className="underline">Consultar guías publicadas</Link>
  </section>;
}
