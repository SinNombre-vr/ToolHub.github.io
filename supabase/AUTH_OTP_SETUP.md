# ToolHub · configuración de Email OTP en Supabase

El frontend de ToolHub ya usa `signInWithOtp(...)` y verifica el código con `verifyOtp(..., type: "email")`.

## 1. Authentication > Email Templates > Magic Link

Para que Supabase envíe un código de 6 dígitos y no un enlace, la plantilla **Magic Link** debe usar `{{ .Token }}` y no debe contener `{{ .ConfirmationURL }}`.

Asunto recomendado:

`{{ .Token }} es tu código de verificación de ToolHub`

Contenido:

Copiar el archivo `supabase/toolhub-email-otp-template.html`.

## 2. Authentication > URL Configuration

Como medida de seguridad/fallback, añadir también esta Redirect URL permitida:

`https://sinnombre-vr.github.io/profile.html`

Cuando la plantilla sea OTP-only, el usuario no necesita salir de ToolHub ni abrir ningún enlace: recibe el código y lo introduce directamente en `profile.html`.
