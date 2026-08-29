# ToolHub · Auth 2.0 · Auditoría inicial

Estado: FASE 2.1 preparada en `feature/auth-2-0`. Producción no modificada por esta rama.

## Inventario actual

- Supabase Auth: 8 usuarios existentes.
- Usuarios con email confirmado en Supabase Auth: 6.
- Identidades existentes: 8, todas del proveedor `email`.
- `toolhub_profiles`: 8 perfiles, enlazados por `user_id` a `auth.users.id`.
- Todas las tablas privadas principales usan RLS.
- La sesión comunitaria usa `toolhub-community-auth-v2`; Auth 2.0 conserva esa misma clave para no romper sesiones por un cambio de frontend.

## Hallazgos

1. La autenticación estaba dividida entre `profiles/profile.js` y `profiles/profile-auth-bootstrap.js`. Ambos registraban manejadores de login/registro. Auth 2.0 centraliza la autoridad del flujo en `profile-auth-bootstrap.js` sin alterar todavía el dashboard del perfil.
2. ToolHub mantiene un segundo estado de verificación en `toolhub_profiles.email_verified_at`, además del estado real de Supabase Auth. Esto necesita sincronización para OAuth social.
3. Las políticas RLS de favoritos, colecciones, contribuciones, creaciones y publicación de assets dependen de `toolhub_is_email_verified()`.
4. El trigger `on_auth_user_created_toolhub_profile` ya crea un perfil para cualquier identidad nueva. Auth 2.0 mantendrá el mismo UUID de Supabase como clave del perfil.
5. Los advisors de seguridad detectan RPCs `SECURITY DEFINER` expuestas a `anon`. Varias son funciones internas de trigger o administración y deben perder permisos públicos. Los RPCs anónimos del contador de likes son intencionales y se revisarán por separado.
6. Supabase indica que la protección contra contraseñas filtradas está desactivada. Se tratará en la fase de hardening.

## Base Auth 2.0 implementada en la rama

- Login por email + contraseña.
- Registro conservando metadata de usuario/nombre visible.
- OTP de verificación sin doble envío automático.
- Reenvío de OTP con cooldown.
- Recuperación de contraseña.
- Formulario de nueva contraseña.
- Mostrar/ocultar contraseña.
- UI preparada para Discord y Google.
- Detección automática de si Discord/Google están habilitados en Supabase; no requiere hardcodear secretos en el frontend.
- OAuth redirige a la URL pública actual de ToolHub.
- Compatibilidad con el storage key actual.
- `toolhub-auth-2-foundation.sql` preparado pero NO aplicado todavía.

## Migración SQL preparada

`supabase/toolhub-auth-2-foundation.sql` hará, cuando se autorice:

- usar `auth.users.email_confirmed_at` como fuente real de verificación;
- sincronizar `email_verified_*` por compatibilidad;
- soportar perfiles creados por proveedores sociales;
- conservar todos los UUID y datos actuales;
- restringir RPCs administrativas a `authenticated`;
- retirar ejecución RPC pública de funciones que solo deben ejecutarse como triggers.

## Pasos externos pendientes

No se necesitan todavía secretos en el repositorio. Los siguientes hitos que requieren intervención del propietario serán:

1. Discord Developer Portal: crear/configurar OAuth de ToolHub.
2. Google Cloud: crear/configurar OAuth Web de ToolHub.
3. Resend: configurar SMTP/remitente para Supabase Auth.
4. Cloudflare Turnstile: crear el widget y guardar sus claves en la configuración segura correspondiente.

Nunca guardar Client Secrets, claves SMTP o secret keys en GitHub ni en JavaScript público.