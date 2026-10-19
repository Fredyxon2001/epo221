# Calidad pública y ensayos periódicos

## Alcance

- `node scripts/public-quality/audit.cjs https://epo221.edu.mx` inspecciona HTML SSR y enlaces públicos permitidos. No carga variables locales, cookies, Auth, páginas privadas, JavaScript ni terceros. Sólo GET para HTML y HEAD para documentos; el APK y los documentos firmados válidos se identifican como delegados **sin seguirlos ni acreditar sus bytes**.
- Sólo acepta HTTPS institucional exacto o HTTP `127.0.0.1:puerto` explícito. Rechaza credenciales, parámetros y rutas codificadas/privadas. No es un crawler general ni comprueba destinos de fragmentos #ancla. Omite enlaces externos/query y reporta el número; no afirma que todos los enlaces de toda la web estén comprobados.
- Límites: 40 páginas, 16 documentos/instaladores, 180 rutas únicas, 2 MiB por HTML descomprimido, 12 s por petición y 120 s por ensayo. Redirect máximo 4 hops y siempre validado antes de hacer la siguiente petición. Un corte/tamaño excedido no se convierte en PASS.
- `node scripts/public-quality/verify-audit.cjs` comprueba esos límites con un servidor efímero **sólo loopback**, respuestas corruptas y redirecciones maliciosas. No llama al sistema escolar.
- No se imprime HTML, texto de documentos, nombres de usuarios, cookies, URLs firmadas, parámetros o tokens. El informe contiene rutas públicas canónicas y conteos.

## PDF públicos

`pdf-facts.py` lee únicamente nombres simples bajo `public/descargas` (máximo 16 PDF, 4 MiB/archivo, 100 páginas/archivo y 1 MiB de texto extraído). Usa `pypdf`; el entorno de verificación utilizado proporciona 6.10.0. Idioma, título, estructura, cifrado y existencia de texto son hechos de parser, **no validación PDF/UA, WCAG ni de orden de lectura**. No imprime texto, autores, títulos, campos o información privada.

```powershell
python scripts/public-quality/verify-pdf-facts.py
python scripts/public-quality/pdf-facts.py
python scripts/public-quality/verify-derived-pdfs.py --render
node scripts/public-quality/verify-derived-ui.cjs
```

Para renderizar se requiere Poppler `pdftoppm` en PATH o la ruta de ejecutable en `PUBLIC_QUALITY_PDFTOPPM`. La verificación crea PNG temporales fuera del repo, compara todas las páginas a 100 dpi y los elimina. No cambia los PDF. Ejecutar el parser en un proceso con plazo y memoria acotados si se incorporan documentos ajenos complejos; los actuales son cuatro fuentes públicas versionadas pequeñas, no uploads arbitrarios.

La inspección visual mantiene los defectos históricos: la cabecera/ciclo de reinscripción contiene texto parcialmente tapado por el recuadro de foto, idéntico en el original; requiere sustitución institucional vigente, no inferir una fecha ni certificar el diseño por añadir Title.

Los cuatro `*-titulo-v2.pdf` son copias separadas de históricos con el título exacto del catálogo añadido en metadatos. Conservan los originales y los DOCX, contenido, campos, idioma y tags. `src/lib/public-derived-documents.json` sólo los ofrece en la interfaz si coincide **tanto la ruta original exacta como el título esperado**. Las versiones publicadas de la base, sus rutas y su vigencia no se modifican. No son requisitos o publicaciones institucionales nuevos.

`derive-pdfs.py --create` reproduce las copias, exige el manifiesto exacto, nunca sobrescribe el origen y rechaza una copia existente distinta. El recibo `derived-pdfs-proof.json` fija SHA256 de original/copia; la prueba SSR y CI verifican esos hashes. Python puede fallar al escribir en OneDrive: el creador usa Node sólo para la escritura/relectura del destino ya validado; sin shell, red ni datos privados. Cambiar una fuente o variante exige nueva revisión/versionado, no actualizar hashes para ocultar una diferencia.

## Navegador y rendimiento

`verify-derived-browser.cjs` requiere el origen público explícito como argumento y comprueba los cuatro enlaces de la nueva UI, tamaño táctil, axe seleccionado y los bytes/hash de las cuatro variantes; todas las mutaciones se abortan antes del backend. Ejecutarlo sólo cuando el coordinador libere Chrome y el servidor de la fuente nueva esté disponible.

La línea base del 19oct2026 se midió en producción **antes de esta entrega**, tres corridas secuenciales Lighthouse 13.5.0 móvil/simulate con perfil anónimo nuevo, sin consentimiento y endpoint de métricas bloqueado. No se reutiliza una sesión escolar ni se simulan métricas positivas. Todas las corridas y límites se documentan en AGENTS.md; artefactos agregados fuera de Git. Los scores y TBT de laboratorio no son INP/p75 de campo ni certificación. No se modificaron más componentes por una puntuación aislada.

## CI semanal

`.github/workflows/isolated-flows.yml` conserva push/PR y añade ejecución manual sin inputs y lunes 11:23 UTC (05:23 México UTC-6). El horario puede retrasarse o dejar de ejecutarse por políticas de GitHub; **no es garantía de respaldo, RPO o RTO**. La suite utiliza el stack Docker aislado existente, que ya incluye recuperación sintética completa y los flujos académicos/financieros/móviles/navegador/métricas/operación/accesibilidad. Nunca restaura ni crea cuentas en producción.

Sólo permiso `contents: read`, checkout sin credenciales persistidas, timeout del job 35 min y cleanup `always()` de 5 min. Concurrencia por evento y rama: push/PR obsoletos se cancelan, un push no cancela un simulacro manual o semanal en curso. No añade secrets, notificaciones a terceros, artefactos con sesiones ni planes de pago. La programación preparada sólo queda confirmada al publicar el workflow; un próximo run semanal aún requiere su resultado real.

Fuentes oficiales consultadas:
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF16
- https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF18
