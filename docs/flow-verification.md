# Comprobación de flujos web

Fecha: 2026-10-05. Revisión posterior a cookies, MFA y permisos. Sí se encontraron regresiones: `SELECT *` de docentes después de retirar columnas privadas, lecturas/panel de Finanzas y mutaciones académicas revocadas. También se reprodujo el límite de carga de 1 MB y se corrigieron problemas previos de temporizador, borradores y pagos no atómicos.

Entrega funcional `c950b38`, despliegue `dpl_9XyThkAEU2fc3U43C9hYaimp3UGb` READY en `https://epo221.edu.mx`. El script de navegador también pasó completo contra producción, con MFA, panel/perfil financiero y avatar 1.2 MB. Limpieza verificada: cero usuarios/ciclos de fixtures y cero objetos temporales. Login/privacidad/cookies/contacto 200; admin sin sesión 307 y preparación de upload sin sesión 401; cabeceras CSP/HSTS/no-store presentes. Cero entradas de error en los logs iniciales de diez minutos. El push GitHub requiere completar autenticación y se registra aparte de la publicación Vercel.

Cron autenticado del despliegue final: 200/ok, 63 tablas, 5,094 filas y ocho archivos verificados tras limpiar fixtures; la cuarentena se excluye. Sigue siendo prueba del respaldo de aplicación, no restauración nativa integral.

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

## Compatibilidad móvil — 2026-10-06

Backend real contra https://epo221.edu.mx: PASS, incluyendo audiencias de eventos/horarios además de avisos, y limpieza de datos desechables. El despliegue funcional dpl_2n5udfvvBSEfhQe3XmBbzpAnyVRc está READY con aliases institucionales; main ya fue enviado a GitHub hasta e248791. Iconos del sitio/PWA apuntan al logo 512 existente para evitar 404.

El repo móvil vigente es epo221-mobile-github, SDK 55; el scaffold antiguo no corresponde al APK. Backend: `node scripts/verify-mobile-flows.cjs --live` desde sistema (FLOW_BASE_URL configurable). Comprueba audiencias/adjuntos, directorio mínimo/recibos, identidad de tareas y fechas/calificación, contraseña/revocación/MFA/inactividad; datos desechables y limpieza garantizada. RN Web: `node scripts/serve-verification.cjs --local` y `node scripts/verify-browser.cjs --live` desde el repo móvil, con web local 3002. Registrar resultado antes de afirmar éxito. Estos checks no sustituyen teléfono/emulador ni prueba nativa de almacenamiento/instalación.
