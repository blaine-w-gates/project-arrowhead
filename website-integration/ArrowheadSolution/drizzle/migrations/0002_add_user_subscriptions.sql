CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"status" text DEFAULT 'none' NOT NULL,
	"plan_name" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "user_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_user_id" ON "user_subscriptions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_stripe_customer_id" ON "user_subscriptions" USING btree ("stripe_customer_id");
--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_stripe_subscription_id" ON "user_subscriptions" USING btree ("stripe_subscription_id");
--> statement-breakpoint
CREATE INDEX "idx_user_subscriptions_status" ON "user_subscriptions" USING btree ("status");
