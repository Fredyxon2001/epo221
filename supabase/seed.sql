-- ============================================================
-- Seed inicial — BGE (Bachillerato General Estatal, SEIEM)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Campos disciplinares
insert into campos_disciplinares (nombre) values
  ('Matemáticas'),
  ('Ciencias Experimentales'),
  ('Ciencias Sociales'),
  ('Humanidades'),
  ('Comunicación'),
  ('Paraescolar'),
  ('Capacitación para el Trabajo')
on conflict do nothing;

-- Materias BGE por semestre (plan base — editable desde admin)
-- NOTA: los nombres siguen la nomenclatura SEIEM vigente.
insert into materias (nombre, semestre, tipo, campo_disciplinar_id, horas_semestrales) values
  -- Semestre 1
  ('Matemáticas I',                        1, 'obligatoria', 1, 80),
  ('Química I',                            1, 'obligatoria', 2, 64),
  ('Ética',                                1, 'obligatoria', 4, 48),
  ('Metodología de la Investigación',      1, 'obligatoria', 3, 48),
  ('Lengua y Comunicación I',              1, 'obligatoria', 5, 64),
  ('Inglés I',                             1, 'obligatoria', 5, 48),
  ('Tecnologías de Información y Comunicación', 1, 'obligatoria', 5, 48),
  ('Actividades Físicas y Deportivas',     1, 'paraescolar',  6, 0),
  ('Orientación Educativa I',              1, 'paraescolar',  6, 0),

  -- Semestre 2
  ('Matemáticas II',                       2, 'obligatoria', 1, 80),
  ('Química II',                           2, 'obligatoria', 2, 64),
  ('Lógica',                               2, 'obligatoria', 4, 48),
  ('Historia de México',                   2, 'obligatoria', 3, 48),
  ('Lengua y Comunicación II',             2, 'obligatoria', 5, 64),
  ('Inglés II',                            2, 'obligatoria', 5, 48),
  ('Actividades Artísticas',               2, 'paraescolar',  6, 0),
  ('Actividades Físicas y Deportivas',     2, 'paraescolar',  6, 0),
  ('Orientación Educativa II',             2, 'paraescolar',  6, 0),

  -- Semestre 3
  ('Matemáticas III',                      3, 'obligatoria', 1, 80),
  ('Biología I',                           3, 'obligatoria', 2, 64),
  ('Física I',                             3, 'obligatoria', 2, 64),
  ('Estructura Socioeconómica de México',  3, 'obligatoria', 3, 48),
  ('Literatura I',                         3, 'obligatoria', 5, 48),
  ('Inglés III',                           3, 'obligatoria', 5, 48),
  ('Orientación Educativa III',            3, 'paraescolar',  6, 0),

  -- Semestre 4
  ('Matemáticas IV',                       4, 'obligatoria', 1, 80),
  ('Biología II',                          4, 'obligatoria', 2, 64),
  ('Física II',                            4, 'obligatoria', 2, 64),
  ('Historia Universal Contemporánea',     4, 'obligatoria', 3, 48),
  ('Literatura II',                        4, 'obligatoria', 5, 48),
  ('Inglés IV',                            4, 'obligatoria', 5, 48),
  ('Orientación Educativa IV',             4, 'paraescolar',  6, 0),

  -- Semestre 5 (aquí empiezan optativas y capacitación)
  ('Cálculo Diferencial',                  5, 'obligatoria', 1, 80),
  ('Geografía',                            5, 'obligatoria', 3, 48),
  ('Filosofía',                            5, 'obligatoria', 4, 48),
  ('Inglés V',                             5, 'obligatoria', 5, 48),
  ('Capacitación para el Trabajo I',       5, 'capacitacion', 7, 96),
  ('Optativa I',                           5, 'optativa',     null, 48),

  -- Semestre 6
  ('Cálculo Integral',                     6, 'obligatoria', 1, 80),
  ('Ecología y Medio Ambiente',            6, 'obligatoria', 2, 48),
  ('Metodología de la Investigación II',   6, 'obligatoria', 4, 48),
  ('Inglés VI',                            6, 'obligatoria', 5, 48),
  ('Capacitación para el Trabajo II',      6, 'capacitacion', 7, 96),
  ('Optativa II',                          6, 'optativa',     null, 48)
on conflict do nothing;

-- Ciclo escolar actual (para arrancar)
insert into ciclos_escolares (codigo, periodo, activo) values
  ('2025-2026', '2025B', true)
on conflict do nothing;

-- Conceptos de pago típicos (la escuela los editará)
insert into conceptos_pago (clave, nombre, tipo, monto, obligatorio) values
  ('INSCRIPCION_2025B',   'Inscripción 2025-2026 (2° periodo)', 'inscripcion',    500.00, true),
  ('CUOTA_ANUAL',         'Cuota voluntaria anual',             'cuota',          800.00, false),
  ('EXTRAORDINARIO',      'Examen extraordinario',              'extraordinario', 150.00, false),
  ('CONSTANCIA',          'Constancia de estudios',             'constancia',      50.00, false),
  ('ASESORIA',            'Asesoría académica',                 'asesoria',       100.00, false)
on conflict do nothing;
