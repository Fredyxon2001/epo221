import { NextRequest } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { enviarCorreo, envolverEmailHtml } from '@/lib/email/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Cron Vercel — envía resumen semanal a tutores con tutor_email
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = adminClient();
  const { data: ciclo } = await supabase.from('ciclos_escolares').select('id, codigo').eq('activo', true).maybeSingle();
  if (!ciclo) return Response.json({ ok: false, error: 'Sin ciclo activo' });

  // Alumnos con tutor_email
  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre, apellido_paterno, apellido_materno, matricula, tutor_email, tutor_nombre')
    .not('tutor_email', 'is', null)
    .neq('tutor_email', '')
    .is('deleted_at', null);

  if (!alumnos?.length) return Response.json({ ok: true, total: 0 });

  // Snapshots recientes
  const { data: snapsRecientes } = await supabase
    .from('riesgo_snapshots')
    .select('alumno_id, score, nivel, factores, recomendacion, created_at')
    .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  const ultimoSnap = new Map<string, any>();
  for (const s of snapsRecientes ?? []) {
    if (!ultimoSnap.has(s.alumno_id)) ultimoSnap.set(s.alumno_id, s);
  }

  // Calificaciones del ciclo
  const ids = alumnos.map((a) => a.id);
  const { data: califs } = await supabase
    .from('calificaciones')
    .select('alumno_id, p1, p2, p3, faltas_p1, faltas_p2, faltas_p3, promedio_final, asignacion:asignaciones!inner(ciclo_id, materia:materias(nombre))')
    .in('alumno_id', ids)
    .eq('asignacion.ciclo_id', ciclo.id);

  // Conducta últimas 2 semanas
  const desde = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: conductas } = await supabase
    .from('reportes_conducta')
    .select('alumno_id, tipo, categoria, descripcion, fecha')
    .in('alumno_id', ids)
    .gte('fecha', desde);

  let enviados = 0, skipped = 0, errores = 0;

  for (const a of alumnos) {
    if (!a.tutor_email) continue;
    const misCalifs = (califs ?? []).filter((c: any) => c.alumno_id === a.id);
    const misConductas = (conductas ?? []).filter((c: any) => c.alumno_id === a.id);
    const snap = ultimoSnap.get(a.id);

    const promedioPonderado = (() => {
      const finales = misCalifs.map((c: any) => Number(c.promedio_final ?? 0)).filter((x) => x > 0);
      if (!finales.length) return null;
      return finales.reduce((a, b) => a + b, 0) / finales.length;
    })();
    const totalFaltas = misCalifs.reduce((acc: number, c: any) =>
      acc + (Number(c.faltas_p1 ?? 0) + Number(c.faltas_p2 ?? 0) + Number(c.faltas_p3 ?? 0)), 0);

    const nombre = `${a.nombre} ${a.apellido_paterno ?? ''} ${a.apellido_materno ?? ''}`.trim();
    const saludo = a.tutor_nombre ? `Estimado(a) ${a.tutor_nombre}` : 'Estimado(a) tutor(a)';

    const filasMaterias = misCalifs.slice(0, 12).map((c: any) => {
      const final = c.promedio_final != null ? Number(c.promedio_final).toFixed(2) : '—';
      const color = c.promedio_final != null && Number(c.promedio_final) < 6 ? '#b91c1c' : '#0f4233';
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${c.asignacion?.materia?.nombre ?? '—'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">${c.p1 ?? '—'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">${c.p2 ?? '—'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">${c.p3 ?? '—'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;color:${color};font-weight:bold;">${final}</td>
      </tr>`;
    }).join('');

    const conductaHtml = misConductas.length
      ? `<h3 style="color:#0f4233;font-size:14px;margin:18px 0 6px;">Reportes de conducta recientes</h3>
         <ul style="font-size:13px;padding-left:18px;margin:0;">
           ${misConductas.slice(0, 6).map((c: any) => `<li>${c.fecha} · <strong>${c.tipo}</strong> · ${c.categoria}${c.descripcion ? ' — ' + String(c.descripcion).slice(0, 120) : ''}</li>`).join('')}
         </ul>`
      : '';

    const riesgoHtml = snap
      ? `<div style="background:${snap.nivel === 'critico' ? '#fee2e2' : snap.nivel === 'alto' ? '#fef3c7' : snap.nivel === 'medio' ? '#e0f2fe' : '#f3f4f6'};padding:12px;border-radius:8px;margin:16px 0;">
          <strong>Indicador de riesgo:</strong> ${snap.nivel.toUpperCase()} (${snap.score}/100)<br>
          <span style="font-size:12px;">${snap.recomendacion ?? ''}</span>
        </div>`
      : '';

    const cuerpo = `
      <p>${saludo}:</p>
      <p>Le compartimos el resumen de avance académico de <strong>${nombre}</strong>${a.matricula ? ` (matrícula ${a.matricula})` : ''} correspondiente al ciclo ${ciclo.codigo}.</p>
      ${riesgoHtml}
      <div style="display:flex;gap:8px;margin:16px 0;">
        <div style="flex:1;background:#f3f4f6;padding:10px;border-radius:6px;text-align:center;">
          <div style="font-size:11px;color:#6b7280;">Promedio</div>
          <div style="font-size:20px;color:#0f4233;font-weight:bold;">${promedioPonderado != null ? promedioPonderado.toFixed(2) : '—'}</div>
        </div>
        <div style="flex:1;background:#f3f4f6;padding:10px;border-radius:6px;text-align:center;">
          <div style="font-size:11px;color:#6b7280;">Faltas acumuladas</div>
          <div style="font-size:20px;color:${totalFaltas > 15 ? '#b91c1c' : '#0f4233'};font-weight:bold;">${totalFaltas}</div>
        </div>
        <div style="flex:1;background:#f3f4f6;padding:10px;border-radius:6px;text-align:center;">
          <div style="font-size:11px;color:#6b7280;">Materias</div>
          <div style="font-size:20px;color:#0f4233;font-weight:bold;">${misCalifs.length}</div>
        </div>
      </div>
      <h3 style="color:#0f4233;font-size:14px;margin:18px 0 6px;">Calificaciones por materia</h3>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
        <thead><tr style="background:#0f4233;color:white;">
          <th style="padding:6px 8px;font-size:12px;text-align:left;">Asignatura</th>
          <th style="padding:6px 8px;font-size:12px;">P1</th>
          <th style="padding:6px 8px;font-size:12px;">P2</th>
          <th style="padding:6px 8px;font-size:12px;">P3</th>
          <th style="padding:6px 8px;font-size:12px;">Final</th>
        </tr></thead>
        <tbody>${filasMaterias || '<tr><td colspan="5" style="padding:8px;text-align:center;color:#6b7280;">Sin calificaciones registradas aún.</td></tr>'}</tbody>
      </table>
      ${conductaHtml}
      <p style="margin-top:18px;">Si tiene observaciones o desea agendar una entrevista con orientación, responda al correo institucional o comuníquese al plantel.</p>
      <p>Atentamente,<br><strong>Dirección Escolar — EPO 221 "Nicolás Bravo"</strong></p>
    `;

    const html = envolverEmailHtml({
      titulo: '📊 Resumen académico semanal',
      cuerpo,
    });

    const r = await enviarCorreo({
      tipo: 'resumen_semanal_tutor',
      destinatario: a.tutor_email,
      asunto: `Resumen semanal de ${nombre.split(' ')[0]} — EPO 221`,
      html,
      referencia_id: a.id,
    });

    if (r.skipped) skipped++;
    else if (r.ok) enviados++;
    else errores++;
  }

  return Response.json({ ok: true, ciclo: ciclo.codigo, total: alumnos.length, enviados, skipped, errores });
}
