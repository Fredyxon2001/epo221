import Link from 'next/link';
import { adminClient } from '@/lib/supabase/admin';
import { PageHeader, Card } from './ui';

export async function FinanceDashboard() {
  const client = adminClient();
  const [payments, charges, concepts] = await Promise.all([
    client.from('pagos').select('id', { count:'exact', head:true }).is('validado_en',null).is('rechazado_motivo',null),
    client.from('cargos').select('id', { count:'exact', head:true }).in('estatus',['pendiente','vencido','en_revision']),
    client.from('conceptos_pago').select('id', { count:'exact', head:true }).eq('activo',true).is('deleted_at',null),
  ]);
  if ([payments,charges,concepts].some(result=>result.error)) throw new Error('No se pudo cargar el resumen financiero.');
  return <div className="space-y-5">
    <PageHeader eyebrow="Finanzas" title="Panel financiero" description="Consulta cobros, revisa comprobantes y administra conceptos de pago." />
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Comprobantes por revisar"><p className="text-3xl font-semibold">{payments.count ?? 0}</p><Link href="/admin/pagos" className="text-verde underline">Validar pagos</Link></Card>
      <Card title="Cargos abiertos"><p className="text-3xl font-semibold">{charges.count ?? 0}</p><Link href="/admin/alumnos" className="text-verde underline">Consultar alumnos</Link></Card>
      <Card title="Conceptos activos"><p className="text-3xl font-semibold">{concepts.count ?? 0}</p><Link href="/admin/conceptos" className="text-verde underline">Administrar conceptos</Link></Card>
    </div>
  </div>;
}
