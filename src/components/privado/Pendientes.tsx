import Link from 'next/link';
import { requireIdentity } from '@/lib/security/access';
import { pendingInbox } from '@/lib/pendientes';
export async function Pendientes() {
  const {client,user,profile}=await requireIdentity(null);
  const inbox=await pendingInbox(client,user.id,profile.rol);
  return <section className="max-w-4xl space-y-5">
    <h1 className="font-serif text-3xl text-verde">Bandeja de pendientes</h1>
    <p>Tareas, revisiones y trámites disponibles para tu cuenta. Abre cada pendiente para resolverlo.</p>
    {inbox.avisos.map(a=><p key={a} role="status" className="bg-amber-50 rounded p-3">{a}</p>)}
    {inbox.limitado && <p role="status">Hay más registros. Consulta el módulo correspondiente para revisar el historial completo.</p>}
    {!inbox.items.length && <p>Sin pendientes disponibles.</p>}
    <ul className="grid gap-3 sm:grid-cols-2">{inbox.items.map(i=><li key={i.id}><Link href={i.href} className="block rounded-xl border bg-white p-4 h-full">
      <span className="text-sm text-gray-600">{i.categoria}</span><h2 className="font-semibold">{i.titulo}</h2><p>{i.detalle}</p>
      {i.fecha && <p className="text-sm">Entrega: {new Date(i.fecha).toLocaleString('es-MX',{timeZone:'America/Mexico_City'})}</p>}
    </Link></li>)}</ul>
  </section>;
}
