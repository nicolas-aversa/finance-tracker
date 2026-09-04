-- Cierra la API REST de Supabase sobre estas tablas.
--
-- Supabase expone todo el schema `public` por PostgREST en
-- https://<proyecto>.supabase.co/rest/v1/, y por sus DEFAULT PRIVILEGES cada
-- tabla que creaba Drizzle nacía con SELECT/INSERT/UPDATE/DELETE para los roles
-- `anon` y `authenticated`. Con RLS apagado eso significa que cualquiera con la
-- clave `anon` —que Supabase considera pública, no secreta— podía leer `users`
-- entero (emails y hashes) y los datos de todos, sin pasar por la app.
--
-- El filtro por user_id de src/lib/db es el límite de privacidad DENTRO de la
-- app. Esta puerta lo esquivaba por completo.
--
-- Dos capas, en este orden:
--
-- 1. REVOKE: la defensa real. Sin privilegios, PostgREST no tiene nada que
--    ofrecerle a esos roles.
-- 2. ENABLE ROW LEVEL SECURITY sin ninguna política: nadie ve ninguna fila.
--    Es defensa en profundidad por si algún GRANT vuelve a aparecer.
--
-- La app no se entera: se conecta como `postgres`, que es dueño de las 12
-- tablas, y en Postgres el dueño saltea RLS (no se usa FORCE ROW LEVEL
-- SECURITY). Cero cambios de código, cero queries afectadas.

REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";--> statement-breakpoint

-- Lo de arriba arregla lo que ya existe; esto evita que la próxima tabla que
-- cree Drizzle nazca expuesta otra vez, que es exactamente cómo llegamos acá.
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated";--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";--> statement-breakpoint

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expense_imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "category_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "expense_budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "monthly_income" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "price_overrides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "live_price_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ccl_rate_history" ENABLE ROW LEVEL SECURITY;
