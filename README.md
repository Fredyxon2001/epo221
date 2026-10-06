# Sistema EPO 221 — Plataforma Escolar

Sistema web para la Escuela Preparatoria Oficial No. 221 "Nicolás Bravo" (CCT 15EBH0409B).

## Stack
- **Frontend:** Next.js 16.3.8 (App Router) + React 19.3 + TypeScript + Tailwind CSS 4
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
npm ci
cp .env.example .env.local   # Llenar con credenciales de Supabase
npm run dev
```

## Transferencia final a la escuela
Ver [ENTREGA.md](ENTREGA.md), [operación de seguridad](docs/security-operations.md) y [prioridades de mejora](docs/improvement-roadmap.md). Verificar propietarios, dominios, firmas y opciones del proveedor antes de transferir; la guía no acredita que esa transferencia ya se realizó.

Reglas clave del código:
- Credenciales privadas solo en variables de entorno; nunca en Git ni clientes públicos. Inventariar también las URLs institucionales y la identidad EAS durante una transferencia.
- Todas las tablas con RLS (Row Level Security) activado.
- Migraciones versionadas en `supabase/migrations/`.
