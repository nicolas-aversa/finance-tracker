CREATE TABLE "expense_budgets" (
	"category" text PRIMARY KEY NOT NULL,
	"amount_ars" numeric(16, 2) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
