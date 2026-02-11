CREATE TABLE "auth_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auth_otp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"email" text NOT NULL,
	"code_hash" text,
	"token" text,
	"purpose" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"ip" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "auth_totp" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"secret_enc" text NOT NULL,
	"backup_codes_hash" text DEFAULT '[]' NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_otp" ADD CONSTRAINT "auth_otp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_totp" ADD CONSTRAINT "auth_totp_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_auth_events_user_id" ON "auth_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_auth_events_created_at" ON "auth_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_auth_events_type" ON "auth_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_auth_otp_email" ON "auth_otp" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_auth_otp_expires_at" ON "auth_otp" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_auth_totp_user_id" ON "auth_totp" USING btree ("user_id");