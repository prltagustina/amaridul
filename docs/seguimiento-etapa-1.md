# Amarí Dul — Seguimiento de la etapa 1

Actualizado: 3/11/2026, 17 h. Etapa 1 **abierta**. Bloques del cierre: **A** portal y catálogo, **B** credenciales, **C** cuota, **D** cierre. **Publicado el 3/11** (`8bc4e3b` y `3c04d74`), con las migraciones `0013` a `0015` aplicadas en producción antes del deploy. Siguen **apagados**: la carga de archivos (`REPROCANN_UPLOADS`, hasta validarla) y el recordatorio de cuota (`FEE_REMINDERS`).

**Fuentes**: los pedidos de Luci (A–E), el resumen de la planilla de seguimiento (no se pudo leer: pide sesión de Google; no se editó) y lo comprobado en código, en local y en producción en solo lectura.

**Estados**, siempre separados:
- **Implementado**: está en el código (rama `fase-ui`).
- **Probado en local**: pruebas automáticas y recorrido en el navegador con datos ficticios.
- **Validado con servicios reales**: probado contra Neon, Vercel Blob o Resend reales.
- **Publicado**: en producción.

## Pedidos de Luci (A–E)

| ID | Tema | Estado | Falta |
|---|---|---|---|
| A | Credencial REPROCANN | **Publicado el 3/11, con la carga de archivos apagada.** No validado con el almacenamiento real. Detalle en «Credenciales». | Validar la carga real y activar `REPROCANN_UPLOADS`. Criterios de AD-012. «Sin REPROCANN activo no hay dispensa» no se aplica: no hay dispensa (AD-006). |
| B | Productos en el portal | **Publicado el 3/11**: catálogo con foto, ficha del producto y carga de fotos desde administración (migración `0014`). | Los **2 productos activos** (FLORES-CC y FLORES-EX) tienen desde el 3/11 una **descripción provisoria** (solo variedad y cultivo) y una **imagen ilustrativa** rotulada así, no una foto real. Reemplazarlas por las de la asociación. |
| C | Difusión por correo | **Recordatorio de cuota publicado el 3/11, apagado** (migración `0015`). No hay plataforma de campañas (fuera de alcance). | Definiciones de la sección «Cuota». |
| D | Cuotas y Mercado Pago | **Publicado el 3/11**: «Administración de cuota» con los datos de pago. Sin montos, deudas ni vencimientos. | Acreditación automática y débito o suscripción: pendientes. Registro de pagos: propuesto, no implementado. |
| E | Socios existentes y padrón | **Publicado el 28/10.** Acceso digital desde la ficha y «Ya soy socio/a». Categoría «Activo y paciente» publicada el 3/11. | **Revisión de duplicados en producción (pendiente).** Un integrante de la Comisión todavía no está en el padrón: volver a importar su fila (ya tiene DNI en la planilla) y después asignarle «Activo y paciente». A otro socio le falta el DNI en la planilla (ya está importado). |

## Planilla compartida (AD-001 a AD-014)

| ID | Tema | Responsable | Declarado | Comprobado (3/11) | Próximo paso |
|---|---|---|---|---|---|
| AD-001 | Slogan en la vista previa del enlace | — | Resuelto | **Publicado**: imagen sin slogan, idéntica a la del repositorio (`78fa075`). | — |
| AD-002 | Preguntas frecuentes | Lucía | Pendiente | La sección pública existe sin respuestas. El portal suma «Ayuda» (ver más abajo). | **Dependencia**: textos de Lucía. |
| AD-003 | Correo de contacto y WhatsApp | Lucía | Pendiente | Sin canales cargados. «Solicitar actualización por WhatsApp» está preparado: en local se ve como vista previa sin número; publicado no aparece. | **Dependencia**: número oficial con código de país y área, y correo. Se cargan en `CONTACT` (`src/lib/constants.ts`). |
| AD-004 | Texto de «Quiénes somos» | Lucía | Pendiente | La sección existe. | **Dependencia**: texto de Lucía. |
| AD-005 | Revisión de los 9 pasos del alta formal | Ambas | Pendiente | 9 pasos, de A a I. | Revisarlos juntas. |
| AD-006 | REPROCANN activo al aceptar el alta | Decisión | Pendiente | El alta no exige REPROCANN y no hay dispensa. | Decidir si es condición del alta o de la dispensa. |
| AD-007 | Edición y alta de productos | — | Resuelto | Publicado. Local: foto del producto. | — |
| AD-008 | Información y columnas del padrón | — | Resuelto | Publicado. La columna REPROCANN usa el mismo estado que ve el socio. | Contrastar con la planilla (sin acceso). |
| AD-009 | Control semestral de historias clínicas | Director Médico | Pendiente | El sistema no guarda datos clínicos. | Definir el seguimiento fuera del sistema o un recordatorio sin datos clínicos. |
| AD-010 | Quitar el celular de la preadmisión | — | Resuelto | Publicado (`f99c987`). | — |
| AD-011 | Opciones REPROCANN: Vigente, Vencido, En trámite | — | Pendiente | 7 estados de permiso en administración. La credencial se muestra con un solo estado: sin cargar, en revisión, observada, verificada, vence pronto o vencida. | Acordar las palabras finales con Luci. |
| AD-012 | Carga de credencial y criterios de identidad, acceso y conservación | — | Pendiente | **Implementado y probado en local.** | Los tres criterios. Conservación de versiones: no definida, sin borrado automático. |
| AD-013 | Listado para la siguiente acta, sin repetir | — | Pendiente | No existe. | Diseñarlo sobre admisiones «en Comisión». |
| AD-014 | Roles: Director Médico, Director Agronómico, cultivo | — | Largo plazo | Un único rol de administración. | Junto con AD-012. |
| — | Categoría «Activo» | — | Resuelto | **Publicado el 3/11** (migración `0012` aplicada y `141c5cf`): el alta formal ofrece Adherente o Paciente. «Activo» y «Activo y paciente» los asigna la asociación. 11 de las 12 personas de la Comisión ya figuran «Activo y paciente». | La persona que falta (ver E). Revisar con Luci las explicaciones de cada categoría. |
| — | Número de socio en los correos | — | Resuelto | **Publicado el 3/11** (`ef39a59`): los correos no muestran el número, que todavía no es definitivo. El portal lo sigue mostrando. | Volver a mostrarlo cuando la numeración sea definitiva. |
| — | Saludo del panel | — | Resuelto | **Publicado el 3/11**: el inicio del panel saluda «Hola, Jefa» a la cuenta de Luci. La cuenta conserva su nombre, que es el que figura en el registro de cambios. | — |

## A. Portal y catálogo

**Lotes, trazabilidad y entregas: ocultos para socios** (implementado y probado en local).
- Sin menú, sin ficha en el inicio y sin «próximamente». `/qr/trazabilidad` responde «no encontrado», con o sin sesión. El inicio ya no muestra «Dispensas».
- Se conservan el código, los registros y las secciones de administración (Lotes y Códigos, que muestran datos de ejemplo solo en la computadora de desarrollo).
- La demostración con datos ficticios sigue en `/qr/trazabilidad/demo`, solo en la computadora de desarrollo y rotulada «oculta para socios».
- **Códigos de envase y rutas públicas**: sin cambios. Ninguna página pública depende de ellos; solo los usa la sección «Códigos» de administración.

**Portal del socio**

| Lugar | Publicado hoy | Local |
|---|---|---|
| Menú | Mi espacio, REPROCANN, Productos, Trazabilidad | Mi espacio, REPROCANN, Productos, Cuota, Ayuda. La sección actual queda marcada también en sus subpáginas. |
| Inicio | Trámites, Asociación, Productos y «Conocé tu producto» | **Trámites** (credencial y su acción), **Asociación** (membresía y actualizar datos), **Productos** (resumen y compra próxima), **Cuota** (alias y titular) y una franja **¿Necesitás ayuda?**. Cada ficha resume; el detalle está en su sección. |
| Productos | Lista de productos, sin fotos | Fichas con el diseño de la ficha del lote: banda verde con tipo y nombre, foto en 4:3 o «Foto pendiente», variedad, quimiotipo, cultivo, fecha y descripción. Cada una abre la **ficha del producto**, con la foto en su proporción. |
| Cuota | No existía | «Administración de cuota»: ver «C. Cuota». |
| Ayuda | No existía | «Necesito iniciar mi trámite», «Ya tengo mi credencial», cuota, actualizar datos y compras. |

**Catálogo: reglas comprobadas** (pruebas automáticas y recorrido en el navegador con datos ficticios):
- Lo ven los socios con membresía activa, tengan o no credencial. Ver productos no habilita una dispensa (lo dice la página).
- Crear y dejar activo → aparece. Editar → se ve al recargar. Desactivar → desaparece; su ficha y su foto responden 404 por enlace directo. Se lee en cada visita: no hay caché que deje datos viejos.
- Carga, error (con «Probar de nuevo») y vacío resueltos.
- Sin precios, stock, compra, lotes, entregas, certificados ni notas internas. Se mantiene el aviso: «Próximamente vas a poder comprar productos desde tu cuenta. Te avisaremos cuando esté disponible».

**Fotos de productos** (nuevo circuito, separado del almacenamiento privado de credenciales):
- En «Productos» de administración, la columna «Foto» abre el diálogo: elegir, ver, cambiar o quitar.
- El navegador de la administradora achica la foto a 1600 px como máximo y la convierte a JPG. El servidor la vuelve a revisar, quita **todos** los datos de cámara y ubicación (EXIF, XMP, GPS, miniaturas) y la guarda en la base de datos (hasta 2 MB). Comprobado: una foto ficticia con GPS quedó guardada sin él.
- Los socios la ven solo si el producto está activo; administración, siempre. Cada cambio queda en el registro.

**Revisión de accesibilidad** (local, 3/11): sin desplazamiento horizontal a 390 y 1280 px. Análisis automático (axe, WCAG 2.1 AA) sin problemas en inicio, catálogo, ficha, credencial, cuota y ayuda. Las fichas del catálogo se recorren con el teclado y muestran el foco. Los botones de copiar anuncian el resultado al lector de pantalla.

## B. Credenciales

### Lo que ya está (implementado y probado en local)

- **Socio**: «Cargar mi credencial» (PDF, JPG o PNG de hasta 10 MB). El servidor valida el tipo real por el contenido, el tamaño y la huella SHA-256. Ve el estado, el vencimiento «sin verificar» hasta la revisión, qué corregir si fue observada, el reemplazo y el historial.
- **Administración**: bandeja «Credenciales REPROCANN»; revisión con motivo para el socio y nota interna separados; «Cargar documentación recibida» desde la ficha (varias hojas, con comprobación del DNI); «Importar credenciales recibidas».
- **Garantías con pruebas**: la nota interna nunca llega al socio; cada archivo solo lo abren su socio y administración, y cada apertura queda registrada; un archivo no se carga dos veces; reemplazar deja la versión nueva pendiente y la revisión de una versión vieja se rechaza.
- **Nuevo (3/11)**:
  - **Carga de varias hojas que falla a mitad de camino**: no se registra el documento y se borran las hojas que ya habían subido. Nunca se borra un archivo que un documento ya usa.
  - **Un mismo archivo con dos DNI distintos** en la importación: «Duplicado», para que el documento de una persona no llegue a otra.
  - **DNI sin socio**: la revisión dice si la persona tiene una solicitud de alta o un «Ya soy socio/a» en curso, o si no hay nadie.

### Las credenciales de Drive: ¿se pueden cargar?

**Todavía no en producción.** El circuito de carga no está publicado: falta publicar el bloque con la migración `0013` y activar `REPROCANN_UPLOADS`. Decisión del 3/11: se publica con el bloque completo, y la carga la hace la administración (Agustina o Luci) desde el panel. Los documentos no pasan por la computadora de desarrollo.

**Carpeta** (comprobado el 3/11, 15:53, solo con el listado, sin descargar archivos):
- **10 archivos: 8 PDF y 2 JPG.** Antes eran 11: las dos hojas JPG de una misma persona se reemplazaron hoy a las 9:14 por un único PDF.
- **Se abre sin iniciar sesión en Google**: la ve cualquiera con el enlace. No se cambiaron sus permisos. Conviene restringirla.
- No se comprobó quién de las 10 personas está en el padrón: la consulta a producción no se hizo (requiere permiso). La importación lo comprueba por DNI.

**Qué sale de la computadora en la revisión previa** (comprobado en local capturando el tráfico, con archivos ficticios marcados):
- Al elegir los archivos y escribir los DNI: nada.
- «Revisar la importación»: un solo pedido de 561 bytes con, por archivo, el DNI escrito, la hoja, la huella SHA-256, el tamaño y el tipo. Ningún nombre de archivo, contenido ni byte del documento.
- «Importar»: solo los archivos de los grupos confirmados, con nombres al azar. En producción van directo del navegador al store privado de Vercel Blob. «Ya existe», «Duplicado» y «A revisar» no salen.

**Tres cosas distintas**:
1. **DNI escrito**: la administradora lo lee en el documento y lo escribe. El sistema no extrae nada del documento. El nombre del archivo nunca se usa para identificar.
2. **Coincidencia con el padrón**: el sistema busca ese DNI en el padrón. Confirma que el DNI escrito es de un socio; no que el documento sea auténtico ni que su titular sea ese socio. Por eso la revisión muestra el nombre del socio, para cotejarlo con el documento.
3. **Verificación documental**: una persona abre el archivo y coteja titular, DNI y vigencia. Recién entonces queda «Verificada». Hasta ahí, «pendiente de revisión».

**Casos dudosos** (DNI que no coincide, más de un socio, hojas salteadas, archivo repetido, socio que ya tiene credencial): quedan «A revisar», «Duplicado» o «Ya existe» y no se importan. Nada se sobrescribe. Los originales quedan en Drive.

**Pasos para la carga real** (cuando el bloque esté publicado):
1. Comprobar que la importación no dice «falta el almacenamiento privado».
2. Descargar los archivos de Drive a la computadora de la administradora.
3. Administración → Credenciales REPROCANN → **Importar credenciales recibidas** → elegir los archivos.
4. En cada fila, escribir el DNI tal como figura en el documento. Si tiene varias hojas: mismo DNI y hojas 1, 2…
5. **Revisar la importación** (no se sube nada) y leer cada motivo.
6. **Importar los confirmados**. Quedan pendientes de revisión.
7. En la ficha de cada socio, abrir el documento, cotejarlo y marcarlo «Verificada» u «Observada».
8. Resolver los «A revisar»: si la persona no es socia, esperar su alta o sumarla al padrón. No forzar.
9. Borrar las copias descargadas y restringir la carpeta de Drive.

### Personas con credencial, solicitantes y socios históricos

| Caso | Hoy | Propuesta |
|---|---|---|
| 1. Documentación recibida con la admisión pendiente | No se puede cargar: no hay socio. La importación lo dice («tiene la solicitud de alta … en curso») y no carga nada. **No se crean membresías ficticias.** | Permitir que el trámite REPROCANN cuelgue de la **persona** (que ya existe desde la solicitud) y pase al socio al aprobarse, sin duplicar a nadie. Impacto: una migración (el trámite admite persona o socio), reglas de acceso para ver documentos de alguien que todavía no es socio, la revisión en la ficha de la admisión y pruebas. Es una decisión de AD-012: guardar documentos de salud de quien todavía no es socio. |
| 2. Socio histórico que necesita acceso | Está en el padrón: la credencial se importa por DNI aunque todavía no tenga cuenta. Al activar su acceso desde la ficha, ve lo que cargó la asociación. | — |
| 3. Socio con cuenta | Carga o renueva desde su portal. La versión nueva reemplaza a la pendiente y la anterior queda en el historial. | — |

- Al aprobar una admisión, los documentos se conservan y no se duplican personas: el socio se crea sobre la misma persona.
- El mensaje «Quiero asociarme» de Luci no es para envíos masivos ni para socios históricos: ellos usan «Ya soy socio/a» o el acceso que se activa desde su ficha.
- Se mantienen separados: padrón, solicitudes, cuenta, REPROCANN y cuota.
- **Pendiente**: revisión de duplicados en producción.

### Decisiones propuestas, no acordadas

| Tema | Qué hace hoy y por qué | Pendiente |
|---|---|---|
| Límite de 10 archivos por día por cuenta (propuesta) | Frena una carga masiva por error. Al llegar: «Ya enviaste muchos archivos hoy…». Solo para socios; la carga de la asociación no tiene límite. | Confirmar el número o quitarlo. |
| Conservar las versiones anteriores | Quedan «Reemplazado», con su revisión. No hay borrado automático. | Política de conservación (AD-012): no definida. |
| Documentos que sube el socio | Solo la credencial. | Si suma otros comprobantes. |
| Quién ve las credenciales | Cualquier admin. | AD-012 y AD-014. |

## C. Cuota

**Datos de pago** (una sola fuente para el portal y el correo, `src/lib/fee-payment.ts`, guardados como texto):
- Titular: Asociación Civil Amarí Dul · Plataforma: Mercado Pago · Alias: Amaridul.mp · **CVU** (no CBU): 0000003100037002772495 · CUIT: 30-71843355-6.
- Las pruebas comprueban los dígitos verificadores del CUIT y del CVU, y que el CVU conserva sus ceros iniciales.
- **Link de pago**: ninguno hasta que Luci lo envíe. Nunca se arma a partir del alias.

**«Administración de cuota»** (`/qr/cuota`, implementado y probado en local): titular, plataforma, alias, CVU y CUIT; botones para copiar el alias y el CVU, que confirman y lo anuncian al lector de pantalla. Si el navegador no deja copiar, dejan el dato seleccionado para copiarlo a mano. Sin monto, deuda, vencimiento ni «al día»: «Por ahora el sistema no registra pagos».

**Recordatorio automático** (implementado y probado en local; **apagado**):
- **Correo**: aviso general, igual para todos. Datos de pago, «Si ya la pagaste, no hace falta que hagas nada», enlace a «Administración de cuota» y «Este aviso no indica que tengas una deuda». Vista previa en administración: Padrón → Recordatorio de cuota.
- **Programación**: mensual o trimestral, desde un día (1 a 28) y una hora, en hora de Argentina. Trimestral sale en el primer mes del trimestre.
- **Destinatarios propuestos**: socios con membresía activa y email (hoy, sin registro de pagos, no se puede excluir a quien ya pagó). Sin email: «Omitido».
- **Registro**: por socio y período, a qué email (enmascarado), resultado, intentos y fecha.
- **Sin duplicados**: un registro por socio y período, creado antes de enviar. Cada ejecución toma los registros de a uno (dos ejecuciones a la vez no toman el mismo), y el correo lleva una clave que el proveedor usa para descartar un reenvío. Un fallo se reintenta después de una hora, hasta 3 veces. Un envío que quedó a medias se retoma con la misma clave.
- **Doble llave para encenderlo**: `FEE_REMINDERS=on` en el entorno y activarlo en administración. Sin la primera, la casilla está deshabilitada. La ejecución programada (`/api/cron/recordatorio-cuota`) existe, pero **no está programada**: haría falta una entrada en `vercel.json` y `CRON_SECRET`. Sin el secreto responde 404.
- Las pruebas usan un buzón en memoria: no se envió ningún correo real.

**Pendiente de definir con Luci**: monto y período que cubre; si «trimestral» es el período pagado o la frecuencia del aviso; fechas; destinatarios; registro de pagos; link de Mercado Pago. La cuota queda separada de la compra de productos.

**Registro de pagos mínimo (propuesta)**: una tabla de pagos por socio y período (fecha, medio, quién lo registró, nota), cargada a mano por administración. El recordatorio omitiría a quien tenga el período pagado. La acreditación automática con Mercado Pago, el débito y la suscripción quedan para después.

## Ayuda y contacto

- **«Necesito iniciar mi trámite»**: lleva al sitio oficial https://reprocann.msal.gob.ar/home (comprobado el 3/11: responde y se titula «Reprocann»). No se publican requisitos ni pasos que no se pudieron verificar.
- **«Ya tengo mi credencial: quiero cargarla»**: lleva a la carga en `/qr/reprocann`.
- **Falta**: el instructivo y el video de Luci (no los tenemos), y el WhatsApp oficial (AD-003). El botón «Solicitar actualización por WhatsApp» está listo con el mensaje «Hola, soy socio/a de Amarí Dul y necesito actualizar mis datos. ¿Me ayudan?», sin DNI, datos médicos ni documentos. Sin número oficial no se muestra.

## Trazabilidad: qué falta para que funcione de punta a punta

Oculta para socios (ver A). Cuando se retome:

**Recorrido**: administración registra un lote, lo relaciona con un producto y registra cada entrega a un socio; el socio consulta la ficha de su lote. Hoy no hay ningún registro de lotes, códigos ni entregas.

**Tres tipos de información, con reglas distintas** (la regla exacta es una decisión):
1. **Del producto y del lote**, que puede compartirse: variedad, quimiotipo, fechas de cultivo y cosecha, composición, laboratorio y fecha de análisis. Decisión: ¿la ve cualquier socio con el código del envase, o solo quien recibió ese lote?
2. **Documentos internos o restringidos**: certificado de análisis completo, registros de cultivo. Decisión: ¿el socio ve el certificado completo o un resumen?
3. **Historial personal de entregas**: qué lote recibió cada socio, cuándo y cuánto. Solo lo ve ese socio y administración. Registrar entregas no habilita la dispensa.

**Alcance mínimo propuesto**, a aprobar antes de crear tablas: lotes (producto, variedad, fechas, estado, análisis y certificado privados), un código de envase por lote no adivinable, entregas (socio, lote, fecha, cantidad, quién registró) y «Tus entregas» en el portal.

## Migraciones

| Número | Qué hace | Estado |
|---|---|---|
| `0012` | Agrega «Activo y paciente» a la categoría. | **Publicada el 3/11**, con autorización. |
| `0013` | Archivos de credenciales por hoja, mensaje para el socio y reemplazos. Es la que el pedido llama «0012»: se renumeró porque la `0012` publicada es la de categorías. El SQL no cambió. | **Publicada el 3/11.** |
| `0014` | Fotos de productos. | **Publicada el 3/11.** |
| `0015` | Recordatorio de cuota: configuración y registro de envíos. | **Publicada el 3/11.** |

**Compatibilidad**: las tres solo agregan tablas, columnas y tipos, sin borrar ni transformar datos. La versión publicada sigue funcionando con ellas aplicadas.

**Cómo se publicó (3/11)**:
1. Build, pruebas y tipos en una copia de `main` con el commit a publicar.
2. Migraciones `0013` a `0015` aplicadas en Neon desde esa copia: antes había 13 aplicadas, después 16, con las cuatro tablas y las dos columnas nuevas. **Punto de restauración: 3/11 a las 16:52:37 (hora argentina, 19:52:37 UTC).**
3. Push a `main`; Vercel publicó en amaridul.com.
4. Prueba de humo: páginas públicas 200, páginas privadas piden sesión, la ejecución programada responde 404 y la CSP sigue en `connect-src 'self'`.

**Si algo falla**: volver a la versión anterior en Vercel (las tablas nuevas no la afectan). Si hiciera falta, restaurar la base en Neon al punto de restauración: se pierde lo cargado después.

## Seguridad: hallazgos

| Tema | Comprobado (3/11) | Estado |
|---|---|---|
| Carpeta de Drive con credenciales | Se abre y se lista sin iniciar sesión. | **Abierto.** Restringirla (no se tocó). |
| Planilla del padrón | Se abre sin iniciar sesión. | **Abierto.** Restringirla. |
| Clave de Resend | `RESEND_API_KEY` existe en producción, marcada sensible. | **Abierto.** Rotación preparada: crear una clave nueva en Resend, reemplazarla en Vercel (Production, sensible), volver a publicar, probar un correo y recién entonces revocar la anterior. |
| Copias ocultas (`EMAIL_BCC`) | Copiaban también los enlaces de activación y de cambio de contraseña. | **Publicado el 3/11**: los correos con enlaces de acceso (invitación, activación, actualización de datos, contraseña) y el recordatorio de cuota ya no se copian. El resto sigue copiándose mientras dure la prueba. |
| Herramienta de borrado de pruebas | Bastaba escribir la referencia para borrar un socio admitido con cuenta. | **Publicado el 3/11**: en producción ya no aparece; solo funciona con `TEST_DELETION=on` (se pone para una sesión de pruebas y se saca); nunca borra a quien tenga documentación REPROCANN con archivos. Quitarla antes de la entrega. |
| Administradoras y segundo factor | `ADMIN_SECOND_FACTOR=optional` sigue en producción. | **Abierto.** Que Luci cambie su contraseña inicial; cada administradora activa TOTP y guarda sus códigos de recuperación; después, quitar la variable. |
| Claves de cifrado | Solo están en Vercel, marcadas sensibles: no se pueden volver a leer. | **Abierto.** Si existe una copia sellada de cuando se generaron, guardarla fuera de línea. No rotar solo por la falta de copia: rotar implica volver a cifrar. |
| Token de Vercel Blob | El store `amaridul-archivos` es **privado**, está vacío y en São Paulo. `BLOB_READ_WRITE_TOKEN` está en Production marcado **no sensible**. | Volver a crearlo como sensible antes de cargar documentos reales. `REPROCANN_UPLOADS` todavía no está en producción. |
| Registros (logs) | — | **Publicado**: la terminal no registra DNI ni contraseñas, y fuera de la computadora de desarrollo los correos de consola no muestran enlaces. |
| Previews | Piden iniciar sesión en Vercel (redirigen a su SSO) y no tienen base de datos. | Comprobado. |

## Después de publicar: qué falta

- **Configuración**
  - [x] Migraciones `0013`, `0014` y `0015` con punto de restauración (3/11).
  - [ ] `REPROCANN_UPLOADS=on` después de validar la carga real con un archivo ficticio.
  - [ ] `TEST_DELETION=on` solo si todavía hacen falta borrados de prueba.
  - [ ] `FEE_REMINDERS` **sin poner**, hasta que se defina el recordatorio.
- **Validación real** (con archivos ficticios, nunca documentos reales)
  - Preferible un preview aislado (rama de Neon con datos ficticios, store privado propio, correos sin envío). Hoy no existe.
  - Si no, en producción con una cuenta de prueba que después se borra. Pasos:
    - cargar un PDF de cerca de 10 MB y un JPG como socio;
    - abrirlos como ese socio y como admin;
    - comprobar que otro socio y alguien sin sesión reciben 404, y que la URL directa del Blob no abre sin token;
    - reemplazar y verificar; cargar dos hojas como admin;
    - repetir una importación para confirmar que no duplica;
    - revisar la consola del navegador: ningún origen bloqueado por la CSP;
    - ver un PDF en Safari y en iPhone.
- **Contenido**
  - [ ] Fotos y descripciones reales de los 2 productos (hoy, provisorias e ilustrativas).
  - [ ] Instructivo y video de REPROCANN; WhatsApp y correo oficiales (AD-003).
- **Seguridad**: la tabla anterior.

## Cómo probar en local

`npm run dev`. Los correos salen por la terminal.

1. **Socio** (DNI ficticio 99003002, 99003003 o 99003006; contraseña desde «Olvidé mi contraseña», con el enlace que sale en la terminal):
   - **Inicio**: cuatro fichas (Trámites, Asociación, Productos, Cuota) y la franja de ayuda. Sin trazabilidad.
   - **Productos**: fichas con foto o «Foto pendiente». La ficha de cada producto se abre con un clic o con el teclado.
   - **Cuota**: copiar el alias y el CVU.
   - **Ayuda**: el enlace al sitio oficial y «Cargar mi credencial».
   - `/qr/trazabilidad` → «no encontrado».
2. **Productos en administración**:
   - crear un producto ficticio y agregarle una foto: aparece en el catálogo;
   - editarlo: el cambio se ve en el portal;
   - desactivarlo: desaparece y su enlace da 404.
3. **Credencial**: cargarla desde «Trámites». Probar un archivo de más de 10 MB y otro que no es PDF aunque se llame `.pdf`.
4. **Revisión** («Credenciales REPROCANN»): observar con un motivo (el socio lo ve, la nota interna no), reemplazar como socio y verificar como admin.
5. **Carga de la asociación**: «Cargar documentación recibida» con dos imágenes. Con un DNI equivocado no carga nada.
6. **Importación** (`/admin/reprocann/importar`): un archivo por caso para ver «Confirmado», «Ya existe», «Duplicado» (también el mismo archivo con dos DNI) y «A revisar» (con el motivo).
7. **Recordatorio de cuota** (Padrón → Recordatorio de cuota): configurar, ver la vista previa y comprobar que no se puede activar.
8. **Categorías**: en la ficha de un socio, «Membresía» → «Editar».
9. **Demostraciones locales**: `/qr/trazabilidad/demo` y el botón de WhatsApp en vista previa.
