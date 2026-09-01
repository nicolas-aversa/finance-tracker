CREATE TABLE "category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"category" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"name" text PRIMARY KEY NOT NULL,
	"emoji" text DEFAULT '🏷️' NOT NULL,
	"sort" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"statement_period" date NOT NULL,
	"file_name" text,
	"statement_total_ars" numeric(16, 2),
	"statement_total_usd" numeric(16, 2),
	"due_date" date,
	"min_payment_ars" numeric(16, 2),
	"raw_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_imports_source_period_uq" UNIQUE("source","statement_period")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid,
	"source" text NOT NULL,
	"tx_date" date NOT NULL,
	"description" text NOT NULL,
	"merchant" text NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"currency" text NOT NULL,
	"category" text NOT NULL,
	"installment_current" integer,
	"installment_total" integer,
	"kind" text DEFAULT 'purchase' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_import_id_expense_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."expense_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_rules_priority_idx" ON "category_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "expenses_tx_date_idx" ON "expenses" USING btree ("tx_date");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_source_idx" ON "expenses" USING btree ("source");--> statement-breakpoint
CREATE INDEX "expenses_import_idx" ON "expenses" USING btree ("import_id");