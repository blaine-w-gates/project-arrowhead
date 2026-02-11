CREATE TABLE "rrgt_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"team_member_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"max_column_index" integer DEFAULT 6 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rrgt_rabbits" (
	"plan_id" uuid NOT NULL,
	"current_column_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rrgt_rabbits_plan_id_pk" PRIMARY KEY("plan_id")
);
--> statement-breakpoint
CREATE TABLE "rrgt_subtasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"column_index" integer NOT NULL,
	"text" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rrgt_plans" ADD CONSTRAINT "rrgt_plans_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rrgt_plans" ADD CONSTRAINT "rrgt_plans_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rrgt_plans" ADD CONSTRAINT "rrgt_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rrgt_plans" ADD CONSTRAINT "rrgt_plans_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rrgt_rabbits" ADD CONSTRAINT "rrgt_rabbits_plan_id_rrgt_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."rrgt_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rrgt_subtasks" ADD CONSTRAINT "rrgt_subtasks_plan_id_rrgt_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."rrgt_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rrgt_plans_task_id" ON "rrgt_plans" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_rrgt_plans_team_member_id" ON "rrgt_plans" USING btree ("team_member_id");--> statement-breakpoint
CREATE INDEX "idx_rrgt_plans_project_id" ON "rrgt_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_rrgt_plans_objective_id" ON "rrgt_plans" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_rrgt_rabbits_plan_id" ON "rrgt_rabbits" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_rrgt_subtasks_plan_id" ON "rrgt_subtasks" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_rrgt_subtasks_column_index" ON "rrgt_subtasks" USING btree ("column_index");