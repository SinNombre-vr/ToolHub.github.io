# ToolHub · Auth 2.0 · Auditoría

Estado: FASE 2.2 validada en `feature/auth-2-0`. La rama sigue separada de `main`; la producción pública no usa todavía este frontend.

## Inventario de partida

- Supabase Auth: 8 usuarios existentes.
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

## Base Auth 2.0 validada

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

## OAuth social

- Discord: aplicación creada y credenciales configuradas en Supabase por el propietario. Pendiente prueba end-to-end en Preview.
- Google: pendiente.

## Próximos pasos externos

1. Validar `Continuar con Discord` end-to-end.
2. Google Cloud: configurar OAuth Web de ToolHub.
3. Resend: configurar SMTP/remitente para Supabase Auth.
4. Cloudflare Turnstile: configurar widget/secret de servidor.
5. MFA y hardening administrativo.

Nunca guardar Client Secrets, claves SMTP o secret keys en GitHub ni en JavaScript público.