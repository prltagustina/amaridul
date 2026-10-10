# Amarí Dul — Fase 0: base técnica

Estado: implementada en la rama local `fase-0`. Todo local, con PGlite y datos ficticios.
Sin infraestructura externa (Neon, R2, Resend, Upstash, Turnstile) y sin datos reales.

## Puesta en marcha local

```bash
cp .env.example .env.local
npm run keys:generate        # pegar la salida en .env.local (claves solo para local)
npm run seed:fixtures        # admin.local@example.com + dos socios ficticios (DNI 99.000.00N)
npm run dev                  # /admin pide activar el TOTP en el primer ingreso
npm test
```

Datos ficticios: emails `@example.com`, nombres "Persona Ficticia NN", DNIs `99.000.0NN`.
Ningún número de DNI está garantizado como inexistente: estos datos solo viven en `.data/` local.

## Autenticación (Better Auth 1.7.7, versión fijada)

- Socios: DNI + contraseña por `POST /api/auth/sign-in/dni` (plugin propio). Sin interfaz hasta la Fase 2.
- Admin: email + contraseña + TOTP obligatorio, con códigos de respaldo de un solo uso.
- Contraseñas: Argon2id (m=19 MiB, t=2, p=1), mínimo 10 caracteres.
- Sesiones en la base, `cookieCache` desactivado: la revocación es inmediata.
- `databaseHooks.session.create.before` bloquea cualquier sesión de usuarios no activos.
- Bloqueo por cuenta en el login por DNI: 5 fallos consecutivos → 15 minutos.
- Rate limiting por IP de Better Auth (memoria en local).

### APIs de Better Auth poco documentadas en uso

Encapsuladas en `src/server/auth/dni-sign-in.ts` y cubiertas por `tests/auth-dni.test.ts`:

- `ctx.context.internalAdapter.findAccounts / createSession / findUserById` (tipadas en `@better-auth/core`).
- `ctx.context.password.verify`.
- `setSessionCookie` de `better-auth/cookies` (exportada, no documentada en la guía de plugins).

Antes de actualizar Better Auth: leer el changelog y correr `npm test`.

### Comportamientos de Better Auth a tener en cuenta

1. **Renovación de sesión global.** `updateAge` no distingue roles: la primera consulta extiende la
   sesión del admin a 30 días en la base. Por eso `requireAdmin()` aplica en el servidor el tope
   absoluto de 8 h desde `createdAt` y los 30 min de inactividad, y borra la sesión vencida.
2. **Vencimiento del reseteo único.** `resetPasswordTokenExpiresIn` es uno solo (30 min). La activación
   de socios (72 h, Fase 2) usa `one_time_tokens` propios y fija la contraseña con
   `internalAdapter.updatePassword`, no el flujo de reseteo.
3. **Sin bloqueo por cuenta nativo.** El admin queda protegido por rate limiting por IP, TOTP
   obligatorio y el bloqueo propio del plugin 2FA.
4. **Email obligatorio y único por usuario** (ver pendientes de Fase 1).

## DNI

- Nunca en las tablas de Better Auth ni en la auditoría.
- `person_identities.dni_lookup` = HMAC-SHA256 (`LOOKUP_KEYS`), con versión de clave.
- `person_identities.dni_encrypted` = AES-256-GCM (`FIELD_KEYS`), con AAD `person_identities.dni:<person_id>`.
- Rotación: agregar `v2`, activar `v2`. El login migra la búsqueda vieja a la nueva y
  `reencryptIfStale` vuelve a cifrar los valores.
- Las claves son distintas por entorno y nunca se reutilizan entre local, preview y producción.

## Seguridad web

- CSP estático, sin nonces: los nonces obligarían a renderizar dinámicamente la home y `/qr`.
- `/admin` y `/api`: `X-Robots-Tag: noindex`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- `robots.txt` bloquea `/admin`, `/api/` y `/admision`.
- `src/proxy.ts` solo redirige por cookie. La autorización real está en `requireAdmin()`.

## Reglas documentadas para la Fase 1

### Sesiones de admisión (una por preadmisión)

- Como máximo **una sesión de admisión activa por preadmisión**.
- Si la persona vuelve a abrir su invitación (otro navegador o dispositivo):
  1. se valida de nuevo el token vigente;
  2. se revoca la sesión de admisión anterior;
  3. se crea una nueva;
  4. se abre **el mismo borrador**.
- El borrador es único por preadmisión.
- El token de invitación se consume recién al enviar la solicitud. Al enviarla se revocan todas las sesiones de admisión.

### Acreditación de identidad

`identity_verifications` existe solo como estructura (método, estado, quién, cuándo, notas).
No hay flujo, ni documentos, ni videollamada, ni personas reales verificadas. El método se decide antes de la Fase 1.

### Conservación

Las tablas con datos personales usan `retentionColumns`:

- `closed_at`, `retention_until`;
- `retention_hold`, con su motivo;
- `anonymized_at`.

No hay borrado automático: la Fase 1 agrega la vista "Vencidos para depurar" y la anonimización manual auditada.

## Pendientes para la Fase 1

- Confirmar con Lu que **cada socio tendrá un email propio y único**. No usar emails sintéticos ni duplicados.
- Método de acreditación de identidad. *(requiere validación jurídica/institucional)*
- Mecanismo de aceptación o firma de la solicitud formal. *(requiere validación jurídica)*
- Formato del número de socio y referencia de actas (sin numeración paralela).
- Valor y medio de pago de la cuota, y si varía por categoría.
- Conservación de solicitudes rechazadas, socios dados de baja y auditoría. *(requiere validación jurídica)*
- Proveedor de producción (Neon) y validación del alojamiento. *(requiere validación jurídica)*
- Remitente de emails (`notificaciones@amaridul.com`, Reply-To `amaridulsf@gmail.com`) y DNS.
- Custodia de los códigos de respaldo y responsable del acceso de emergencia en producción.
- Texto aprobado del aviso de privacidad, para cargarlo como versión en `legal_texts`.
- La cuenta productiva de Lu se crea recién al preparar producción, con enrolamiento guiado del TOTP.
