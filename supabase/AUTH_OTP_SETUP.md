# ToolHub · configuración de Email OTP en Supabase

ToolHub usa email + contraseña y confirma la propiedad del correo mediante un código OTP de 6 dígitos.

## Flujo correcto

1. `signUp(...)` crea la cuenta y Supabase envía automáticamente el primer correo de confirmación.
2. ToolHub muestra inmediatamente la pantalla para introducir el código.
3. El usuario introduce el código y ToolHub ejecuta `verifyOtp({ email, token, type: "email" })`.
4. Solo después de verificar el correo se habilitan las funciones privadas del perfil.

ToolHub **no debe solicitar un segundo email inmediatamente después de `signUp`**, porque Supabase aplica un intervalo de seguridad entre envíos y responderá con HTTP 429.

## Authentication > Emails > Templates > Confirm sign up

Esta es la plantilla importante para el primer correo del registro. Debe usar `{{ .Token }}` y no `{{ .ConfirmationURL }}`.

Asunto recomendado:

`{{ .Token }} es tu código de verificación de ToolHub`

Contenido:

Copiar `supabase/toolhub-email-otp-template.html`.

## Authentication > Emails > Templates > Magic link or OTP

Se recomienda dejar esta plantilla también en modo OTP para cualquier flujo posterior que solicite un código por email.

Asunto recomendado:

`{{ .Token }} es tu código de verificación de ToolHub`

Contenido:

Copiar igualmente `supabase/toolhub-email-otp-template.html`.

## Reenvío

Para una cuenta creada pero todavía sin confirmar, el reenvío correcto es `auth.resend({ type: "signup", email })`. ToolHub bloquea el botón durante 60 segundos para respetar el límite de seguridad de Supabase.

Cuando ambas plantillas sean OTP-only, el usuario no necesita salir de ToolHub ni abrir enlaces: recibe seis números, los introduce en `profile.html` y termina la verificación.
