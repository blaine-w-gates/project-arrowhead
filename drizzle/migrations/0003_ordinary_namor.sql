ALTER TABLE "teams" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "current_period_end" timestamp with time zone;