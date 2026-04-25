-- ============================================================
-- Vistas de consulta — historial académico y promedios
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================
-- Heredan RLS de las tablas base automáticamente.
-- ============================================================

-- ── 1. Historial académico detallado ────────────────────────
-- Todas las calificaciones del alumno, con materia, semestre, ciclo.
-- Una fila por materia cursada.

create or replace view vista_historial_academico as
select
  a.id                        as alumno_id,
  a.curp,
  a.matricula,
  a.nombre || ' ' || a.apellido_paterno || ' ' || coalesce(a.apellido_materno,'') as alumno,
  ce.id                       as ciclo_id,
  ce.codigo                   as ciclo,
  ce.periodo,
  g.grado,
  g.semestre,
  g.grupo,
  g.turno,
  m.id                        as materia_id,
  m.nombre                    as materia,
  m.campo_disciplinar_id,
  m.tipo                      as tipo_materia,
  m.horas_semestrales,
  c.p1, c.p2, c.p3,
  c.faltas_p1, c.faltas_p2, c.faltas_p3,
  c.e1, c.folio_e1,
  c.e2, c.folio_e2,
  c.e3, c.folio_e3,
  c.e4, c.folio_e4,
  c.promedio_final,
  case
    when c.promedio_final >= 6 then 'aprobado'
    when c.promedio_final is null or c.promedio_final = 0 then 'sin_calificar'
    else 'reprobado'
  end                         as estatus_materia,
  p.nombre || ' ' || coalesce(p.apellido_paterno,'') as profesor
from alumnos a
join inscripciones i    on i.alumno_id = a.id
join grupos g           on g.id = i.grupo_id
join ciclos_escolares ce on ce.id = i.ciclo_id
join asignaciones asig  on asig.grupo_id = g.id and asig.ciclo_id = ce.id
join materias m         on m.id = asig.materia_id
left join calificaciones c on c.alumno_id = a.id and c.asignacion_id = asig.id
left join profesores p  on p.id = asig.profesor_id;

-- ── 2. Promedio por semestre ────────────────────────────────

create or replace view vista_promedios_semestre as
select
  alumno_id,
  curp,
  matricula,
  alumno,
  ciclo,
  periodo,
  grado,
  semestre,
  count(*)                                          as materias_cursadas,
  count(*) filter (where estatus_materia = 'aprobado')  as materias_aprobadas,
  count(*) filter (where estatus_materia = 'reprobado') as materias_reprobadas,
  round(avg(promedio_final) filter (where promedio_final > 0), 2) as promedio_semestre
from vista_historial_academico
group by alumno_id, curp, matricula, alumno, ciclo, periodo, grado, semestre;

-- ── 3. Promedio por año (agrupa dos semestres) ──────────────
-- 1er año = semestres 1+2 · 2do = 3+4 · 3er = 5+6

create or replace view vista_promedios_anuales as
select
  alumno_id,
  curp,
  matricula,
  alumno,
  case
    when semestre in (1,2) then 1
    when semestre in (3,4) then 2
    when semestre in (5,6) then 3
  end                                                as anio,
  string_agg(distinct ciclo, ', ' order by ciclo)    as ciclos,
  sum(materias_cursadas)                             as materias_cursadas,
  sum(materias_aprobadas)                            as materias_aprobadas,
  sum(materias_reprobadas)                           as materias_reprobadas,
  round(avg(promedio_semestre), 2)                   as promedio_anual
from vista_promedios_semestre
group by alumno_id, curp, matricula, alumno,
         case when semestre in (1,2) then 1
              when semestre in (3,4) then 2
              when semestre in (5,6) then 3 end;

-- ── 4. Evaluación general (todo el bachillerato) ────────────

create or replace view vista_evaluacion_general as
select
  alumno_id,
  curp,
  matricula,
  alumno,
  count(distinct semestre)                           as semestres_cursados,
  sum(materias_cursadas)                             as total_materias,
  sum(materias_aprobadas)                            as total_aprobadas,
  sum(materias_reprobadas)                           as total_reprobadas,
  round(avg(promedio_semestre), 2)                   as promedio_general,
  round(
    100.0 * sum(materias_aprobadas) / nullif(sum(materias_cursadas),0),
    1
  )                                                  as porcentaje_avance
from vista_promedios_semestre
group by alumno_id, curp, matricula, alumno;

-- ── 5. Ficha completa del alumno ────────────────────────────
-- Una consulta, un alumno, todos sus datos.

create or replace view vista_ficha_alumno as
select
  a.*,
  (select json_agg(json_build_object(
      'ciclo', codigo, 'periodo', periodo, 'grado', grado,
      'semestre', semestre, 'grupo', grupo, 'turno', turno,
      'fecha_inscripcion', fecha_inscripcion, 'estatus', estatus))
   from inscripciones i
   join grupos g on g.id = i.grupo_id
   join ciclos_escolares ce on ce.id = i.ciclo_id
   where i.alumno_id = a.id
   order by ce.codigo desc, g.semestre desc)       as inscripciones,
  (select row_to_json(eg.*) from vista_evaluacion_general eg
   where eg.alumno_id = a.id)                      as evaluacion_general,
  (select coalesce(sum(c.monto), 0) from cargos c
   where c.alumno_id = a.id and c.estatus = 'pendiente') as saldo_pendiente,
  (select count(*) from documentos_alumno d
   where d.alumno_id = a.id)                       as documentos_expediente
from alumnos a;

-- ── 6. Estado de cuenta del alumno ──────────────────────────

create or replace view vista_estado_cuenta as
select
  c.id                as cargo_id,
  c.alumno_id,
  cp.clave,
  cp.nombre           as concepto,
  cp.tipo,
  c.monto,
  c.fecha_limite,
  c.estatus,
  c.notas,
  (select json_agg(json_build_object(
      'id', p.id, 'monto', p.monto_pagado, 'fecha', p.fecha_pago,
      'metodo', p.metodo, 'referencia', p.referencia,
      'validado', p.validado_en is not null,
      'folio_recibo', p.folio_recibo,
      'comprobante_url', p.comprobante_url))
   from pagos p where p.cargo_id = c.id
   order by p.subido_en desc)                     as intentos_pago,
  c.created_at
from cargos c
join conceptos_pago cp on cp.id = c.concepto_id;
