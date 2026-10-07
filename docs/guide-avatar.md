# Asistente visual y recorrido por módulos

El usuario pidió un avatar con vestimenta por rol y una explicación de cada módulo y sus controles antes de avanzar al siguiente. El atlas local tiene ocho personajes ficticios: alumno, profesor, finanzas, director, administración, personal, orientación y visitante. La ropa ilustra la función; no representa uniformes oficiales ni personas de la escuela.

## Recurso y procedencia

- Generado con la herramienta integrada `imagegen`, modo generación, fondo transparente. Se conserva el archivo original sin retoques.
- Web: `public/img/guide/role-avatars.png`. App vigente: `assets/guide/role-avatars.png`.
- PNG RGBA de 1774 × 887 píxeles, 1 631 417 bytes; SHA256 `3ee3859e659724a69354a91ba9b32c2e3dd8398934b08156e7029b5d3f496018`.
- Cuadrícula de cuatro columnas y dos filas, en el orden indicado arriba. El componente recorta visualmente cada celda, sin producir imágenes derivadas.
- Instrucción de generación: crear un atlas coherente de ocho asistentes educativos latinoamericanos, estilo ilustración amable, personajes de medio cuerpo en celdas iguales; alumno con polo y cárdigan verde, profesor con cárdigan ocre y libro, finanzas con chaleco verde azulado y calculadora, director con saco azul y carpeta, administración con tableta, personal con portapapeles, orientación con cuaderno abierto y visitante con gesto de bienvenida. Sin texto, marcas ni líneas divisorias, fondo transparente.

La web solicita el recurso optimizado cuando se abre la guía. React Native incorpora el mismo recurso en su bundle; no requiere una petición externa. Pulsar el avatar explica las funciones del rol. No se añade voz, micrófono, analítica ni un servicio de conversación. Los movimientos respetan la preferencia de movimiento reducido.

## Recorrido y autenticador

La web deriva módulos del menú ya autorizado y explica los controles renderizados, incluidos los que quedan fuera de la pantalla. Las acciones repetidas por fila se explican por patrón. La app conserva un catálogo local por rol y contexto. La guía no ejecuta formularios, cambios de ciclo, pagos, entregas o descargas: avanzar de módulo sólo navega a rutas permitidas. Los campos no se leen para preparar explicaciones y las sesiones no se copian al navegador.

La pantalla MFA recomienda Google Authenticator, de Google LLC, enlaza sus tiendas oficiales y explica QR/clave manual y código de seis dígitos. La aplicación TOTP ya configurada puede seguir usándose. No cambia enrolamiento, desafío, validación ni requisitos de MFA. Referencia: [ayuda oficial de Google](https://support.google.com/accounts/answer/1066447?hl=es).

Las comprobaciones y el estado de publicación se registran en los `AGENTS.md` de cada repositorio. Una exportación JavaScript o una prueba RN Web no acredita por sí sola el APK publicado ni la ejecución nativa en iOS.
