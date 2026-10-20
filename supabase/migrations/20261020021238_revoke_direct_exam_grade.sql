-- Phase 2: apply only after the deployed web/mobile API reads the masked view.
-- Scores stay untouched. Safe attempt metadata and all service writes remain.
DO $$ BEGIN
  IF to_regclass('public.examen_intentos_visibles') IS NULL
     OR to_regprocedure('school_private.exam_grade(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Deploy the masked exam reader before retiring direct grades';
  END IF;
END $$;
REVOKE SELECT ON public.examen_intentos FROM PUBLIC, anon, authenticated;
REVOKE SELECT (calificacion) ON public.examen_intentos FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, examen_id, alumno_id, numero, inicio, fin, estado, created_at)
  ON public.examen_intentos TO authenticated;
NOTIFY pgrst, 'reload schema';
