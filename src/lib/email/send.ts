// Envío de correo transaccional — usa Resend si RESEND_API_KEY está configurado;
// si no, registra en correo_log como 'skipped' (modo dry-run).
import { adminClient } from '@/lib/supabase/admin';

export type EnviarCorreoParams = {
  tipo: string;
  destinatario: string;
  asunto: string;
  html: string;
  texto?: string;
  referencia_id?: string | null;
};

export async function enviarCorreo(p: EnviarCorreoParams): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const admin = adminClient();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CORREO_REMITENTE || 'EPO 221 <no-reply@epo221.edu.mx>';

  // Evitar duplicados en la misma semana
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const { data: dup } = await admin.from('correo_log')
    .select('id')
    .eq('tipo', p.tipo)
    .eq('destinatario', p.destinatario)
    .eq('estado', 'enviado')
    .gte('created_at', weekStart.toISOString())
    .limit(1);
  if (dup && dup.length > 0) {
    await admin.from('correo_log').insert({
      tipo: p.tipo, destinatario: p.destinatario, asunto: p.asunto,
      referencia_id: p.referencia_id ?? null, estado: 'skipped', error: 'duplicate_within_week',
    });
    return { ok: true, skipped: true };
  }

  if (!apiKey) {
    await admin.from('correo_log').insert({
      tipo: p.tipo, destinatario: p.destinatario, asunto: p.asunto,
      referencia_id: p.referencia_id ?? null, estado: 'skipped', error: 'no_api_key',
    });
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: p.destinatario, subject: p.asunto, html: p.html, text: p.texto }),
    });
    if (!res.ok) {
      const err = await res.text();
      await admin.from('correo_log').insert({
        tipo: p.tipo, destinatario: p.destinatario, asunto: p.asunto,
        referencia_id: p.referencia_id ?? null, estado: 'error', error: err.slice(0, 500),
      });
      return { ok: false, error: err };
    }
    await admin.from('correo_log').insert({
      tipo: p.tipo, destinatario: p.destinatario, asunto: p.asunto,
      referencia_id: p.referencia_id ?? null, estado: 'enviado',
    });
    return { ok: true };
  } catch (e: any) {
    await admin.from('correo_log').insert({
      tipo: p.tipo, destinatario: p.destinatario, asunto: p.asunto,
      referencia_id: p.referencia_id ?? null, estado: 'error', error: String(e?.message ?? e).slice(0, 500),
    });
    return { ok: false, error: String(e) };
  }
}

// Plantilla HTML institucional
export function envolverEmailHtml({ titulo, cuerpo, ctaLabel, ctaUrl }: {
  titulo: string; cuerpo: string; ctaLabel?: string; ctaUrl?: string;
}): string {
  const cta = ctaLabel && ctaUrl
    ? `<p style="text-align:center;margin:24px 0;"><a href="${ctaUrl}" style="background:#0f4233;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${ctaLabel}</a></p>`
    : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#f3f4f6;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:24px;background:white;">
    <div style="border-bottom:3px solid #d4a73f;padding-bottom:12px;margin-bottom:18px;">
      <span style="color:#0f4233;font-weight:700;font-size:16px;">EPO 221 "Nicolás Bravo"</span>
      <span style="color:#6b7280;font-size:11px;display:block;">Bachillerato General Estatal · CCT 15EBH0409B</span>
    </div>
    <h1 style="color:#0f4233;font-size:20px;margin:0 0 16px;">${titulo}</h1>
    <div style="font-size:14px;line-height:1.6;">${cuerpo}</div>
    ${cta}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:11px;text-align:center;">Este mensaje fue enviado automáticamente por el sistema escolar. No responda a este correo.</p>
  </div>
</body></html>`;
}
