# Prueba aislada de métricas públicas

El probe `scripts/verify-public-metrics-isolated.cjs` exige `assertIsolatedEnvironment` antes de crear cualquier cliente o cuenta de prueba. Sólo admite el Supabase propio en loopback55431. No leerá `.env.local` ni ejecutará llamadas alojadas. La opción `--web` exige además el servidor propio3004. Ejecución real coordinada PASS:

```powershell
node scripts/run-isolated.cjs -- scripts/verify-public-metrics-isolated.cjs --web
```

Verifica con clientes reales que anónimo y un JWT autenticado no pueden leer/escribir contadores ni invocar las RPC directamente. Service_role opera exclusivamente en el laboratorio para probar payloads inválidos, rechazo de rutas privadas y campos extra, y rollback íntegro cuando una muestra posterior del mismo payload falla.

La cohorte reservada es `/publico/conoce`, escritorio, CLS. Debe estar vacía al inicio; el probe se niega a sobrescribir métricas previas. Usa fechas UTC de hoy, hoy−29, hoy−30 y hoy−31 y los intervalos2/3/4. Demuestra que19 muestras ocultan conteo/percentil,20 habilitan el p75 por intervalos, los datos anteriores a30 días no participan en lectura y las RPC de registro/limpieza los eliminan manteniendo el día límite inclusivo. Comprueba que `select('*')` sólo devuelve las seis columnas de contadores, sin filas de eventos, cuenta, visitante, IP, URL completa ni campos personales.

Antes de cada limpieza global se comprueba que no haya filas vencidas ajenas. Coordinar esta prueba sin otro probe de retención simultáneo: la RPC de producción elimina todas las fechas vencidas por diseño y la validación previa no constituye un bloqueo transaccional entre clientes. Las pruebas de consentimiento pueden usar otras rutas/cohortes; no deben escribir en la cohorte reservada mientras corre éste.

Con `--web`, el endpoint real debe rechazar campos de identidad/rutas privadas y solicitudes sin consentimiento; una carga válida con permiso opcional debe añadir exactamente un contador. La cuenta y las filas propias se eliminan en `finally`, también en fallo. No borra otras cohortes ni restablece contadores institucionales; se niega a empezar si su cohorte está ocupada. El cambio de día UTC exige reiniciar la prueba. No guardar sesiones/claves ni payloads con datos personales en los resultados.

Esta prueba comprueba permisos y agregación, no garantiza precisión de métricas de campo, tamaño real de muestra, seguridad frente a bots que simulen consentimiento ni ausencia de correlación con logs del alojamiento. Las mediciones reales y la revisión de proveedores siguen siendo tareas institucionales.

Resultado observado: anon/JWT autenticado denegados en RPC y contadores; entradas inválidas rechazadas de forma atómica; seis columnas esperadas;19 muestras ocultas/20 visibles; fechas vencidas excluidas y eliminadas, conservando el límite inclusivo30 UTC. HTTP real rechazó identidad extra/ruta privada (400) y falta de consentimiento (403), y registró una muestra permitida (204, total21). Cohorte temporal y cuenta eliminadas PASS; no se restauraron sobre métricas existentes ni se realizaron llamadas alojadas.
