# Expediente institucional de privacidad — borrador para revisión

No publicar este borrador como aviso aprobado. La escuela debe confirmar responsable formal, Unidad de Transparencia y normativa aplicable con su asesoría institucional.

## Datos pendientes para el aviso integral y simplificado

| Elemento | Confirmación requerida |
| --- | --- |
| Responsable | Denominación jurídica, domicilio y unidad responsable del tratamiento |
| Marco aplicable | Fundamentos federales/estatales y atribuciones específicas de gestión escolar |
| Contacto ARCO | Unidad de Transparencia, correo/domicilio oficial y mecanismo aprobado |
| Finalidades | Inscripción, seguimiento académico, asistencia, pagos, documentos y comunicación; identificar finalidades adicionales |
| Datos | Identificación, CURP/matrícula, contactos/tutores, historial, pagos, conducta, mensajes, documentos; identificar sensibles y menores |
| Proveedores | Vercel, Supabase, correo/push y almacenamiento: contratos, encargados, ubicación y transferencias cuando correspondan |
| Conservación | Tabla institucional de plazos y disposición de cada categoría; suspender disposición cuando exista obligación de preservación |
| Fotografías | Base jurídica y autorizaciones de menores/tutores, alcance de publicación, retirada y acceso a archivos |
| Publicación | Aviso simplificado en puntos de recopilación y enlace integral aprobado en `PRIVACY_NOTICE_URL` |

La página `/privacidad` informa sobre funciones del sistema y señala el aviso/contacto pendientes; `/cookies` regula los opcionales del navegador. Ninguna reemplaza los avisos institucionales ni demuestra cumplimiento total.

## Inventario y análisis de riesgos preliminar

| Activo/tratamiento | Riesgo principal | Medida técnica implementada | Revisión institucional |
| --- | --- | --- | --- |
| Identidad y sesión | Suplantación, contraseñas compartidas | Claves individuales, cambio inicial, MFA privilegiada, límites y revocación | Identificación al recuperar y medios de contacto verificados |
| Expedientes y grupos | Consulta o cambio por otro usuario | Guardas por operación/página, RLS, vinculación explícita y alcance de grupo | Matriz de funciones y altas/bajas |
| Documentos y pagos | Descarga ajena o archivo activo | Autorización previa, URL temporal, tamaños/tipos y firmas de archivo | Antimalware, disposición documental y acceso institucional |
| Entrega de credenciales | Exposición persistente | Cifrado, descarga única, caducidad y retirada del legado en claro | Entrega segura y evidencia sin conservar claves |
| Fotografías públicas | Difusión de datos de menores | Validación de formato y control de publicación | Revisar autorizaciones y retirar material sin sustento; no asumir autorización por estar ya publicado |
| Proveedores | Exposición, interrupción o uso fuera de finalidades | Secretos de servidor, cifrado de respaldos, CSP y TLS | Contratos, ubicaciones, subencargados y continuidad |
| Respaldos y auditoría | Pérdida o exposición de información | AES-GCM, bucket privado, prueba temporal y redacción de secretos | Custodia independiente, plazos, RPO/RTO y simulacro integral |

Designar responsable de seguridad, suplente, custodio de claves y responsable de atención a titulares. Completar valoración de probabilidad/impacto, riesgos residuales, calendario de revisión y evidencias de capacitación. Aprobar el documento de seguridad y el procedimiento de incidentes antes de afirmar cumplimiento jurídico.

Referencia primaria: [Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf). Confirmar con la institución los artículos y disposiciones estatales aplicables; no inventar autoridades, plazos ARCO, consentimientos ni contratos.
