# Comprobación de flujos web

Fecha: 2026-10-05. Revisión posterior a cookies, MFA y permisos. Sí se encontraron regresiones: `SELECT *` de docentes después de retirar columnas privadas, lecturas/panel de Finanzas y mutaciones académicas revocadas. También se reprodujo el límite de carga de 1 MB y se corrigieron problemas previos de temporizador, borradores y pagos no atómicos.

| Recorrido | Evidencia |
| --- | --- |
| Docente → constancia | Página y PDF propio; PDF ajeno 403. |
| Administración/Finanzas → MFA → destino | TOTP real en navegador, sin persistir secreto/cookies. |
| Tarea → archivo → calificación | Acciones reales/Storage/RLS; dueño y docente acceden, otro alumno no; nota 11 y modificación posterior bloqueadas. |
| Examen → reanudar → entregar → calificar | Intento concurrente único, orden/tiempo persistidos, borrador sin blur, respuestas tardías bloqueadas, entrega idempotente, nota final después de todas las abiertas. |
| Archivo 1.2 MB → avatar | Carga directa original excede 1 MB; URL firmada/ticket/validación y persistencia comprobadas. |
| Pago → rechazo → nuevo comprobante → validación | Relaciones/estados atómicos; escritura fraudulenta directa y cargo ajeno rechazados; folio final y cargo pagado. |
| Contraseña obligatoria → panel | Navegador cambia clave sintética y recupera sesión autorizada. |
| Cookies/PWA y guardas | Consentimiento corrupto/vencido, mapa bloqueado, redirecciones conservan sesión; 142 acciones, API/MFA/origen/rate, cifrado, tickets alterados/ajenos y campos repetidos. |

Desde la raíz de `sistema`, con configuración de servidor autorizada en `.env.local`:

```powershell
npm run lint
npm run typecheck
npm run test:security
npm audit --audit-level=low
npm run build
node scripts/verify-academic-flows.cjs --live --data-only
node scripts/verify-financial-flows.cjs --live
node scripts/verify-upload-flows.cjs --live
$env:FLOW_BASE_URL = 'http://localhost:3002'
node scripts/verify-browser-flows.cjs --live
```

Los scripts `--live` crean y eliminan únicamente cuentas/registros sintéticos. Usar un Supabase independiente de pruebas cuando esté disponible. No usar expedientes reales ni activar trazas/capturas con autenticación. Las credenciales se generan en memoria; la limpieza se ejecuta incluso ante fallos. La prueba HTTP de uploads usa IDs del build local; en producción comprobar cargas con el script de navegador. Los E2E heredados requieren variables `E2E_*` y cuentas de pruebas adecuadas al MFA.

Los recorridos comprobados no equivalen a probar todas las pantallas, navegadores o clientes móviles. Las comprobaciones de firma de archivos no realizan análisis antivirus. El aviso institucional aprobado y los pendientes de operación se mantienen en `security-operations.md` y el reporte de seguridad.
