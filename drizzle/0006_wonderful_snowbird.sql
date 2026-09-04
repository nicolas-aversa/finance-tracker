-- Single-user app becomes multi-user.
--
-- Hand-written: drizzle-kit's generated version added `user_id ... NOT NULL`
-- with no default and no backfill (which fails outright on tables that already
-- hold rows), left the old primary-key drops commented out with placeholders,
-- and added the new composite keys *before* creating the columns they use.
-- The order below is the one that actually works: create, backfill, constrain.

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint

-- The account that inherits everything already in the database. It ships with
-- a hash that can never verify, so nobody can sign in as it until the real
-- address and password are set (scripts/set-password.ts) — that keeps real
-- credentials out of a committed migration.
INSERT INTO "users" ("id", "email", "password_hash")
VALUES ('00000000-0000-0000-0000-000000000001', 'owner@cedear.local', 'disabled');
--> statement-breakpoint

-- Nullable first, so existing rows survive the ALTER.
ALTER TABLE "transactions" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "expense_imports" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "category_rules" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "expense_budgets" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "monthly_income" ADD COLUMN "user_id" uuid;--> statement-breakpoint

-- Everything that exists today belongs to the owner.
UPDATE "transactions" SET "user_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "expenses" SET "user_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "expense_imports" SET "user_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "expense_categories" SET "user_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "category_rules" SET "user_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "expense_budgets" SET "user_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "monthly_income" SET "user_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint

ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_imports" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_categories" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "category_rules" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_budgets" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_income" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_imports" ADD CONSTRAINT "expense_imports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monthly_income" ADD CONSTRAINT "monthly_income_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Keys that used to assume a single owner. Drop the old one before adding the
-- composite, or the ALTER fails on the existing primary key.
ALTER TABLE "expense_categories" DROP CONSTRAINT "expense_categories_pkey";--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_user_id_name_pk" PRIMARY KEY("user_id","name");--> statement-breakpoint
ALTER TABLE "expense_budgets" DROP CONSTRAINT "expense_budgets_pkey";--> statement-breakpoint
ALTER TABLE "expense_budgets" ADD CONSTRAINT "expense_budgets_user_id_category_pk" PRIMARY KEY("user_id","category");--> statement-breakpoint
ALTER TABLE "monthly_income" DROP CONSTRAINT "monthly_income_pkey";--> statement-breakpoint
ALTER TABLE "monthly_income" ADD CONSTRAINT "monthly_income_user_id_month_pk" PRIMARY KEY("user_id","month");--> statement-breakpoint

-- Re-uploading a statement replaces the previous one *for that user*, not for
-- whoever uploaded the same period first.
ALTER TABLE "expense_imports" DROP CONSTRAINT "expense_imports_source_period_uq";--> statement-breakpoint
ALTER TABLE "expense_imports" ADD CONSTRAINT "expense_imports_source_period_uq" UNIQUE("user_id","source","statement_period");--> statement-breakpoint

-- Failed-login counters move from one global row to one per email. The old
-- singleton is meaningless under the new key, so it goes.
DELETE FROM "login_attempts";--> statement-breakpoint
ALTER TABLE "login_attempts" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint

CREATE INDEX "transactions_user_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expenses_user_idx" ON "expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "category_rules_user_idx" ON "category_rules" USING btree ("user_id");
