import Link from 'next/link';
import { requireIdentity } from '@/lib/security/access';
import { OPERATION_TOPICS, reviewState, type OperationReview } from '@/lib/operation-governance';
import { formatSchoolDate, schoolToday } from '@/lib/public-convocatorias';
import { guardarRevision, aprobarRevision } from './actions';
import { policySourcesFor, publicPolicyFingerprint } from '@/lib/operation-public-sources';

export const dynamic = 'force-dynamic';
const notices: Record<string, string> = {
  guardado: 'Borrador guardado; la aprobación anterior queda en el historial.', aprobado: 'Revisión aprobada y registrada.',
  cambio: 'La ficha o el contenido cambió. Recarga, revisa y vuelve a intentarlo.', invalido: 'Revisa los campos y las fechas antes de guardar.',
  incompleto: 'Para aprobar, completa folio, procedimiento (al menos 30 caracteres), revisión realizada y próximo vencimiento dentro de la periodicidad. Continuidad requiere RPO y RTO.', error: 'No se pudo registrar la operación. Intenta nuevamente.',
};
type History = { id: string; revision_id: string; actor_rol: string; accion: string; version: number; created_at: string; datos: Record<string, unknown> };
const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
function Field({ name, label, value, type = 'text', required = false, min, max, maxLength }: { name: string; label: string; value: string | number | null; type?: string; required?: boolean; min?: number; max?: number; maxLength?: number }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input className={inputClass} name={name} type={type} defaultValue={value ?? ''} required={required} min={min} max={max} maxLength={maxLength} /></label>;
}
export default async function OperacionPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { client, profile } = await requireIdentity(['admin', 'staff', 'director']);
  const params = await searchParams;
  const [reviews, cycles, history, contact] = await Promise.all([
    client.from('operacion_revisiones').select('*').order('tema'),
    client.from('ciclos_escolares').select('id,codigo,periodo,activo').order('fecha_inicio', { ascending: false }),
    client.from('operacion_historial').select('id,revision_id,actor_rol,accion,version,created_at,datos').order('created_at', { ascending: false }).limit(100),
    client.from('sitio_config').select('telefono,email,horario').maybeSingle(),
  ]);
  if (reviews.error || cycles.error || history.error || contact.error) return <main className="p-6"><h1 className="text-2xl font-bold">Operación institucional</h1><p className="mt-4" role="alert">No se pudo cargar el registro institucional. Revisa la conexión y la migración antes de registrar una aprobación.</p></main>;
  const items = (reviews.data ?? []) as OperationReview[];
  const fingerprints = await Promise.all(items.map(async item => { const result = await client.rpc('operation_public_fingerprint', { p_tema: item.tema }); return result.error ? null : result.data as { huella: string; resumen: Record<string, number> }; }));
  const today = schoolToday();
  const sources = publicPolicyFingerprint();
  const counts = items.reduce((acc, item, index) => { acc[reviewState(item, fingerprints[index]?.huella ?? null, today, policySourcesFor(item.tema, sources)).state]++; return acc; }, { pendiente: 0, vigente: 0, vencido: 0 });
  const mayApprove = profile.rol === 'admin' || profile.rol === 'director';
  return <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
    <header><h1 className="text-2xl font-bold text-slate-900">Operación institucional</h1><p className="mt-2 text-slate-600">Responsables por área, procedimientos, referencias y revisiones periódicas. Las áreas y periodicidades iniciales son propuestas editables; completa los acuerdos de la escuela antes de aprobar.</p><p className="mt-2 text-sm text-slate-600">Este registro documenta una revisión; no certifica cumplimiento legal ni ejecuta eliminación de expedientes, cambios de MFA o restauraciones. No escribas datos personales, contraseñas ni códigos de acceso.</p></header>
    {params.status && notices[params.status] && <p role="status" className="rounded-xl border border-slate-300 bg-white p-4">{notices[params.status]}</p>}
    <div className="grid gap-3 sm:grid-cols-3">{Object.entries(counts).map(([state, count]) => <div key={state} className="rounded-xl border bg-white p-4"><strong className="text-2xl">{count}</strong><span className="ml-2 capitalize">{state}</span></div>)}</div>
    <aside className="rounded-xl border bg-white p-4 text-sm text-slate-600"><p>Fecha local: {formatSchoolDate(today)}. Contacto actualmente registrado: {contact.data?.email || 'correo pendiente de registrar'} · {contact.data?.telefono || 'teléfono pendiente de registrar'} · {contact.data?.horario || 'horario pendiente de registrar'}.</p><p className="mt-2">La huella compara datos públicos publicados, configuración institucional y ciclos según el tema. Procedimientos externos, consentimiento y resultados de simulacros requieren revisión del área responsable y su referencia.</p></aside>
    {items.map((item, index) => {
      const fingerprint = fingerprints[index]; const status = reviewState(item, fingerprint?.huella ?? null, today, policySourcesFor(item.tema, sources)); const topic = OPERATION_TOPICS[item.tema];
      const entries = ((history.data ?? []) as History[]).filter(entry => entry.revision_id === item.id);
      return <section key={item.id} id={item.tema} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between"><h2 className="text-xl font-semibold">{item.titulo}</h2><span className={`rounded-full px-3 py-1 text-sm font-semibold ${status.state === 'vigente' ? 'bg-green-100 text-green-900' : status.state === 'vencido' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-950'}`}>{status.state}</span></div>
        <p className="text-sm text-slate-600">{status.reason}</p><p className="text-sm">{topic.instruction} <Link href={topic.href} className="font-semibold text-teal-800 underline">{topic.link}</Link></p>
        <details className="text-sm text-slate-600"><summary className="cursor-pointer">Datos que se revisan y versión actual</summary><p className="mt-2">Ficha versión {item.revision}. {fingerprint ? Object.entries(fingerprint.resumen).map(([name, count]) => `${name.replaceAll('_', ' ')}: ${count}`).join(' · ') || 'Sin conjuntos públicos adicionales para este tema.' : 'Huella no disponible.'}</p></details>
        <form action={guardarRevision} className="space-y-4">
          <input type="hidden" name="id" value={item.id} /><input type="hidden" name="revision" value={item.revision} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="titulo" label="Título" value={item.titulo} required maxLength={200} /><Field name="area_responsable" label="Área responsable (sin nombres personales)" value={item.area_responsable} required maxLength={120} />
            <Field name="periodicidad_dias" label="Periodicidad propuesta/acordada en días" value={item.periodicidad_dias} type="number" required min={1} max={366} />
            <label className="text-sm font-medium text-slate-700">Ciclo aplicable<select name="ciclo_id" defaultValue={item.ciclo_id ?? ''} className={inputClass}><option value="">Institucional, sin ciclo específico</option>{(cycles.data ?? []).map(cycle => <option value={cycle.id} key={cycle.id}>{cycle.codigo} · {cycle.periodo}{cycle.activo ? ' · activo' : ''}</option>)}</select></label>
            <Field name="folio_referencia" label="Folio o referencia del acuerdo/procedimiento" value={item.folio_referencia} maxLength={200} /><Field name="referencia_url" label="Enlace HTTPS a la referencia (opcional)" value={item.referencia_url} type="url" maxLength={2000} />
            <Field name="fecha_revision" label="Fecha de revisión realizada" value={item.fecha_revision} type="date" /><Field name="proxima_revision" label="Próxima revisión" value={item.proxima_revision} type="date" />
            {item.tema === 'continuidad' && <><Field name="objetivo_rpo_minutos" label="Objetivo RPO en minutos" value={item.objetivo_rpo_minutos} type="number" min={0} max={43200} /><Field name="objetivo_rto_minutos" label="Objetivo RTO en minutos" value={item.objetivo_rto_minutos} type="number" min={1} max={43200} /></>}
          </div>
          <label className="block text-sm font-medium text-slate-700">Procedimiento, alcance y evidencia de revisión<textarea name="detalle" defaultValue={item.detalle} maxLength={12000} rows={5} className={inputClass} /></label>
          <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-white">Guardar borrador</button><p className="text-xs text-slate-600">Guardar una modificación deja la ficha pendiente; conserva la aprobación anterior en el historial.</p>
        </form>
        {mayApprove && fingerprint ? <form action={aprobarRevision} className="space-y-3 rounded-xl border border-teal-200 bg-teal-50 p-4">
          <input type="hidden" name="id" value={item.id} /><input type="hidden" name="revision" value={item.revision} /><input type="hidden" name="huella" value={fingerprint.huella} />
          <input type="hidden" name="fuentes" value={policySourcesFor(item.tema, sources) ?? ''} />
          <label className="flex gap-2 text-sm"><input type="checkbox" name="confirmacion" required />He revisado el contenido actual y la referencia de esta ficha guardada; registro su aprobación institucional.</label>
          <button type="submit" className="rounded-lg bg-teal-800 px-4 py-2 text-white">Aprobar ficha guardada con MFA</button><p className="text-xs">Guarda primero los cambios del formulario. La aprobación verifica de nuevo la versión y la huella en la base de datos.</p>
        </form> : <p className="text-sm text-slate-600">{mayApprove ? 'Recarga para comprobar la huella antes de aprobar.' : 'Dirección o Administración con MFA pueden aprobar las fichas guardadas.'}</p>}
        <details><summary className="cursor-pointer font-medium">Historial ({entries.length} registros mostrados)</summary><p className="my-2 text-xs text-slate-600">Últimos 100 movimientos del módulo. Historial protegido contra edición y registros manuales.</p>{entries.length ? <ol className="space-y-3">{entries.map(entry => <li key={entry.id} className="border-l-2 border-slate-300 pl-3 text-sm"><p>{entry.accion === 'aprobacion' ? 'Aprobación' : 'Borrador'} · versión {entry.version} · rol {entry.actor_rol} · {new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.created_at))}</p><p>Área: {String(entry.datos.area_responsable ?? '')} · Referencia: {String(entry.datos.folio_referencia || 'sin folio')}</p><details><summary>Ver procedimiento registrado</summary><p className="whitespace-pre-wrap mt-2">{String(entry.datos.detalle ?? '')}</p><p className="mt-2">Revisión: {String(entry.datos.fecha_revision ?? 'sin fecha')} · Próxima: {String(entry.datos.proxima_revision ?? 'sin fecha')}</p></details></li>)}</ol> : <p className="mt-2 text-sm text-slate-600">Todavía no hay revisiones registradas.</p>}</details>
      </section>;
    })}
  </main>;
}
