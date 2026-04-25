# Sistema EPO 221 — Plataforma Escolar

Sistema web para la Escuela Preparatoria Oficial No. 221 "Nicolás Bravo" (CCT 15EBH0409B).

## Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Row Level Security)
- **Hosting:** Vercel (free tier)

## Módulos
- **Público:** landing, convocatorias, noticias
- **Alumno:** calificaciones, boleta PDF, estado de cuenta, subir comprobantes
- **Profesor:** captura de calificaciones y faltas, exportar a CSV oficial
- **Admin:** altas masivas, validación de pagos, reportes, gestión de catálogos

## Primeros pasos (desarrollo)

```bash
cd sistema
npm install
cp .env.example .env.local   # Llenar con credenciales de Supabase
npm run dev
```

## Transferencia final a la escuela
Ver `ENTREGA.md` (se generará al finalizar el proyecto).

Reglas clave del código:
- Ninguna URL, clave o correo personal hardcodeado. Todo en `.env`.
- Todas las tablas con RLS (Row Level Security) activado.
- Migraciones versionadas en `supabase/migrations/`.
