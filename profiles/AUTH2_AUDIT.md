# ToolHub · Auth 2.0 · Auditoría

Estado: FASE 2.6 validada en `feature/auth-2-0`. La rama sigue separada de `main`; la producción pública no usa todavía este frontend.

## Inventario de partida

- Supabase Auth: 8 usuarios existentes al iniciar la fase.
- Usuarios con email confirmado al iniciar la fase: 6.
- Identidades iniciales: 8, todas del proveedor `email`.
- `toolhub_profiles`: 8 perfiles enlazados por `user_id` a `auth.users.id`.
- Las tablas privadas principales usan RLS.
- Auth 2.0 conserva `toolhub-community-auth-v2` como storage key para mantener compatibilidad de sesión.

## Hallazgos

1. La autenticación estaba repartida entre `profiles/profile.js` y `profiles/profile-auth-bootstrap.js`; Auth 2.0 centraliza el flujo en el bootstrap sin reescribir el dashboard.
2. ToolHub tenía un segundo estado de verificación en `toolhub_profiles.email_verified_at`; para OAuth social debe sincronizarse con Supabase Auth.
3. Las políticas RLS de favoritos, colecciones, contribuciones, creaciones y publicación de assets dependen de `toolhub_is_email_verified()`.
4. `on_auth_user_created_toolhub_profile` crea perfiles para identidades nuevas y mantiene el UUID de Supabase como clave de ToolHub.
5. La auditoría detectó RPCs `SECURITY DEFINER` que no debían ser ejecutables por `anon`; la foundation retira esos permisos de las funciones administrativas/internas.
6. La protección contra contraseñas filtradas sigue pendiente para la fase de hardening.

## FASE 2.2 · Base Auth 2.0 · VALIDADA

- Login email + contraseña: validado en Cloudflare Preview con cuenta existente.
- Logout y nuevo login: validados.
- Registro + OTP sin doble envío automático.
- Reenvío OTP con cooldown.
- Recuperación y cambio de contraseña preparados.
- Mostrar/ocultar contraseña.
- UI de Discord y Google.
- Detección automática de proveedores sociales habilitados en Supabase.
- OAuth retorna a `profile.html` del origen actual, por lo que funciona con producción y Preview autorizada.
- Cloudflare Preview estable: rama `feature/auth-2-0`.

## Foundation de Supabase

La migración `toolhub_auth_2_foundation` fue aplicada a Supabase el 2026-08-29 después de validar el login existente.

La foundation:

- usa `auth.users.email_confirmed_at` como fuente de verdad para verificación;
- sincroniza `toolhub_profiles.email_verified_*` por compatibilidad;
- admite usuarios verificados por proveedores sociales;
- conserva UUID, perfiles, favoritos, colecciones, reputación y contribuciones;
- mejora la creación inicial de perfil usando nombre/avatar de OAuth cuando existan;
- restringe RPCs administrativas a usuarios autenticados;
- retira ejecución RPC pública de funciones destinadas solo a triggers.

## FASE 2.3 · Discord OAuth · VALIDADA

- Aplicación Discord `ToolHub` creada.
- Callback de Supabase configurado en Discord.
- Proveedor Discord habilitado en Supabase.
- Login OAuth probado end-to-end en Cloudflare Preview.
- Perfil cargado correctamente después del callback.
- Logout corregido para conservar el origen actual; Preview permanece en Preview.

## FASE 2.4 · Google OAuth · VALIDADA

- Proyecto Google Cloud `ToolHub` creado.
- Cliente OAuth Web configurado.
- Orígenes autorizados: producción Workers y Preview Auth 2.0.
- Redirect URI autorizado: callback de Supabase.
- Proveedor Google habilitado en Supabase.
- Login Google probado end-to-end en Cloudflare Preview.
- Perfil y logout validados.

## FASE 2.5 · SMTP externo · POSPUESTA

- Integración SMTP externa aplazada por decisión de proyecto.
- Supabase continúa usando temporalmente su servicio integrado de correo y sus límites correspondientes.
- Retomar cuando ToolHub tenga dominio propio o cuando sea necesaria mayor capacidad/entregabilidad.

## FASE 2.6 · Cloudflare Turnstile · VALIDADA

- Widget `ToolHub Auth` creado en Cloudflare Turnstile.
- Modo gestionado por Cloudflare.
- Hostnames autorizados:
  - `toolhub.toolhubvrc-official.workers.dev`
  - `feature-auth-2-0-toolhub.toolhubvrc-official.workers.dev`
- Site Key pública integrada en frontend.
- Secret Key mantenida fuera del repositorio y configurada directamente en Supabase.
- Supabase `Attack Protection` configurado con `Turnstile by Cloudflare`.
- Frontend protegido para login por email, registro, recuperación, reenvío y OTP.
- La primera prueba detectó correctamente `110200` por hostname; la configuración se corrigió en Cloudflare.
- Login email + contraseña con Turnstile validado end-to-end en Preview.
- La interacción normalmente permanece invisible y solo aparece cuando Cloudflare la considera necesaria.

### Nota de despliegue

La protección CAPTCHA está habilitada a nivel del proyecto Supabase, por lo que afecta a los endpoints protegidos independientemente del frontend que los invoque. Hasta que `feature/auth-2-0` llegue a `main`, la web pública puede no disponer todavía del token Turnstile para los flujos de email. No dar por terminada la migración a producción hasta resolver esta diferencia entre Preview y `main`.

## Próximos pasos

1. FASE 2.7 — MFA + hardening administrativo.
2. FASE 2.8 — auditoría RLS completa.
3. FASE 2.9 — pruebas integrales Auth 2.0.
4. FASE 2.10 — despliegue definitivo a `main`.
5. FASE 2.5 — SMTP externo permanece pendiente para una fase futura.

Nunca guardar Client Secrets, claves SMTP, Secret Key de Turnstile, service role ni otras claves privadas en GitHub o JavaScript público.
