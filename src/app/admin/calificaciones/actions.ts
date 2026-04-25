'use server';

import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// Parser CSV mínimo (soporta comas dentro de comillas).
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuote = false;
      else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (field !== '' || cur.length) { cur.push(field); rows.push(cur); cur = []; field = ''; }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else field += c;
    }
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

const n = (v: string) => { const x = Number(v); return isNaN(x) ? null : x; };

export async function importarCalificacionesCSV(formData: FormData) {
  const archivo = formData.get('archivo') as File;
  if (!archivo || archivo.size === 0) return;

  const text = await archivo.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return;

  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.findIndex((h) => h === name);
  const iCurp = idx('curp'), iAsig = idx('idAsignacion'), iUAC = idx('nombreUAC');
  const iHoras = idx('horasSemestrales'), iCiclo = idx('cicloEscolar'), iPeriodo = idx('periodo');
  const iGrado = idx('grado'), iSem = idx('semestre'), iGrupo = idx('grupo');
  const iFp1 = idx('faltasP1'), iFp2 = idx('faltasP2'), iFp3 = idx('faltasP3');
  const iP1 = idx('calificacionP1'), iP2 = idx('calificacionP2'), iP3 = idx('calificacionP3');
  const iE1 = idx('calificacionE1'), iFE1 = idx('folioE1');
  const iE2 = idx('calificacionE2'), iFE2 = idx('folioE2');
  const iE3 = idx('calificacionE3'), iFE3 = idx('folioE3');
  const iE4 = idx('calificacionE4'), iFE4 = idx('folioE4');

  const admin = adminClient();
  let ok = 0, err = 0;

  // Cachés para evitar N+1
  const ciclos = new Map<string, string>();
  const materias = new Map<string, string>();
  const grupos = new Map<string, string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row[iCurp]) continue;

    try {
      const curp = row[iCurp].toUpperCase();
      const cicloKey = `${row[iCiclo]}|${row[iPeriodo]}`;
      let cicloId = ciclos.get(cicloKey);
      if (!cicloId) {
        const { data } = await admin.from('ciclos_escolares')
          .upsert({ codigo: row[iCiclo], periodo: row[iPeriodo] }, { onConflict: 'codigo,periodo' })
          .select('id').single();
        cicloId = data!.id; ciclos.set(cicloKey, cicloId);
      }

      let materiaId = materias.get(row[iUAC]);
      if (!materiaId) {
        const { data: m } = await admin.from('materias').select('id').eq('nombre', row[iUAC]).eq('semestre', Number(row[iSem])).maybeSingle();
        if (m) materiaId = m.id;
        else {
          const { data: ins } = await admin.from('materias').insert({
            nombre: row[iUAC], semestre: Number(row[iSem]), tipo: 'obligatoria',
            horas_semestrales: Number(row[iHoras]) || null,
          }).select('id').single();
          materiaId = ins!.id;
        }
        materias.set(row[iUAC], materiaId!);
      }

      const grupoKey = `${cicloId}|${row[iSem]}|${row[iGrupo]}`;
      let grupoId = grupos.get(grupoKey);
      if (!grupoId) {
        const { data: g } = await admin.from('grupos')
          .upsert({
            ciclo_id: cicloId, grado: Number(row[iGrado]), semestre: Number(row[iSem]),
            grupo: Number(row[iGrupo]), turno: 'matutino',
          }, { onConflict: 'ciclo_id,semestre,grupo,turno' })
          .select('id').single();
        grupoId = g!.id; grupos.set(grupoKey, grupoId);
      }

      // Asignación (respetar idAsignacion original si viene)
      const origId = row[iAsig];
      let asigId: string | null = null;
      if (origId && origId.length === 36) {
        // intenta usar el UUID original
        const { data: existe } = await admin.from('asignaciones').select('id').eq('id', origId).maybeSingle();
        if (existe) asigId = existe.id;
      }
      if (!asigId) {
        const { data: a } = await admin.from('asignaciones')
          .upsert({ ...(origId?.length === 36 ? { id: origId } : {}),
                    materia_id: materiaId, grupo_id: grupoId, ciclo_id: cicloId },
                  { onConflict: 'materia_id,grupo_id,ciclo_id' })
          .select('id').single();
        asigId = a!.id;
      }

      // Alumno
      const { data: al } = await admin.from('alumnos').select('id').eq('curp', curp).maybeSingle();
      if (!al) { err++; continue; }

      // Inscripción
      await admin.from('inscripciones').upsert(
        { alumno_id: al.id, grupo_id: grupoId, ciclo_id: cicloId },
        { onConflict: 'alumno_id,ciclo_id' }
      );

      // Calificaciones
      await admin.from('calificaciones').upsert({
        alumno_id: al.id, asignacion_id: asigId,
        p1: n(row[iP1]), p2: n(row[iP2]), p3: n(row[iP3]),
        faltas_p1: n(row[iFp1]) ?? 0, faltas_p2: n(row[iFp2]) ?? 0, faltas_p3: n(row[iFp3]) ?? 0,
        e1: n(row[iE1]), folio_e1: row[iFE1] !== '-' ? row[iFE1] : null,
        e2: n(row[iE2]), folio_e2: row[iFE2] !== '-' ? row[iFE2] : null,
        e3: n(row[iE3]), folio_e3: row[iFE3] !== '-' ? row[iFE3] : null,
        e4: n(row[iE4]), folio_e4: row[iFE4] !== '-' ? row[iFE4] : null,
      }, { onConflict: 'alumno_id,asignacion_id' });

      ok++;
    } catch (e) { err++; }
  }

  revalidatePath('/admin/calificaciones');
  return { ok, err };
}
