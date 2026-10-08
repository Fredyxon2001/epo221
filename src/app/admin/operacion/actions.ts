'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAccess } from '@/lib/security/access';
import { validateFormData } from '@/lib/security/form-data';
import { safeReferenceUrl, validReviewDates } from '@/lib/operation-governance';
import { policySourcesFor, publicPolicyFingerprint } from '@/lib/operation-public-sources';

function finish(status: string): never { revalidatePath('/admin/operacion'); redirect(`/admin/operacion?status=${status}`); }
function databaseStatus(code: string | undefined) { return code === '40001' || code === 'PGRST116' ? 'cambio' : code === '23514' ? 'incompleto' : 'error'; }
const identitySchema = z.object({ id: z.string().uuid(), revision: z.coerce.number().int().positive() });
export async function guardarRevision(formData: FormData): Promise<void> {
  const { client } = await requireAccess(['admin', 'staff', 'director'], 'operacion:guardar');
  await validateFormData(formData);
  const schema = identitySchema.extend({ titulo: z.string().trim().min(1).max(200), area_responsable: z.string().trim().min(1).max(120), periodicidad_dias: z.coerce.number().int().min(1).max(366), ciclo_id: z.string().uuid().nullable(), folio_referencia: z.string().trim().max(200), referencia_url: z.string().trim().max(2000), detalle: z.string().trim().max(12000), fecha_revision: z.string().nullable(), proxima_revision: z.string().nullable(), objetivo_rpo_minutos: z.coerce.number().int().min(0).max(43200).nullable(), objetivo_rto_minutos: z.coerce.number().int().min(1).max(43200).nullable() });
  const input = schema.safeParse(Object.fromEntries(['id', 'revision', 'titulo', 'area_responsable', 'periodicidad_dias', 'ciclo_id', 'folio_referencia', 'referencia_url', 'detalle', 'fecha_revision', 'proxima_revision', 'objetivo_rpo_minutos', 'objetivo_rto_minutos'].map(key => [key, formData.get(key) || (['ciclo_id', 'fecha_revision', 'proxima_revision', 'objetivo_rpo_minutos', 'objetivo_rto_minutos'].includes(key) ? null : '')])));
  if (!input.success || !safeReferenceUrl(input.data.referencia_url) || !validReviewDates(input.data.fecha_revision, input.data.proxima_revision)) finish('invalido');
  const { id, revision, ...values } = input.data;
  const result = await client.from('operacion_revisiones').update({ ...values, estado: 'borrador', huella_solicitada: null }).eq('id', id).eq('revision', revision).select('id').single();
  if (result.error) finish(databaseStatus(result.error.code));
  finish('guardado');
}
export async function aprobarRevision(formData: FormData): Promise<void> {
  const { client } = await requireAccess(['admin', 'director'], 'operacion:aprobar');
  await validateFormData(formData);
  const input = identitySchema.extend({ huella: z.string().regex(/^[0-9a-f]{64}$/), confirmacion: z.literal('on') }).safeParse(Object.fromEntries(formData));
  if (!input.success) finish('invalido');
  const row = await client.from('operacion_revisiones').select('tema').eq('id', input.data.id).single();
  if (row.error) finish('error');
  const sources = policySourcesFor(row.data.tema, publicPolicyFingerprint());
  if (sources && formData.get('fuentes') !== sources) finish('cambio');
  const result = await client.rpc('operation_approve_review', { p_id: input.data.id, p_revision: input.data.revision, p_huella: input.data.huella, p_fuentes: sources });
  if (result.error) finish(databaseStatus(result.error.code));
  finish('aprobado');
}
