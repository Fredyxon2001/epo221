-- Phase 1: add the masked reader before deploying its web/mobile API consumers.
-- Do not retire the old column until every consumer has moved to this view.
CREATE SCHEMA IF NOT EXISTS school_private;
REVOKE ALL ON SCHEMA school_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA school_private TO authenticated, service_role;

-- This single-purpose definer reads one protected value. It independently checks
-- identity, live session/MFA and ownership even when called outside the view.
CREATE OR REPLACE FUNCTION school_private.exam_grade(p_attempt_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT i.calificacion
  FROM public.examen_intentos i
  JOIN public.examenes e ON e.id = i.examen_id
  JOIN public.perfiles p ON p.id = auth.uid()
  WHERE i.id = p_attempt_id AND public.security_session_valid()
    AND (
      p.rol IN ('admin', 'staff', 'director')
      OR (p.rol = 'profesor' AND EXISTS (
        SELECT 1 FROM public.asignaciones a JOIN public.profesores t ON t.id = a.profesor_id
        WHERE a.id = e.asignacion_id AND t.perfil_id = p.id
      ))
      OR (p.rol = 'alumno' AND i.estado = 'calificado' AND e.mostrar_resultados
        AND public.security_can_read_assignment(e.asignacion_id) AND EXISTS (
          SELECT 1 FROM public.alumnos s
          WHERE s.id = i.alumno_id AND s.perfil_id = p.id AND s.deleted_at IS NULL
        ))
    );
$$;
REVOKE ALL ON FUNCTION school_private.exam_grade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION school_private.exam_grade(uuid) TO authenticated, service_role;

-- Metadata retains the original RLS policies. The view never directly selects
-- the revoked grade column: only the private, authorized reader can supply it.
CREATE OR REPLACE VIEW public.examen_intentos_visibles
WITH (security_invoker = true, security_barrier = true) AS
SELECT i.id, i.examen_id, i.alumno_id, i.numero, i.inicio, i.fin,
       school_private.exam_grade(i.id) AS calificacion, i.estado, i.created_at
FROM public.examen_intentos i;
REVOKE ALL ON public.examen_intentos_visibles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.examen_intentos_visibles TO authenticated, service_role;
COMMENT ON VIEW public.examen_intentos_visibles IS
  'RLS-preserving exam attempts with publication-gated student grades; no direct grade-column grant.';
NOTIFY pgrst, 'reload schema';
