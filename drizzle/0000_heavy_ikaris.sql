CREATE TABLE "ccl_rate_history" (
	"rate_date" date PRIMARY KEY NOT NULL,
	"rate" numeric(12, 4) NOT NULL,
	"source" text DEFAULT 'argentinadatos' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_price_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_overrides" (
	"ticker" text PRIMARY KEY NOT NULL,
	"manual_ars_price" numeric(14, 4),
	"manual_usd_price" numeric(14, 4),
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" text NOT NULL,
	"type" text NOT NULL,
	"trade_date" date NOT NULL,
	"ccl_rate" numeric(12, 4) NOT NULL,
	"ars_price" numeric(14, 4) NOT NULL,
	"qty" numeric(14, 6) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "transactions_ticker_idx" ON "transactions" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "transactions_trade_date_idx" ON "transactions" USING btree ("trade_date");