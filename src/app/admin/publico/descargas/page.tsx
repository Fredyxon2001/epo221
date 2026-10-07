import Link from 'next/link';
import { requireIdentity } from '@/lib/security/access';
import { UploadForm } from '@/components/UploadForm';
import { guardarDocumento } from './actions';

export default async function Documentos(){
  const {client}=await requireIdentity(['admin','staff','director']);
  const [docs,cycles]=await Promise.all([client.from('documentos_publicos').select('*').order('updated_at',{ascending:false}),client.from('ciclos_escolares').select('id,codigo').order('codigo',{ascending:false})]);
  if(docs.error || cycles.error)throw new Error('No se pudo cargar el catálogo.');
  const all=[null,...docs.data];
  return <section className="max-w-4xl space-y-6"><Link href="/admin/publico" className="underline">← Sitio público</Link><h1 className="font-serif text-3xl text-verde">Documentos públicos por ciclo y versión</h1>
    <p>Publica solo formatos institucionales confirmados. Conserva la versión anterior como histórica y crea un documento nuevo para cada versión. Desmarca Publicado para retirarlo del catálogo.</p>
    <p className="rounded border border-amber-300 bg-amber-50 p-4">Las nuevas cargas permanecen privadas mientras el registro sea borrador; la vista previa requiere administración con verificación de seguridad. Al publicar se habilita su descarga pública. No subas formatos llenados, datos personales o expedientes. Una versión publicada conserva sus archivos; agrega un registro nuevo para reemplazarla.</p>
    {all.map((doc,index)=><details key={doc?.id??'new'} open={index===0} className="rounded-xl bg-white border p-5"><summary className="cursor-pointer font-semibold">{doc?`${doc.titulo} · ${doc.version} · ${doc.publicada?'Publicado':'Borrador'}`:'Agregar nueva versión de un documento'}</summary>
      <UploadForm action={guardarDocumento} className="mt-5 space-y-4" encType="multipart/form-data">
        {doc && <input type="hidden" name="id" value={doc.id}/>}
        <label className="block">Título<input name="titulo" required maxLength={200} defaultValue={doc?.titulo??''} className="block border rounded p-3 w-full"/></label>
        <label className="block">Descripción<textarea name="descripcion" maxLength={2000} defaultValue={doc?.descripcion??''} className="block border rounded p-3 w-full"/></label>
        <div className="grid sm:grid-cols-2 gap-4"><label>Trámite<select name="audiencia" defaultValue={doc?.audiencia??'general'} className="block border rounded p-3 w-full"><option value="general">General</option><option value="inscripcion">Inscripción</option><option value="reinscripcion">Reinscripción</option></select></label><label>Ciclo<select name={doc?.publicado_en?undefined:'ciclo_id'} disabled={!!doc?.publicado_en} defaultValue={doc?.ciclo_id??''} className="block border rounded p-3 w-full"><option value="">Sin ciclo asignado (histórico)</option>{cycles.data.map(c=><option key={c.id} value={c.id}>{c.codigo}</option>)}</select>{doc?.publicado_en && <input type="hidden" name="ciclo_id" value={doc.ciclo_id??''}/>}</label></div>
        <label className="block">Versión o fecha del documento<input name="version" required maxLength={100} readOnly={!!doc?.publicado_en} defaultValue={doc?.version??''} className="block border rounded p-3 w-full"/></label>
        {(['pdf','docx'] as const).map(format=><fieldset key={format} className="border rounded p-4 space-y-3"><legend>{format.toUpperCase()} · máximo 20 MB</legend><label className="block">Archivo nuevo<input type="file" name={format+'_archivo'} disabled={!!doc?.publicado_en} accept={'.'+format} className="block w-full"/></label><label className="block">Enlace institucional existente<input name={format+'_url'} maxLength={2000} readOnly={!!doc?.publicado_en} defaultValue={doc?.[format+'_url']??''} className="block border rounded p-3 w-full"/></label>{doc?.[format+'_url'] && <a href={doc[format+'_url']} target="_blank" rel="noopener noreferrer" className="text-verde underline">Vista previa {format.toUpperCase()}</a>}</fieldset>)}
        <label className="flex gap-3"><input type="checkbox" name="vigente" defaultChecked={doc?.vigente??false}/>Vigente para el ciclo seleccionado, confirmado por la escuela</label>
        <label className="flex gap-3"><input type="checkbox" name="publicada" defaultChecked={doc?.publicada??false}/>Publicado en el catálogo</label>
        <button className="rounded bg-verde text-white p-3">Guardar documento</button>
      </UploadForm>
    </details>)}
    <Link href="/publico/descargas" className="underline">Consultar catálogo público</Link>
  </section>;
}
