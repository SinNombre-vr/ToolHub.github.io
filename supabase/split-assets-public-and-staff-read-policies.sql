-- ToolHub: separar lectura pública de assets de la lectura administrativa.
--
-- Motivo:
-- La política anterior combinaba `is_hidden = false OR toolhub_has_role(...)` para
-- anon y authenticated. Como `toolhub_has_role()` no es ejecutable por `anon`,
-- Postgres rechazaba toda la consulta pública con "permission denied for function
-- toolhub_has_role". Eso rompía Biblioteca y "Recién subido".
--
-- Seguridad:
-- - anon/authenticated pueden leer únicamente assets no ocultos.
-- - authenticated con rol Owner/Admin/Moderator puede además leer assets ocultos.
-- - no se concede EXECUTE de toolhub_has_role a anon.

drop policy if exists assets_public_read on public.assets;
drop policy if exists assets_staff_read_hidden on public.assets;

create policy assets_public_read
on public.assets
for select
to anon, authenticated
using (is_hidden = false);

create policy assets_staff_read_hidden
on public.assets
for select
to authenticated
using (public.toolhub_has_role(array['owner','admin','moderator']::text[]));
