CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"published" boolean DEFAULT false,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"subscribed" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "journey_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" text NOT NULL,
	"module" text NOT NULL,
	"step_data" text DEFAULT '{}' NOT NULL,
	"completed_steps" text DEFAULT '[]' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "journey_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"session_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium',
	"due_date" timestamp,
	"assigned_to" text DEFAULT 'You',
	"source_module" text,
	"source_step" integer,
	"tags" text DEFAULT '[]',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "journey_sessions" ADD CONSTRAINT "journey_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_blog_posts_published_published_at" ON "blog_posts" USING btree ("published","published_at");--> statement-breakpoint
CREATE INDEX "idx_email_subscribers_created_at" ON "email_subscribers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_journey_sessions_user_id" ON "journey_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_journey_sessions_updated_at" ON "journey_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_session_id" ON "tasks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_user_id" ON "tasks" USING btree ("user_id");