import { requireIdentity } from '@/lib/security/access';
import { crearCiclo, transicionCiclo } from './actions';
import Link from 'next/link';

export default async function AdminCiclos({searchParams}: {searchParams: Promise<{ciclo?:string;error?:string;ok?:string}>}) {
  const {client} = await requireIdentity(['admin','staff','director']);
  const query = await searchParams;
  const result = await client.from('ciclos_escolares').select('*').order('codigo', {ascending:false});
  if (result.error) throw new Error('No se pudieron consultar los ciclos.');
  const ciclos = result.data ?? [];
  const selected = ciclos.find(c => c.id === query.ciclo) ?? ciclos[0];
  const [diagnostic, history] = selected ? await Promise.all([
    client.rpc('security_cycle_diagnostic',{p_cycle:selected.id}),
    client.from('ciclo_historial').select('accion,motivo,created_at').eq('ciclo_id',selected.id).order('created_at',{ascending:false}).limit(30),
  ]) : [{data:null,error:null},{data:[],error:null}];
  const d = diagnostic.data;
  return <div className="max-w-4xl space-y-6">
    <h1 className="font-serif text-3xl text-verde">Ciclos escolares</h1>
    {query.error && <p role="alert" className="rounded bg-red-50 p-4 text-red-900">No se completó la operación. Revisa los datos, la confirmación y el diagnóstico del ciclo.</p>}
    {query.ok && <p role="status" className="rounded bg-green-50 p-4">Cambio registrado en el historial.</p>}
    <section className="bg-white rounded-lg p-5 shadow-xs">
      <h2 className="font-semibold mb-3">Nuevo ciclo</h2>
      <form action={crearCiclo} className="grid gap-3 sm:grid-cols-2">
        <label>Código<input name="codigo" required maxLength={100} className="block border rounded p-2 w-full" /></label>
        <label>Periodo<input name="periodo" required maxLength={100} className="block border rounded p-2 w-full" /></label>
        <label>Fecha inicial<input name="fecha_inicio" type="date" required className="block border rounded p-2 w-full" /></label>
        <label>Fecha final<input name="fecha_fin" type="date" required className="block border rounded p-2 w-full" /></label>
        <button className="bg-verde text-white rounded p-3">Crear ciclo</button>
      </form>
    </section>
    <nav aria-label="Seleccionar ciclo" className="flex gap-3 flex-wrap">
      {ciclos.map(c => <Link key={c.id} href={'/admin/ciclos?ciclo='+c.id} aria-current={selected?.id===c.id?'page':undefined} className="rounded border p-3 bg-white">{c.codigo} · {c.cerrado_en?'Cerrado':c.activo?'Activo':'Abierto'}</Link>)}
    </nav>
    {selected && <section className="rounded-lg bg-white p-5 space-y-4">
      <h2 className="font-semibold text-xl">Revisión de {selected.codigo}</h2>
      <p>El cierre conserva inscripciones y calificaciones, detiene nuevas modificaciones y desactiva el ciclo. Para corregirlo después se exige reapertura con motivo. Los adeudos no bloquean decisiones académicas.</p>
      {(diagnostic.error || history.error) ? <p role="alert">No se pudo cargar el diagnóstico o historial. Reintenta.</p> : <>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[['Inscripciones activas',d?.inscripciones],['Calificaciones incompletas',d?.calificaciones_incompletas],['Alumnos sin materias',d?.sin_materias],['Inscripciones inconsistentes',d?.inscripciones_inconsistentes],['Revisiones pendientes',d?.revisiones_pendientes],['Pagos por revisar (informativo)',d?.pagos_por_revisar]].map(([label,value])=><div key={String(label)} className="border rounded p-3"><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}
        </dl>
        <p>Fechas: {selected.fecha_inicio??'Sin definir'} → {selected.fecha_fin??'Sin definir'}. {d?.fechas_validas?'Vigencia concluida y consistente.':'Para cerrar, define fechas consistentes y espera al final de la vigencia.'}</p>
        <form action={transicionCiclo} className="space-y-3">
          <input type="hidden" name="id" value={selected.id}/>
          <label className="block">Acción<select name="accion" className="block border rounded p-3" required>
            {!selected.cerrado_en && <option value="activar">Activar (desactiva el ciclo anterior)</option>}
            {!selected.cerrado_en && <option value="cerrar" disabled={!d?.puede_cerrar}>Cerrar ciclo</option>}
            {!!selected.cerrado_en && <option value="reabrir">Reabrir para corrección</option>}
          </select></label>
          <label className="block">Motivo<textarea name="motivo" required minLength={10} maxLength={1000} className="block w-full border rounded p-3"/></label>
          <label className="flex gap-3"><input type="checkbox" name="confirmar" required/>Revisé el diagnóstico y confirmo esta operación.</label>
          <button className="rounded bg-verde p-3 text-white">Registrar cambio</button>
        </form>
        <h3 className="font-semibold">Historial reciente</h3>
        <ul className="space-y-3">{(history.data??[]).map((h,i)=><li key={i} className="border-t pt-3">{h.accion} · {new Date(h.created_at).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}<p>{h.motivo}</p></li>)}</ul>
      </>}
    </section>}
  </div>;
}
