CREATE TABLE "login_attempts" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone
);
